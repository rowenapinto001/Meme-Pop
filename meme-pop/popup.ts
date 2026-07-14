const enabledInput = document.querySelector<HTMLInputElement>("#enabledInput");
const themeSelect = document.querySelector<HTMLSelectElement>("#themeSelect");
const appearanceMinutesInput = document.querySelector<HTMLInputElement>("#appearanceMinutesInput");
const breakMinutesInput = document.querySelector<HTMLInputElement>("#breakMinutesInput");
const targetSitesInput = document.querySelector<HTMLTextAreaElement>("#targetSitesInput");
const soundInput = document.querySelector<HTMLInputElement>("#soundInput");
const dndInput = document.querySelector<HTMLInputElement>("#dndInput");
const coinCount = document.querySelector<HTMLElement>("#coinCount");
const streakCount = document.querySelector<HTMLElement>("#streakCount");
const longestStreak = document.querySelector<HTMLElement>("#longestStreak");
const lastActive = document.querySelector<HTMLElement>("#lastActive");
const accessoryList = document.querySelector<HTMLElement>("#accessoryList");
const accessoryStatus = document.querySelector<HTMLElement>("#accessoryStatus");
const focusStatus = document.querySelector<HTMLElement>("#focusStatus");
const focusDuration = document.querySelector<HTMLSelectElement>("#focusDuration");
const focusButton = document.querySelector<HTMLButtonElement>("#focusButton");
const deadlineTitleInput = document.querySelector<HTMLInputElement>("#deadlineTitleInput");
const deadlineDueInput = document.querySelector<HTMLInputElement>("#deadlineDueInput");
const deadlineSubjectInput = document.querySelector<HTMLInputElement>("#deadlineSubjectInput");
const deadlinePrioritySelect = document.querySelector<HTMLSelectElement>("#deadlinePrioritySelect");
const deadlineTasksInput = document.querySelector<HTMLTextAreaElement>("#deadlineTasksInput");
const deadlineReminderSelect = document.querySelector<HTMLSelectElement>("#deadlineReminderSelect");
const deadlineCustomReminderInput = document.querySelector<HTMLInputElement>("#deadlineCustomReminderInput");
const addDeadlineButton = document.querySelector<HTMLButtonElement>("#addDeadlineButton");
const deadlineList = document.querySelector<HTMLElement>("#deadlineList");
const overdueDeadlineList = document.querySelector<HTMLElement>("#overdueDeadlineList");
const showNowButton = document.querySelector<HTMLButtonElement>("#showNowButton");
const momentButton = document.querySelector<HTMLButtonElement>("#momentButton");
const settingsButton = document.querySelector<HTMLButtonElement>("#settingsButton");
const startScreen = document.querySelector<HTMLElement>("#startScreen");
const readyButton = document.querySelector<HTMLButtonElement>("#readyButton");
const planDayButton = document.querySelector<HTMLButtonElement>("#planDayButton");
const statusText = document.querySelector<HTMLElement>("#statusText");

let state: MemePop.AppState = MemePop.normalizeState(undefined);
let statusTimer: number | undefined;
let focusTickTimer: number | undefined;

function setStatus(message: string): void {
  if (!statusText) {
    return;
  }

  window.clearTimeout(statusTimer);
  statusText.textContent = message;
  statusTimer = window.setTimeout(() => {
    statusText.textContent = "";
  }, 3200);
}

function playUiTone(): void {
  if (!state.settings.soundEnabled) {
    return;
  }

  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(620, now);
    oscillator.frequency.exponentialRampToValueAtTime(820, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
    oscillator.addEventListener("ended", () => {
      void context.close();
    });
  } catch {
    // Sound is optional.
  }
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderFocus(): void {
  const active = state.focus.active && state.focus.endsAt > Date.now();

  if (focusButton) {
    focusButton.textContent = active ? "Cancel" : "Start";
  }

  if (focusStatus) {
    focusStatus.textContent = active
      ? `Quiet zone ends in ${formatRemaining(state.focus.endsAt - Date.now())}.`
      : "No focus session running.";
  }

  window.clearTimeout(focusTickTimer);

  if (active) {
    focusTickTimer = window.setTimeout(renderFocus, 1000);
  }
}

function formatDueTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function formatDeadlineRemaining(timestamp: number): string {
  const diff = timestamp - Date.now();
  const absoluteMs = Math.abs(diff);
  const totalHours = Math.floor(absoluteMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.max(0, Math.floor((absoluteMs % 3600000) / 60000));
  const label = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return diff < 0 ? `${label} overdue` : `${label} remaining`;
}

function parseTaskLines(value: string): MemePop.DeadlineTask[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((text) => ({
      id: MemePop.createId("task"),
      text,
      done: false
    }));
}

function deadlineProgress(deadline: MemePop.DeadlineItem): string {
  const completed = deadline.tasks.filter((task) => task.done).length;
  const total = deadline.tasks.length;
  return total > 0 ? `Progress: ${completed} of ${total} tasks completed` : "Progress: no checklist yet";
}

function renderDeadlineList(container: HTMLElement | null, deadlines: MemePop.DeadlineItem[], emptyMessage: string, heading?: string): void {
  if (!container) {
    return;
  }

  container.textContent = "";

  if (heading && deadlines.length > 0) {
    const title = document.createElement("strong");
    title.className = "deadline-list-title";
    title.textContent = heading;
    container.append(title);
  }

  if (deadlines.length === 0) {
    const empty = document.createElement("p");
    empty.className = "deadline-empty";
    empty.textContent = emptyMessage;
    container.append(empty);
    return;
  }

  for (const deadline of deadlines) {
    container.append(createDeadlineCard(deadline));
  }
}

function createDeadlineCard(deadline: MemePop.DeadlineItem): HTMLElement {
  const card = document.createElement("article");
  const overdue = deadline.dueAt < Date.now();
  card.className = `deadline-card${overdue ? " is-overdue" : ""}`;

  const header = document.createElement("header");
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = deadline.title;
  const subject = document.createElement("p");
  subject.textContent = deadline.subject || "No subject";
  titleGroup.append(title, subject);

  const priority = document.createElement("span");
  priority.className = `deadline-priority ${deadline.priority}`;
  priority.textContent = deadline.priority;
  header.append(titleGroup, priority);

  const meta = document.createElement("small");
  meta.textContent = `Due: ${formatDueTime(deadline.dueAt)} · ${formatDeadlineRemaining(deadline.dueAt)}`;

  const progress = document.createElement("small");
  progress.textContent = deadlineProgress(deadline);

  const tasks = document.createElement("div");
  tasks.className = "deadline-tasks";
  for (const task of deadline.tasks) {
    const label = document.createElement("label");
    label.className = "deadline-task";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => toggleDeadlineTask(deadline.id, task.id, checkbox.checked));
    label.append(checkbox, document.createTextNode(task.text));
    tasks.append(label);
  }

  const actions = document.createElement("div");
  actions.className = "deadline-actions";
  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.textContent = "Continue";
  continueButton.addEventListener("click", () => continueDeadline(deadline));
  const focusButton = document.createElement("button");
  focusButton.type = "button";
  focusButton.textContent = "Start Focus";
  focusButton.addEventListener("click", () => startDeadlineFocus(deadline));
  const completeButton = document.createElement("button");
  completeButton.type = "button";
  completeButton.textContent = "Complete";
  completeButton.addEventListener("click", () => completeDeadline(deadline.id));
  actions.append(continueButton, focusButton, completeButton);

  card.append(header, meta, progress);

  if (deadline.tasks.length > 0) {
    card.append(tasks);
  }

  card.append(actions);
  return card;
}

function renderDeadlines(): void {
  const activeDeadlines = state.deadlines
    .filter((deadline) => !deadline.completed && deadline.dueAt >= Date.now())
    .sort((first, second) => first.dueAt - second.dueAt);
  const overdueDeadlines = state.deadlines
    .filter((deadline) => !deadline.completed && deadline.dueAt < Date.now())
    .sort((first, second) => first.dueAt - second.dueAt);

  renderDeadlineList(deadlineList, activeDeadlines, "No active deadlines yet.");
  renderDeadlineList(overdueDeadlineList, overdueDeadlines, "No overdue deadlines.", "Overdue");
}

function accessoryPreviewLabel(accessory: MemePop.Accessory): string {
  if (accessory.id === "partyHat") {
    return "";
  }

  if (accessory.id === "sunglasses") {
    return "";
  }

  if (accessory.id === "crown") {
    return "";
  }

  return "";
}

function renderAccessories(): void {
  if (!accessoryList) {
    return;
  }

  accessoryList.textContent = "";

  for (const accessory of MemePop.ACCESSORIES) {
    const unlocked = state.unlockedAccessories.includes(accessory.id);
    const selected = state.settings.accessory === accessory.id;
    const card = document.createElement("article");
    card.className = `accessory-card accessory-${accessory.id}`;
    card.classList.toggle("is-selected", selected);
    card.classList.toggle("is-locked", !unlocked);

    const preview = document.createElement("div");
    preview.className = "accessory-preview";
    preview.textContent = accessoryPreviewLabel(accessory);
    preview.setAttribute("aria-label", accessory.name);

    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = accessory.name;
    const description = document.createElement("small");
    description.textContent = accessory.price ? `${accessory.description} ${accessory.price} coins.` : accessory.description;
    body.append(title, description);

    const button = document.createElement("button");
    button.type = "button";

    if (selected) {
      button.textContent = "Selected";
      button.className = "is-selected";
      button.disabled = true;
    } else if (unlocked) {
      button.textContent = "Select";
      button.addEventListener("click", () => selectAccessory(accessory.id));
    } else {
      button.textContent = `Unlock ${accessory.price}`;
      button.disabled = state.wallet.coins < accessory.price;
      button.addEventListener("click", () => unlockAccessory(accessory));
    }

    card.append(preview, body, button);
    accessoryList.append(card);
  }

  if (accessoryStatus) {
    accessoryStatus.textContent = `${MemePop.getAccessory(state.settings.accessory).name} selected.`;
  }
}

function render(): void {
  if (startScreen) {
    startScreen.classList.toggle("is-hidden", state.startScreenLastSeenDate === MemePop.todayKey());
  }

  if (enabledInput) {
    enabledInput.checked = state.settings.enabled;
  }

  if (appearanceMinutesInput) {
    appearanceMinutesInput.value = String(state.settings.appearanceMinutes);
  }

  if (breakMinutesInput) {
    breakMinutesInput.value = String(state.settings.breakMinutes);
  }

  if (targetSitesInput) {
    targetSitesInput.value = MemePop.targetSitesToText(state.settings.targetSites);
  }

  if (themeSelect) {
    themeSelect.value = state.settings.theme;
  }

  if (soundInput) {
    soundInput.checked = state.settings.soundEnabled;
  }

  if (dndInput) {
    dndInput.checked = state.settings.doNotDisturb;
  }

  if (coinCount) {
    coinCount.textContent = String(state.wallet.coins);
  }

  if (streakCount) {
    streakCount.textContent = String(state.streak.current);
  }

  if (longestStreak) {
    longestStreak.textContent = `Longest streak: ${state.streak.longest}`;
  }

  if (lastActive) {
    lastActive.textContent = `Last active: ${state.streak.lastActiveDate || "never"}`;
  }

  renderFocus();
  renderDeadlines();
  renderAccessories();
}

async function saveSettings(): Promise<void> {
  state = await MemePop.updateState((nextState) => {
    nextState.settings.enabled = enabledInput?.checked ?? nextState.settings.enabled;
    nextState.settings.theme = (themeSelect?.value as MemePop.Theme | undefined) ?? nextState.settings.theme;
    nextState.settings.appearanceMinutes = MemePop.clampSettingMinutes(
      appearanceMinutesInput?.value,
      nextState.settings.appearanceMinutes
    );
    nextState.settings.breakMinutes = MemePop.clampSettingMinutes(breakMinutesInput?.value, nextState.settings.breakMinutes);
    nextState.settings.targetSites = MemePop.normalizeTargetSites(targetSitesInput?.value ?? nextState.settings.targetSites);
    nextState.settings.soundEnabled = soundInput?.checked ?? nextState.settings.soundEnabled;
    nextState.settings.doNotDisturb = dndInput?.checked ?? nextState.settings.doNotDisturb;
  });
  render();
}

async function applyDailyVisit(): Promise<void> {
  const today = MemePop.todayKey();

  state = await MemePop.updateState((nextState) => {
    if (nextState.wallet.lastDailyVisitDate !== today) {
      nextState.wallet.coins += 5;
      nextState.wallet.lastDailyVisitDate = today;
    }

    if (nextState.streak.lastActiveDate !== today) {
      const dayGap = MemePop.daysBetween(nextState.streak.lastActiveDate, today);
      nextState.streak.current = dayGap === 1 ? nextState.streak.current + 1 : 1;
      nextState.streak.longest = Math.max(nextState.streak.longest, nextState.streak.current);
      nextState.streak.lastActiveDate = today;
    }
  });

  render();
}

async function selectAccessory(accessoryId: MemePop.AccessoryId): Promise<void> {
  state = await MemePop.updateState((nextState) => {
    if (nextState.unlockedAccessories.includes(accessoryId)) {
      nextState.settings.accessory = accessoryId;
    }
  });
  setStatus(`${MemePop.getAccessory(accessoryId).name} selected.`);
  render();
}

async function unlockAccessory(accessory: MemePop.Accessory): Promise<void> {
  if (state.wallet.coins < accessory.price) {
    setStatus("Not enough Meme Coins yet.");
    return;
  }

  state = await MemePop.updateState((nextState) => {
    if (!nextState.unlockedAccessories.includes(accessory.id) && nextState.wallet.coins >= accessory.price) {
      nextState.wallet.coins -= accessory.price;
      nextState.unlockedAccessories.push(accessory.id);
      nextState.settings.accessory = accessory.id;
    }
  });
  playUiTone();
  setStatus(`${accessory.name} unlocked.`);
  render();
}

function showMemePopNow(): void {
  void saveSettings().then(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: Array<{ id?: number }>) => {
      const tabId = tabs[0]?.id;

      if (!tabId) {
        setStatus("Open a normal webpage first.");
        return;
      }

      chrome.tabs.sendMessage(tabId, { type: "MEMEPOP_SHOW_NOW", force: true }, (response?: { ok?: boolean }) => {
        if (chrome.runtime.lastError) {
          setStatus("Reload a normal webpage first.");
          return;
        }

        setStatus(response?.ok ? "MemePop popped." : "MemePop is muted, off, or unavailable here.");
      });
    });
  });
}

function showMessageInActiveTab(message: string): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: Array<{ id?: number }>) => {
    const tabId = tabs[0]?.id;

    if (!tabId) {
      setStatus("Open a normal webpage first.");
      return;
    }

    chrome.tabs.sendMessage(tabId, { type: "MEMEPOP_SHOW_NOW", force: true, message }, () => {
      if (chrome.runtime.lastError) {
        setStatus("Reload a normal webpage first.");
        return;
      }
    });
  });
}

function openMomentCreator(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL("moment.html") });
}

function openSettings(): void {
  chrome.runtime.openOptionsPage();
}

async function completeStartScreen(openPlanner = false): Promise<void> {
  state = await MemePop.updateState((nextState) => {
    nextState.startScreenLastSeenDate = MemePop.todayKey();
  });
  render();
  setStatus(openPlanner ? "Opening your day plan." : "MemePop is ready.");

  if (openPlanner) {
    openSettings();
  }
}

function toggleFocus(): void {
  const active = state.focus.active && state.focus.endsAt > Date.now();

  if (active) {
    chrome.runtime.sendMessage({ type: "MEMEPOP_FOCUS_CANCEL" }, (response?: { focus?: MemePop.FocusState }) => {
      if (chrome.runtime.lastError) {
        setStatus("Could not cancel focus mode.");
        return;
      }

      if (response?.focus) {
        state.focus = response.focus;
      }

      setStatus("Focus mode cancelled.");
      void MemePop.readState().then((nextState) => {
        state = nextState;
        render();
      });
    });
    return;
  }

  const durationMinutes = Number(focusDuration?.value ?? 25);
  chrome.runtime.sendMessage({ type: "MEMEPOP_FOCUS_START", durationMinutes }, (response?: { ok?: boolean }) => {
    if (chrome.runtime.lastError || !response?.ok) {
      setStatus("Could not start focus mode.");
      return;
    }

    setStatus("Focus mode started.");
    void MemePop.readState().then((nextState) => {
      state = nextState;
      render();
    });
  });
}

async function addDeadline(): Promise<void> {
  const title = deadlineTitleInput?.value.trim() ?? "";
  const dueValue = deadlineDueInput?.value ?? "";
  const dueAt = dueValue ? new Date(dueValue).getTime() : NaN;

  if (!title) {
    setStatus("Add a project title first.");
    return;
  }

  if (!Number.isFinite(dueAt)) {
    setStatus("Choose a deadline date and time.");
    return;
  }

  const deadline: MemePop.DeadlineItem = {
    id: MemePop.createId("deadline"),
    title,
    subject: deadlineSubjectInput?.value.trim() ?? "",
    dueAt,
    priority: (deadlinePrioritySelect?.value as MemePop.DeadlinePriority | undefined) ?? "medium",
    tasks: parseTaskLines(deadlineTasksInput?.value ?? ""),
    reminder: (deadlineReminderSelect?.value as MemePop.DeadlineReminder | undefined) ?? "oneDay",
    customReminderMinutes: MemePop.clampSettingMinutes(deadlineCustomReminderInput?.value, 60),
    completed: false,
    completedAt: 0,
    createdAt: Date.now()
  };

  state = await MemePop.updateState((nextState) => {
    nextState.deadlines.push(deadline);
  });

  if (deadlineTitleInput) deadlineTitleInput.value = "";
  if (deadlineDueInput) deadlineDueInput.value = "";
  if (deadlineSubjectInput) deadlineSubjectInput.value = "";
  if (deadlineTasksInput) deadlineTasksInput.value = "";

  setStatus("Deadline added.");
  render();
}

async function toggleDeadlineTask(deadlineId: string, taskId: string, done: boolean): Promise<void> {
  state = await MemePop.updateState((nextState) => {
    const deadline = nextState.deadlines.find((item) => item.id === deadlineId);
    const task = deadline?.tasks.find((item) => item.id === taskId);

    if (task) {
      task.done = done;
    }
  });
  render();
}

function continueDeadline(deadline: MemePop.DeadlineItem): void {
  showMessageInActiveTab(`Deadline detected: ${deadline.title}. Complete one section now.`);
  setStatus("Deadline nudge sent.");
}

function startDeadlineFocus(deadline: MemePop.DeadlineItem): void {
  chrome.runtime.sendMessage({ type: "MEMEPOP_FOCUS_START", durationMinutes: Number(focusDuration?.value ?? 25) }, (response?: { ok?: boolean }) => {
    if (chrome.runtime.lastError || !response?.ok) {
      setStatus("Could not start focus mode.");
      return;
    }

    showMessageInActiveTab(`Focus mode recommended for ${deadline.title}.`);
    setStatus("Focus timer started.");
    void MemePop.readState().then((nextState) => {
      state = nextState;
      render();
    });
  });
}

async function completeDeadline(deadlineId: string): Promise<void> {
  let completedTitle = "";

  state = await MemePop.updateState((nextState) => {
    const deadline = nextState.deadlines.find((item) => item.id === deadlineId);

    if (!deadline || deadline.completed) {
      return;
    }

    deadline.completed = true;
    deadline.completedAt = Date.now();
    completedTitle = deadline.title;
    nextState.wallet.coins += MemePop.COMPLETION_COIN_REWARD;
  });

  playUiTone();
  setStatus(`${completedTitle || "Deadline"} complete. +${MemePop.COMPLETION_COIN_REWARD} Meme Coins.`);
  showMessageInActiveTab("Focus session complete. Tiny victory achieved.");
  render();
}

enabledInput?.addEventListener("change", () => void saveSettings());
themeSelect?.addEventListener("change", () => void saveSettings());
appearanceMinutesInput?.addEventListener("change", () => void saveSettings());
breakMinutesInput?.addEventListener("change", () => void saveSettings());
targetSitesInput?.addEventListener("change", () => void saveSettings());
soundInput?.addEventListener("change", () => void saveSettings());
dndInput?.addEventListener("change", () => void saveSettings());
showNowButton?.addEventListener("click", showMemePopNow);
momentButton?.addEventListener("click", openMomentCreator);
settingsButton?.addEventListener("click", openSettings);
readyButton?.addEventListener("click", () => void completeStartScreen());
planDayButton?.addEventListener("click", () => void completeStartScreen(true));
focusButton?.addEventListener("click", toggleFocus);
addDeadlineButton?.addEventListener("click", () => void addDeadline());

chrome.storage.onChanged.addListener((changes: Record<string, { newValue?: Partial<MemePop.AppState> }>, areaName: string) => {
  if (areaName !== "local" || !changes[MemePop.STATE_KEY]) {
    return;
  }

  state = MemePop.normalizeState(changes[MemePop.STATE_KEY].newValue);
  render();
});

document.addEventListener("DOMContentLoaded", () => {
  void MemePop.readState().then((nextState) => {
    state = nextState;
    render();
    return applyDailyVisit();
  });
});
