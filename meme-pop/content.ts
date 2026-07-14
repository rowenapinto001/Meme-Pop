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
let entranceTimer: number | undefined;
let shellTimer: number | undefined;
let lastMessageText = "";
let activeMessageCategory: MemePop.MessageCategory | null = null;
let extensionContextAvailable = true;
let dragging = false;
let dragMoved = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let characterImageElement: HTMLImageElement | null = null;
const THEME_CATEGORIES: Record<Exclude<MemePop.Theme, "random">, MemePop.MessageCategory> = {
  focus: "focusMode",
  break: "breakTime",
  motivation: "motivationMode",
  procrastination: "procrastinationMode",
  lateNight: "lateNightMode",
  social: "socialMode",
  deadline: "deadlineMode",
  movement: "movementMode",
  studying: "studying",
  gaming: "gaming",
  office: "office",
  coding: "coding",
  hydration: "hydration"
};
const DROP_SEQUENCE_MODES = new Set([
  "focus",
  "study",
  "office",
  "motivation",
  "procrastination",
  "assignment",
  "project",
  "assignment/project",
  "coding"
]);
const DROP_SEQUENCE_CATEGORIES = new Set<MemePop.MessageCategory>([
  "focusMode",
  "motivationMode",
  "motivation",
  "procrastinationMode",
  "procrastination",
  "deadlineMode",
  "deadline",
  "office",
  "studying",
  "coding"
]);

function clearTimer(timer: number | undefined): void {
  if (timer) {
    window.clearTimeout(timer);
  }
}

function stopContentScript(): void {
  extensionContextAvailable = false;
  clearTimer(nextAppearTimer);
  clearTimer(autoHideTimer);
  clearTimer(countdownTimer);
  clearTimer(removeTimer);
  clearTimer(entranceTimer);
  clearTimer(shellTimer);
  hideMemePop(false);
}

function hasExtensionContext(): boolean {
  if (!extensionContextAvailable) {
    return false;
  }

  try {
    void chrome.runtime.getURL("");
    return true;
  } catch {
    stopContentScript();
    return false;
  }
}

function getExtensionUrl(path: string): string | null {
  if (!extensionContextAvailable) {
    return null;
  }

  try {
    return chrome.runtime.getURL(path);
  } catch {
    stopContentScript();
    return null;
  }
}

function sendRuntimeMessage<TResponse>(
  message: Record<string, unknown>,
  callback?: (response: TResponse | undefined) => void
): void {
  if (!hasExtensionContext()) {
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response?: TResponse) => {
      try {
        if (chrome.runtime.lastError) {
          return;
        }
      } catch {
        stopContentScript();
        return;
      }

      callback?.(response);
    });
  } catch {
    stopContentScript();
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
  if (!hasExtensionContext() || !document.body || location.protocol === "chrome:" || location.hostname === "chrome.google.com") {
    return false;
  }

  if (!MemePop.isAllowedTargetUrl(window.location.href, appState.settings.targetSites)) {
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

  if (!extensionContextAvailable) {
    return;
  }

  if (MemePop.isQuiet(appState)) {
    return;
  }

  const delay = MemePop.minutesToMs(appState.settings.appearanceMinutes);

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

function isHydrationTheme(): boolean {
  return getCharacterTheme() === "hydration";
}

function getActiveMessageCategory(): MemePop.MessageCategory {
  if (appState.settings.theme === "random") {
    return MemePop.categoryForUrl(window.location.href);
  }

  return THEME_CATEGORIES[appState.settings.theme];
}

function getCategoryForText(text?: string): MemePop.MessageCategory | null {
  if (!text) {
    return null;
  }

  const knownMessage = MemePop.MESSAGES.find((message) => message.text === text);

  if (knownMessage) {
    return knownMessage.category;
  }

  if (MemePop.FOCUS_START_MESSAGES.includes(text) || MemePop.FOCUS_DONE_MESSAGES.includes(text)) {
    return "focusMode";
  }

  if (text.toLowerCase().includes("deadline")) {
    return "deadlineMode";
  }

  if (text.toLowerCase().includes("move") || text.toLowerCase().includes("stretch")) {
    return "movementMode";
  }

  return null;
}

function getCharacterTheme(): MemePop.CharacterTheme {
  return MemePop.characterThemeForSettings(appState.settings.theme, activeMessageCategory ?? getActiveMessageCategory());
}

function getCharacterAssetPath(): string {
  return MemePop.THEME_CHARACTER_ASSETS[getCharacterTheme()];
}

function normalizeDropSequenceMode(theme: MemePop.CharacterTheme): string {
  if (theme === "studying") {
    return "study";
  }

  if (theme === "deadline") {
    return "assignment/project";
  }

  return theme;
}

function shouldUseDropSequence(): boolean {
  if (appState.settings.theme === "random") {
    return DROP_SEQUENCE_CATEGORIES.has(activeMessageCategory ?? getActiveMessageCategory());
  }

  return DROP_SEQUENCE_MODES.has(normalizeDropSequenceMode(getCharacterTheme()));
}

function applyEntranceModeClass(root: HTMLElement): void {
  const usesDrop = shouldUseDropSequence();

  root.classList.add("memepop-entrance-sequenced");
  root.classList.toggle("memepop-drop-supported", usesDrop);
  root.classList.toggle("memepop-walk-supported", !usesDrop);
}

function reconcileCompletedEntranceSequence(): void {
  if (!rootElement?.classList.contains("memepop-sequence-complete")) {
    return;
  }

  rootElement.classList.remove("memepop-drop-supported", "memepop-walk-supported");
  applyEntranceModeClass(rootElement);
  rootElement.classList.add("memepop-shell-visible");
}

function isInteractionReady(): boolean {
  return !rootElement?.classList.contains("memepop-entrance-sequenced") || rootElement.classList.contains("memepop-sequence-complete");
}

function updateCharacterImage(): void {
  if (!characterImageElement) {
    return;
  }

  const imageUrl = getExtensionUrl(getCharacterAssetPath());

  if (!imageUrl) {
    return;
  }

  characterImageElement.src = imageUrl;
  characterImageElement.alt = `MemePop ${getCharacterTheme()} character`;
}

function updateThemeClass(): void {
  if (!rootElement) {
    return;
  }

  rootElement.classList.remove(
    "memepop-theme-random",
    "memepop-theme-focus",
    "memepop-theme-break",
    "memepop-theme-motivation",
    "memepop-theme-procrastination",
    "memepop-theme-lateNight",
    "memepop-theme-social",
    "memepop-theme-deadline",
    "memepop-theme-movement",
    "memepop-theme-office",
    "memepop-theme-studying",
    "memepop-theme-gaming",
    "memepop-theme-coding",
    "memepop-theme-hydration",
    "memepop-offering",
    "memepop-splashing"
  );
  rootElement.classList.add(`memepop-theme-${getCharacterTheme()}`);
  updateCharacterImage();

  if (isHydrationTheme()) {
    restartHydrationOffer();
  }
}

function restartHydrationOffer(): void {
  if (!rootElement || !isHydrationTheme()) {
    return;
  }

  rootElement.classList.remove("memepop-offering");
  void rootElement.offsetWidth;
  rootElement.classList.add("memepop-offering");
}

function updateCountdown(): void {
  if (!countdownElement) {
    return;
  }

  const visibleUntil = Number(countdownElement.dataset.visibleUntil ?? 0);
  const msLeft = Math.max(0, visibleUntil - Date.now());
  countdownElement.textContent = formatCountdown(msLeft);
  countdownElement.setAttribute("aria-label", `MemePop closes in ${formatCountdown(msLeft)}`);

  if (msLeft > 0) {
    countdownTimer = window.setTimeout(updateCountdown, 1000);
  }
}

function getVisibleDurationMs(): number {
  return MemePop.minutesToMs(appState.settings.breakMinutes);
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}

function resetAutoHide(_extended = false): void {
  clearTimer(autoHideTimer);
  clearTimer(countdownTimer);
  const visibleDurationMs = getVisibleDurationMs();

  if (countdownElement) {
    countdownElement.dataset.visibleUntil = String(Date.now() + visibleDurationMs);
    updateCountdown();
  }

  autoHideTimer = window.setTimeout(() => {
    hideMemePop(true);
  }, visibleDurationMs);
}

function hideMemePop(animated: boolean): void {
  clearTimer(autoHideTimer);
  clearTimer(countdownTimer);
  clearTimer(removeTimer);
  clearTimer(entranceTimer);
  clearTimer(shellTimer);

  if (!rootElement) {
    return;
  }

  const currentRoot = rootElement;
  const resetReferences = () => {
    if (rootElement === currentRoot) {
      rootElement = null;
      cardElement = null;
      messageElement = null;
      countdownElement = null;
      characterImageElement = null;
    }
  };

  if (!animated) {
    currentRoot.remove();
    resetReferences();
    return;
  }

  currentRoot.classList.add("memepop-leaving");

  if (currentRoot.classList.contains("memepop-entrance-sequenced")) {
    const character = currentRoot.querySelector<HTMLElement>(".memepop-character");
    const removeSupportedRoot = () => {
      clearTimer(removeTimer);
      currentRoot.remove();
      resetReferences();
    };

    if (character) {
      const handleExit = (event: AnimationEvent) => {
        if (event.target === character && (event.animationName === "memeExitUp" || event.animationName === "memeReducedExitUp")) {
          character.removeEventListener("animationend", handleExit);
          removeSupportedRoot();
        }
      };

      character.addEventListener("animationend", handleExit);
      removeTimer = window.setTimeout(removeSupportedRoot, 1100);
      return;
    }
  }

  removeTimer = window.setTimeout(() => {
    currentRoot.remove();
    resetReferences();
  }, 420);
}

function setMessage(text?: string): void {
  const category = getCategoryForText(text) ?? getActiveMessageCategory();
  const nextMessage = text ?? MemePop.pickMessage(category, lastMessageText).text;

  activeMessageCategory = category;
  lastMessageText = nextMessage;
  updateThemeClass();
  reconcileCompletedEntranceSequence();

  if (messageElement) {
    messageElement.textContent = nextMessage;
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

function createHydrationSplash(): HTMLElement {
  const splash = document.createElement("div");
  splash.className = "memepop-hydration-splash";
  splash.setAttribute("aria-hidden", "true");

  const stream = document.createElement("span");
  stream.className = "memepop-water-stream";
  splash.append(stream);

  for (let index = 1; index <= 14; index += 1) {
    const drop = document.createElement("span");
    drop.className = `memepop-water-drop memepop-water-drop-${index}`;
    splash.append(drop);
  }

  const puddle = document.createElement("span");
  puddle.className = "memepop-water-puddle";
  splash.append(puddle);

  return splash;
}

function createPartyEffects(): HTMLElement {
  const effects = document.createElement("div");
  effects.className = "memepop-party-effects";
  effects.setAttribute("aria-hidden", "true");

  const leftPopper = document.createElement("span");
  leftPopper.className = "memepop-party-popper memepop-party-popper-left";

  const rightPopper = document.createElement("span");
  rightPopper.className = "memepop-party-popper memepop-party-popper-right";

  effects.append(leftPopper, rightPopper);

  for (let index = 1; index <= 26; index += 1) {
    const confetti = document.createElement("span");
    confetti.className = `memepop-confetti memepop-confetti-${index}`;
    effects.append(confetti);
  }

  for (let index = 1; index <= 5; index += 1) {
    const balloon = document.createElement("span");
    balloon.className = `memepop-balloon memepop-balloon-${index}`;
    effects.append(balloon);
  }

  return effects;
}

function configureEntranceSequence(root: HTMLElement, character: HTMLElement, shell: HTMLElement): void {
  clearTimer(entranceTimer);
  clearTimer(shellTimer);
  root.classList.remove(
    "memepop-entrance-sequenced",
    "memepop-drop-supported",
    "memepop-walk-supported",
    "memepop-shell-visible",
    "memepop-sequence-complete"
  );

  const usesDrop = shouldUseDropSequence();
  let entranceFinished = false;
  let shellFinished = false;

  const finishShell = () => {
    if (shellFinished || !root.isConnected || root.classList.contains("memepop-leaving")) {
      return;
    }

    shellFinished = true;
    clearTimer(shellTimer);
    root.classList.add("memepop-sequence-complete");
  };

  const finishEntrance = () => {
    if (entranceFinished || !root.isConnected || root.classList.contains("memepop-leaving")) {
      return;
    }

    entranceFinished = true;
    clearTimer(entranceTimer);
    root.classList.add("memepop-shell-visible");
    shellTimer = window.setTimeout(finishShell, 700);
  };

  applyEntranceModeClass(root);

  character.addEventListener("animationend", (event) => {
    if (
      event.target === character &&
      (event.animationName === "memeDropIn" || event.animationName === "memeWalkIn" || event.animationName === "memeReducedFadeIn")
    ) {
      finishEntrance();
    }
  });

  shell.addEventListener("animationend", (event) => {
    if (event.target === shell && (event.animationName === "cardShellAppear" || event.animationName === "cardShellReducedAppear")) {
      finishShell();
    }
  });

  entranceTimer = window.setTimeout(finishEntrance, usesDrop ? 1400 : 2600);
}

function startEntranceSequence(root: HTMLElement): void {
  const character = root.querySelector<HTMLElement>(".memepop-character");
  const shell = root.querySelector<HTMLElement>(".memepop-card-shell");

  if (!character || !shell) {
    root.classList.add("memepop-sequence-complete");
    return;
  }

  configureEntranceSequence(root, character, shell);
}

function createMemePop(message?: string): HTMLElement | null {
  if (!hasExtensionContext()) {
    return null;
  }

  const root = document.createElement("aside");
  root.id = "memepop-root";
  root.setAttribute("aria-live", "polite");
  root.className = "memepop-accessory-none";

  const splash = createHydrationSplash();
  const partyEffects = createPartyEffects();

  const card = document.createElement("div");
  card.className = "memepop-card";

  const shell = document.createElement("div");
  shell.className = "memepop-card-shell";
  shell.setAttribute("aria-hidden", "true");

  const controls = document.createElement("div");
  controls.className = "memepop-controls";

  const closeButton = createButton("memepop-control", "x", "Close MemePop");
  const muteButton = createButton("memepop-control", "mute", "Mute MemePop for 30 minutes");
  const momentButton = createButton("memepop-control", "png", "Create Meme Moment");
  const settingsButton = createButton("memepop-control", "set", "Open MemePop settings");
  controls.append(momentButton, muteButton, settingsButton, closeButton);

  const characterButton = createButton("memepop-character", "", "Click MemePop for a reaction");
  const image = document.createElement("img");
  const imageUrl = getExtensionUrl(getCharacterAssetPath());

  if (!imageUrl) {
    return null;
  }

  image.src = imageUrl;
  image.alt = `MemePop ${getCharacterTheme()} character`;
  image.decoding = "async";
  image.addEventListener("error", () => {
    characterButton.classList.add("memepop-character-fallback");
  });
  characterImageElement = image;

  const hydrationArm = document.createElement("span");
  hydrationArm.className = "memepop-hydration-arm";
  hydrationArm.setAttribute("aria-hidden", "true");

  const hydrationCup = document.createElement("span");
  hydrationCup.className = "memepop-hydration-cup";
  hydrationCup.setAttribute("aria-hidden", "true");

  characterButton.append(image, hydrationArm, hydrationCup);

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
  countdown.textContent = formatCountdown(getVisibleDurationMs());
  countdown.setAttribute("aria-label", `MemePop closes in ${formatCountdown(getVisibleDurationMs())}`);

  card.append(shell, controls, countdown, characterButton, accessory, bubble, reward);
  root.append(splash, partyEffects, card);

  rootElement = root;
  cardElement = card;
  messageElement = messageText;
  countdownElement = countdown;
  updateAccessoryClass();
  updateThemeClass();
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
    sendRuntimeMessage({ type: "MEMEPOP_OPEN_SETTINGS" });
  });
  momentButton.addEventListener("click", () => {
    sendRuntimeMessage({ type: "MEMEPOP_OPEN_MOMENT", message: lastMessageText });
  });
  characterButton.addEventListener("click", () => {
    if (!isInteractionReady()) {
      return;
    }

    if (dragMoved) {
      dragMoved = false;
      return;
    }

    setMessage();
    restartHydrationOffer();
    playTone("click");
    resetAutoHide(true);
    sendRuntimeMessage<{ awarded?: boolean; coins?: number }>({ type: "MEMEPOP_CHARACTER_CLICKED" }, (response) => {
      if (!response?.awarded) {
        return;
      }

      card.classList.remove("memepop-earned");
      void card.offsetWidth;
      card.classList.add("memepop-earned");
    });
  });

  card.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement | null;

    if (target?.closest(".memepop-control") || !rootElement || !cardElement || !isInteractionReady()) {
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
    updateThemeClass();
    setMessage(message);
    restartHydrationOffer();
    centerAndRememberPosition();
    resetAutoHide(true);
    return true;
  }

  const target = document.body || document.documentElement;

  if (!target) {
    return false;
  }

  const memePop = createMemePop(message);

  if (!memePop) {
    return false;
  }

  target.append(memePop);
  startEntranceSequence(memePop);
  centerAndRememberPosition();
  playTone(message && MemePop.FOCUS_DONE_MESSAGES.includes(message) ? "finish" : "appear");
  resetAutoHide();
  return true;
}

try {
  chrome.runtime.onMessage.addListener((message: ContentCommand, _sender: unknown, sendResponse: (response: { ok: boolean }) => void) => {
    if (!extensionContextAvailable) {
      sendResponse({ ok: false });
      return;
    }

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
    if (!extensionContextAvailable || areaName !== "local" || !changes[MemePop.STATE_KEY]) {
      return;
    }

    const previousTheme = appState.settings.theme;
    appState = MemePop.normalizeState(changes[MemePop.STATE_KEY].newValue);
    updateAccessoryClass();
    updateThemeClass();

    if (rootElement && previousTheme !== appState.settings.theme) {
      setMessage();
      restartHydrationOffer();
    }

    if (MemePop.isQuiet(appState)) {
      hideMemePop(true);
    }

    scheduleNextAppearance();
  });
} catch {
  stopContentScript();
}

window.addEventListener("resize", () => centerAndRememberPosition());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    scheduleNextAppearance();
  }
});

if (hasExtensionContext()) {
  void MemePop.readState().then((state) => {
    if (!extensionContextAvailable) {
      return;
    }

    appState = state;
    scheduleNextAppearance();
  });
}
