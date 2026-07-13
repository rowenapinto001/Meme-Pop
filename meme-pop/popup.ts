const enabledInput = document.querySelector<HTMLInputElement>("#enabledInput");
const themeSelect = document.querySelector<HTMLSelectElement>("#themeSelect");
const frequencySelect = document.querySelector<HTMLSelectElement>("#frequencySelect");
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
const showNowButton = document.querySelector<HTMLButtonElement>("#showNowButton");
const momentButton = document.querySelector<HTMLButtonElement>("#momentButton");
const settingsButton = document.querySelector<HTMLButtonElement>("#settingsButton");
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

function accessoryPreviewLabel(accessory: MemePop.Accessory): string {
  if (accessory.id === "partyHat") {
    return "hat";
  }

  if (accessory.id === "sunglasses") {
    return "cool";
  }

  if (accessory.id === "crown") {
    return "king";
  }

  return "pop";
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
    card.className = "accessory-card";

    const preview = document.createElement("div");
    preview.className = "accessory-preview";
    preview.textContent = accessoryPreviewLabel(accessory);

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
  if (enabledInput) {
    enabledInput.checked = state.settings.enabled;
  }

  if (frequencySelect) {
    frequencySelect.value = state.settings.frequency;
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
  renderAccessories();
}

async function saveSettings(): Promise<void> {
  state = await MemePop.updateState((nextState) => {
    nextState.settings.enabled = enabledInput?.checked ?? nextState.settings.enabled;
    nextState.settings.theme = (themeSelect?.value as MemePop.Theme | undefined) ?? nextState.settings.theme;
    nextState.settings.frequency = (frequencySelect?.value as MemePop.Frequency | undefined) ?? nextState.settings.frequency;
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

function openMomentCreator(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL("moment.html") });
}

function openSettings(): void {
  chrome.runtime.openOptionsPage();
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

enabledInput?.addEventListener("change", () => void saveSettings());
themeSelect?.addEventListener("change", () => void saveSettings());
frequencySelect?.addEventListener("change", () => void saveSettings());
soundInput?.addEventListener("change", () => void saveSettings());
dndInput?.addEventListener("change", () => void saveSettings());
showNowButton?.addEventListener("click", showMemePopNow);
momentButton?.addEventListener("click", openMomentCreator);
settingsButton?.addEventListener("click", openSettings);
focusButton?.addEventListener("click", toggleFocus);

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
