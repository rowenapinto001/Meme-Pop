type ContentCommand = {
  type?: string;
  message?: string;
  force?: boolean;
};

let appState: MemePop.AppState = MemePop.normalizeState(undefined);
let rootElement: HTMLElement | null = null;
let cardElement: HTMLElement | null = null;
let messageElement: HTMLElement | null = null;
let countdownElement: HTMLElement | null = null;
let nextAppearTimer: number | undefined;
let autoHideTimer: number | undefined;
let countdownTimer: number | undefined;
let removeTimer: number | undefined;
let lastMessageText = "";
let dragging = false;
let dragMoved = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
const VISIBLE_DURATION_MS = 10000;

function clearTimer(timer: number | undefined): void {
  if (timer) {
    window.clearTimeout(timer);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function playTone(kind: "appear" | "click" | "unlock" | "finish"): void {
  if (!appState.settings.soundEnabled) {
    return;
  }

  try {
    const AudioContextConstructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const startFrequency = kind === "finish" ? 520 : kind === "click" ? 620 : kind === "unlock" ? 740 : 430;
    const endFrequency = kind === "finish" ? 880 : kind === "click" ? 540 : kind === "unlock" ? 980 : 700;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.17);
    oscillator.addEventListener("ended", () => {
      void context.close();
    });
  } catch {
    // Optional sounds should never break the companion.
  }
}

function canShow(force: boolean): boolean {
  if (!document.body || location.protocol === "chrome:" || location.hostname === "chrome.google.com") {
    return false;
  }

  if (!appState.settings.enabled || appState.settings.doNotDisturb || appState.settings.mutedUntil > Date.now()) {
    return false;
  }

  if (!force && MemePop.isQuiet(appState)) {
    return false;
  }

  return true;
}

function scheduleNextAppearance(): void {
  clearTimer(nextAppearTimer);

  if (MemePop.isQuiet(appState)) {
    return;
  }

  const delay = MemePop.getRandomDelayMs(appState.settings.frequency);

  if (!delay) {
    return;
  }

  nextAppearTimer = window.setTimeout(() => {
    showMemePop(false);
    scheduleNextAppearance();
  }, delay);
}

function getDefaultPosition(): MemePop.CharacterPosition {
  return getCenteredPosition();
}

function getCenteredPosition(): MemePop.CharacterPosition {
  const rect = cardElement?.getBoundingClientRect();
  const width = rect?.width ?? Math.min(window.innerWidth - 24, 760);
  const height = rect?.height ?? Math.min(window.innerHeight - 24, 430);

  return {
    x: Math.max(12, (window.innerWidth - width) / 2),
    y: Math.max(12, (window.innerHeight - height) / 2)
  };
}

function applySavedPosition(center = false): void {
  if (!rootElement) {
    return;
  }

  void center;
  rootElement.style.removeProperty("left");
  rootElement.style.removeProperty("top");
  rootElement.style.removeProperty("right");
  rootElement.style.removeProperty("bottom");
}

function centerAndRememberPosition(): void {
  applySavedPosition(true);

  if (appState.position.x === null && appState.position.y === null) {
    return;
  }

  appState.position = { x: null, y: null };
  void MemePop.updateState((state) => {
    state.position = { x: null, y: null };
  });
}

function updateCountdown(): void {
  if (!countdownElement) {
    return;
  }

  const visibleUntil = Number(countdownElement.dataset.visibleUntil ?? 0);
  const secondsLeft = Math.max(0, Math.ceil((visibleUntil - Date.now()) / 1000));
  countdownElement.textContent = `${secondsLeft}s`;
  countdownElement.setAttribute("aria-label", `MemePop closes in ${secondsLeft} seconds`);

  if (secondsLeft > 0) {
    countdownTimer = window.setTimeout(updateCountdown, 250);
  }
}

function resetAutoHide(_extended = false): void {
  clearTimer(autoHideTimer);
  clearTimer(countdownTimer);

  if (countdownElement) {
    countdownElement.dataset.visibleUntil = String(Date.now() + VISIBLE_DURATION_MS);
    updateCountdown();
  }

  autoHideTimer = window.setTimeout(() => {
    hideMemePop(true);
  }, VISIBLE_DURATION_MS);
}

function hideMemePop(animated: boolean): void {
  clearTimer(autoHideTimer);
  clearTimer(countdownTimer);
  clearTimer(removeTimer);

  if (!rootElement) {
    return;
  }

  const currentRoot = rootElement;

  if (!animated) {
    currentRoot.remove();
    rootElement = null;
    cardElement = null;
    messageElement = null;
    countdownElement = null;
    return;
  }

  currentRoot.classList.add("memepop-leaving");
  removeTimer = window.setTimeout(() => {
    currentRoot.remove();
    if (rootElement === currentRoot) {
      rootElement = null;
      cardElement = null;
      messageElement = null;
      countdownElement = null;
    }
  }, 420);
}

function setMessage(text?: string): void {
  const category = MemePop.categoryForUrl(window.location.href);
  const nextMessage = text
    ? { text }
    : MemePop.pickMessage(Math.random() > 0.82 ? "procrastination" : category, lastMessageText);

  lastMessageText = nextMessage.text;

  if (messageElement) {
    messageElement.textContent = nextMessage.text;
  }
}

function updateAccessoryClass(): void {
  if (!rootElement) {
    return;
  }

  rootElement.classList.remove("memepop-accessory-none", "memepop-accessory-partyHat", "memepop-accessory-sunglasses", "memepop-accessory-crown");
  rootElement.classList.add(`memepop-accessory-${appState.settings.accessory}`);
}

function createButton(className: string, label: string, title: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
}

function createMemePop(message?: string): HTMLElement {
  const root = document.createElement("aside");
  root.id = "memepop-root";
  root.setAttribute("aria-live", "polite");
  root.className = "memepop-accessory-none";

  const card = document.createElement("div");
  card.className = "memepop-card";

  const controls = document.createElement("div");
  controls.className = "memepop-controls";

  const closeButton = createButton("memepop-control", "x", "Close MemePop");
  const muteButton = createButton("memepop-control", "mute", "Mute MemePop for 30 minutes");
  const momentButton = createButton("memepop-control", "png", "Create Meme Moment");
  const settingsButton = createButton("memepop-control", "set", "Open MemePop settings");
  controls.append(momentButton, muteButton, settingsButton, closeButton);

  const characterButton = createButton("memepop-character", "", "Click MemePop for a reaction");
  const image = document.createElement("img");
  image.src = chrome.runtime.getURL("assets/character/memepop-study.png");
  image.alt = "MemePop character";
  image.decoding = "async";
  image.addEventListener("error", () => {
    characterButton.classList.add("memepop-character-fallback");
  });
  characterButton.append(image);

  const accessory = document.createElement("span");
  accessory.className = "memepop-accessory";
  accessory.setAttribute("aria-hidden", "true");

  const bubble = document.createElement("div");
  bubble.className = "memepop-bubble";

  const messageText = document.createElement("p");
  messageText.className = "memepop-message";
  bubble.append(messageText);

  const reward = document.createElement("span");
  reward.className = "memepop-reward";
  reward.textContent = "+1 coin";

  const countdown = document.createElement("span");
  countdown.className = "memepop-timer";
  countdown.textContent = "10s";
  countdown.setAttribute("aria-label", "MemePop closes in 10 seconds");

  card.append(controls, countdown, characterButton, accessory, bubble, reward);
  root.append(card);

  rootElement = root;
  cardElement = card;
  messageElement = messageText;
  countdownElement = countdown;
  updateAccessoryClass();
  setMessage(message);

  closeButton.addEventListener("click", () => hideMemePop(true));
  muteButton.addEventListener("click", () => {
    void MemePop.updateState((state) => {
      state.settings.mutedUntil = Date.now() + 30 * 60000;
    }).then((state) => {
      appState = state;
      hideMemePop(true);
      scheduleNextAppearance();
    });
  });
  settingsButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "MEMEPOP_OPEN_SETTINGS" });
  });
  momentButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "MEMEPOP_OPEN_MOMENT", message: lastMessageText });
  });
  characterButton.addEventListener("click", () => {
    if (dragMoved) {
      dragMoved = false;
      return;
    }

    setMessage();
    playTone("click");
    resetAutoHide(true);
    chrome.runtime.sendMessage({ type: "MEMEPOP_CHARACTER_CLICKED" }, (response?: { awarded?: boolean; coins?: number }) => {
      if (chrome.runtime.lastError || !response?.awarded) {
        return;
      }

      card.classList.remove("memepop-earned");
      void card.offsetWidth;
      card.classList.add("memepop-earned");
    });
  });

  card.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement | null;

    if (target?.closest(".memepop-control") || !rootElement || !cardElement) {
      return;
    }

    dragging = true;
    dragMoved = false;
    const rect = cardElement.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    card.setPointerCapture(event.pointerId);
    card.classList.add("memepop-dragging");
    resetAutoHide(true);
  });

  card.addEventListener("pointermove", (event) => {
    if (!dragging || !rootElement || !cardElement) {
      return;
    }

    const rect = cardElement.getBoundingClientRect();
    const x = clamp(event.clientX - dragOffsetX, 8, window.innerWidth - rect.width - 8);
    const y = clamp(event.clientY - dragOffsetY, 8, window.innerHeight - rect.height - 8);
    dragMoved = dragMoved || Math.abs(rect.left - x) > 4 || Math.abs(rect.top - y) > 4;
  });

  card.addEventListener("pointerup", (event) => {
    if (!dragging || !rootElement || !cardElement) {
      return;
    }

    dragging = false;
    card.releasePointerCapture(event.pointerId);
    card.classList.remove("memepop-dragging");
    centerAndRememberPosition();
  });

  card.addEventListener("pointercancel", () => {
    dragging = false;
    card.classList.remove("memepop-dragging");
  });

  return root;
}

function showMemePop(force: boolean, message?: string): boolean {
  if (!canShow(force)) {
    return false;
  }

  if (rootElement) {
    setMessage(message);
    centerAndRememberPosition();
    resetAutoHide(true);
    return true;
  }

  const target = document.body || document.documentElement;

  if (!target) {
    return false;
  }

  target.append(createMemePop(message));
  centerAndRememberPosition();
  playTone(message && MemePop.FOCUS_DONE_MESSAGES.includes(message) ? "finish" : "appear");
  resetAutoHide();
  return true;
}

chrome.runtime.onMessage.addListener((message: ContentCommand, _sender: unknown, sendResponse: (response: { ok: boolean }) => void) => {
  if (message?.type === "MEMEPOP_SHOW_NOW") {
    showMemePop(true, message.message);
    scheduleNextAppearance();
    sendResponse({ ok: Boolean(rootElement) });
    return;
  }

  if (message?.type === "MEMEPOP_FOCUS_START") {
    showMemePop(true, message.message ?? MemePop.FOCUS_START_MESSAGES[0]);
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === "MEMEPOP_FOCUS_DONE") {
    showMemePop(true, message.message ?? MemePop.FOCUS_DONE_MESSAGES[0]);
    sendResponse({ ok: true });
  }
});

chrome.storage.onChanged.addListener((changes: Record<string, { newValue?: Partial<MemePop.AppState> }>, areaName: string) => {
  if (areaName !== "local" || !changes[MemePop.STATE_KEY]) {
    return;
  }

  appState = MemePop.normalizeState(changes[MemePop.STATE_KEY].newValue);
  updateAccessoryClass();

  if (MemePop.isQuiet(appState)) {
    hideMemePop(true);
  }

  scheduleNextAppearance();
});

window.addEventListener("resize", () => centerAndRememberPosition());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    scheduleNextAppearance();
  }
});

void MemePop.readState().then((state) => {
  appState = state;
  scheduleNextAppearance();
});
