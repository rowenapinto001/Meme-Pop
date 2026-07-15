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
let modeLabelElement: HTMLElement | null = null;
let nextAppearTimer: number | undefined;
let autoHideTimer: number | undefined;
let countdownTimer: number | undefined;
let removeTimer: number | undefined;
let entranceTimer: number | undefined;
let shellTimer: number | undefined;
let partyDiscoTimer: number | undefined;
let partyConfettiTimer: number | undefined;
let partyCharacterTimer: number | undefined;
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

function clearPartyEntranceTimers(): void {
  clearTimer(partyDiscoTimer);
  clearTimer(partyConfettiTimer);
  clearTimer(partyCharacterTimer);
  partyDiscoTimer = undefined;
  partyConfettiTimer = undefined;
  partyCharacterTimer = undefined;
}

function stopContentScript(): void {
  extensionContextAvailable = false;
  clearTimer(nextAppearTimer);
  clearTimer(autoHideTimer);
  clearTimer(countdownTimer);
  clearTimer(removeTimer);
  clearTimer(entranceTimer);
  clearTimer(shellTimer);
  clearPartyEntranceTimers();
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

  const delay = MemePop.minutesToMs(MemePop.getAppearanceMinutesForSettings(appState.settings));

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

function getConfiguredTheme(): MemePop.Theme {
  return MemePop.getRotatingTheme(appState.settings) ?? appState.settings.theme;
}

function getActiveMessageCategory(): MemePop.MessageCategory {
  const configuredTheme = getConfiguredTheme();

  if (configuredTheme === "random") {
    return MemePop.categoryForUrl(window.location.href);
  }

  return THEME_CATEGORIES[configuredTheme];
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
  return MemePop.characterThemeForSettings(getConfiguredTheme(), activeMessageCategory ?? getActiveMessageCategory());
}

function getCurrentModeLabel(): string {
  return MemePop.THEME_LABELS[getCharacterTheme()];
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
  if (getConfiguredTheme() === "random") {
    return DROP_SEQUENCE_CATEGORIES.has(activeMessageCategory ?? getActiveMessageCategory());
  }

  return DROP_SEQUENCE_MODES.has(normalizeDropSequenceMode(getCharacterTheme()));
}

function getModeSettingsKey(settings: MemePop.Settings): string {
  const rotation = MemePop.normalizeModeRotation(settings.modeRotation)
    .map((item) => `${item.theme}:${item.durationMinutes}:${item.enabled ? 1 : 0}`)
    .join("|");
  return `${settings.theme}::${MemePop.getRotatingTheme(settings) ?? "single"}::${rotation}`;
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

function updateModeLabel(): void {
  if (!modeLabelElement) {
    return;
  }

  modeLabelElement.textContent = getCurrentModeLabel();
  modeLabelElement.setAttribute("aria-label", `Current MemePop mode: ${getCurrentModeLabel()}`);
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
  updateModeLabel();

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
  clearPartyEntranceTimers();

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
      modeLabelElement = null;
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

function createDefaultWebStage(): HTMLElement {
  const stage = document.createElement("div");
  stage.className = "memepop-default-web-stage";
  stage.setAttribute("aria-hidden", "true");

  const city = document.createElement("div");
  city.className = "memepop-default-city";
  city.innerHTML = `
    <svg class="memepop-default-city-art" viewBox="0 0 1200 330" aria-hidden="true" focusable="false">
      <g class="memepop-city-clouds">
        <path d="M0 258 C28 222 58 230 78 244 C102 205 154 211 176 246 C200 232 232 238 250 260 L250 330 L0 330 Z" />
        <path d="M950 266 C980 226 1016 232 1034 250 C1058 210 1113 218 1130 255 C1152 240 1184 244 1200 266 L1200 330 L950 330 Z" />
      </g>

      <g class="memepop-city-far">
        <path d="M54 176 L102 176 L102 330 L54 330 Z" />
        <path d="M118 212 L156 212 L156 330 L118 330 Z" />
        <path d="M184 196 L236 196 L236 330 L184 330 Z" />
        <path d="M274 238 L315 238 L315 330 L274 330 Z" />
        <path d="M792 240 L836 240 L836 330 L792 330 Z" />
        <path d="M870 204 L922 204 L922 330 L870 330 Z" />
        <path d="M954 220 L995 220 L995 330 L954 330 Z" />
        <path d="M1084 178 L1134 178 L1134 330 L1084 330 Z" />
      </g>

      <g class="memepop-city-mid">
        <path d="M0 202 L36 202 L36 330 L0 330 Z" />
        <path d="M42 164 L96 144 L150 164 L150 330 L42 330 Z" />
        <path d="M164 210 L224 210 L224 330 L164 330 Z" />
        <path d="M248 224 L294 224 L294 330 L248 330 Z" />
        <path d="M906 226 L952 226 L952 330 L906 330 Z" />
        <path d="M976 204 L1038 184 L1102 204 L1102 330 L976 330 Z" />
        <path d="M1116 168 L1174 148 L1200 156 L1200 330 L1116 330 Z" />
      </g>

      <g class="memepop-city-front">
        <path d="M0 168 L44 168 L44 330 L0 330 Z" />
        <path d="M52 124 L156 154 L156 330 L52 330 Z" />
        <path d="M166 220 L238 220 L238 330 L166 330 Z" />
        <path d="M244 256 L300 256 L300 330 L244 330 Z" />
        <path d="M900 252 L956 252 L956 330 L900 330 Z" />
        <path d="M964 224 L1038 224 L1038 330 L964 330 Z" />
        <path d="M1048 154 L1152 124 L1152 330 L1048 330 Z" />
        <path d="M1160 170 L1200 170 L1200 330 L1160 330 Z" />
      </g>

      <g class="memepop-city-roofs">
        <path d="M62 126 L154 152 L154 164 L62 138 Z" />
        <path d="M74 98 L144 118 L144 146 L74 126 Z" />
        <path d="M178 186 L214 186 L214 220 L178 220 Z" />
        <path d="M187 166 L205 166 L205 186 L187 186 Z" />
        <path d="M1070 126 L1142 104 L1142 126 L1070 148 Z" />
        <path d="M1078 78 L1136 60 L1136 104 L1078 122 Z" />
        <path d="M998 194 L1030 194 L1030 224 L998 224 Z" />
      </g>

      <g class="memepop-city-lines">
        <path d="M52 154 L156 184 M52 188 L156 218 M52 222 L156 252 M52 256 L156 286" />
        <path d="M1048 184 L1152 154 M1048 218 L1152 188 M1048 252 L1152 222 M1048 286 L1152 256" />
        <path d="M42 164 L150 164 M976 204 L1102 204" />
      </g>

      <g class="memepop-city-windows">
        <path d="M16 198 L30 198 L30 216 L16 216 Z M16 236 L30 236 L30 254 L16 254 Z M68 184 L82 188 L82 208 L68 204 Z M102 194 L116 198 L116 218 L102 214 Z M68 230 L82 234 L82 254 L68 250 Z M102 240 L116 244 L116 264 L102 260 Z M178 240 L190 240 L190 258 L178 258 Z M206 240 L218 240 L218 258 L206 258 Z M178 278 L190 278 L190 296 L178 296 Z M206 278 L218 278 L218 296 L206 296 Z" />
        <path d="M1084 184 L1098 180 L1098 200 L1084 204 Z M1118 174 L1132 170 L1132 190 L1118 194 Z M1084 230 L1098 226 L1098 246 L1084 250 Z M1118 220 L1132 216 L1132 236 L1118 240 Z M1172 200 L1186 200 L1186 218 L1172 218 Z M1172 242 L1186 242 L1186 260 L1172 260 Z M982 246 L994 246 L994 264 L982 264 Z M1012 246 L1024 246 L1024 264 L1012 264 Z M982 284 L994 284 L994 302 L982 302 Z M1012 284 L1024 284 L1024 302 L1012 302 Z" />
      </g>

      <g class="memepop-city-details">
        <path d="M92 96 L92 74 M124 110 L124 88 M86 74 L132 88" />
        <path d="M196 166 L196 142 M188 142 L204 142" />
        <path d="M1112 70 L1112 46 M1088 78 L1134 62" />
        <path d="M1014 194 L1014 172 M1006 172 L1022 172" />
      </g>
    </svg>
  `;

  const webLayer = document.createElement("div");
  webLayer.className = "memepop-default-web-layer";

  for (let index = 1; index <= 8; index += 1) {
    const strand = document.createElement("span");
    strand.className = `memepop-default-web-strand memepop-default-web-strand-${index}`;
    webLayer.append(strand);
  }

  for (let index = 1; index <= 4; index += 1) {
    const spider = document.createElement("span");
    spider.className = `memepop-default-spider memepop-default-spider-${index}`;
    webLayer.append(spider);
  }

  const acrobat = document.createElement("span");
  acrobat.className = "memepop-default-web-acrobat";

  const acrobatArtUrl = getExtensionUrl("assets/decor/web-acrobat.svg");

  if (acrobatArtUrl) {
    const acrobatArt = document.createElement("img");
    acrobatArt.className = "memepop-default-web-acrobat-art";
    acrobatArt.src = acrobatArtUrl;
    acrobatArt.alt = "";
    acrobatArt.decoding = "async";
    acrobat.classList.add("memepop-default-web-acrobat-has-art");
    acrobatArt.addEventListener("error", () => {
      acrobat.classList.remove("memepop-default-web-acrobat-has-art");
      acrobatArt.remove();
    });
    acrobat.append(acrobatArt);
  }

  const rope = document.createElement("span");
  rope.className = "memepop-default-web-rope";

  const body = document.createElement("span");
  body.className = "memepop-default-web-body";

  const head = document.createElement("span");
  head.className = "memepop-default-web-head";

  const mask = document.createElement("span");
  mask.className = "memepop-default-web-mask";

  const leftArm = document.createElement("span");
  leftArm.className = "memepop-default-web-limb memepop-default-web-arm-left";

  const rightArm = document.createElement("span");
  rightArm.className = "memepop-default-web-limb memepop-default-web-arm-right";

  const leftLeg = document.createElement("span");
  leftLeg.className = "memepop-default-web-limb memepop-default-web-leg-left";

  const rightLeg = document.createElement("span");
  rightLeg.className = "memepop-default-web-limb memepop-default-web-leg-right";

  head.append(mask);
  acrobat.append(rope, leftArm, rightArm, leftLeg, rightLeg, body, head);

  const phew = document.createElement("span");
  phew.className = "memepop-default-phew";
  phew.textContent = "PHEW!";

  stage.append(city, webLayer, acrobat, phew);
  return stage;
}

function createPartyStage(): HTMLElement {
  const stage = document.createElement("div");
  stage.className = "memepop-party-stage";
  stage.setAttribute("aria-hidden", "true");

  const title = document.createElement("div");
  title.className = "memepop-party-title";
  title.textContent = "Party Mode";

  const discoWrap = document.createElement("div");
  discoWrap.className = "memepop-disco-ball-wrap";

  const discoBallUrl = getExtensionUrl("assets/party/disco-ball.svg");

  if (discoBallUrl) {
    const discoBall = document.createElement("img");
    discoBall.className = "memepop-disco-ball";
    discoBall.src = discoBallUrl;
    discoBall.alt = "";
    discoBall.decoding = "async";
    discoBall.addEventListener("error", () => {
      discoWrap.classList.add("memepop-disco-fallback");
      discoBall.remove();
    });
    discoWrap.append(discoBall);
  } else {
    discoWrap.classList.add("memepop-disco-fallback");
  }

  const confettiLayer = document.createElement("div");
  confettiLayer.className = "memepop-party-sky-confetti";

  for (let index = 1; index <= 42; index += 1) {
    const confetti = document.createElement("span");
    confetti.className = `memepop-party-sky-confetti-piece memepop-party-sky-confetti-${index}`;
    confettiLayer.append(confetti);
  }

  const sparkleLayer = document.createElement("div");
  sparkleLayer.className = "memepop-party-card-sparkles";

  for (let index = 1; index <= 24; index += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = `memepop-party-card-sparkle memepop-party-card-sparkle-${index}`;
    sparkleLayer.append(sparkle);
  }

  stage.append(title, discoWrap, confettiLayer, sparkleLayer);
  return stage;
}

function createChillStage(): HTMLElement {
  const stage = document.createElement("div");
  stage.className = "memepop-chill-stage";
  stage.setAttribute("aria-hidden", "true");

  const title = document.createElement("div");
  title.className = "memepop-chill-title";
  title.textContent = "Chill Mode";

  const sun = document.createElement("span");
  sun.className = "memepop-chill-sun";

  const leftPalm = document.createElement("span");
  leftPalm.className = "memepop-chill-palm memepop-chill-palm-left";

  const rightPalm = document.createElement("span");
  rightPalm.className = "memepop-chill-palm memepop-chill-palm-right";

  const surfboard = document.createElement("span");
  surfboard.className = "memepop-chill-surfboard";

  const boat = document.createElement("span");
  boat.className = "memepop-chill-boat";

  const flowers = document.createElement("span");
  flowers.className = "memepop-chill-flowers";

  const quest = document.createElement("span");
  quest.className = "memepop-chill-quest";
  quest.textContent = "Today's Quest: Relax & Recharge";

  stage.append(title, sun, leftPalm, rightPalm, surfboard, boat, flowers, quest);
  return stage;
}

function createBelieveStage(): HTMLElement {
  const stage = document.createElement("div");
  stage.className = "memepop-believe-stage";
  stage.setAttribute("aria-hidden", "true");

  const title = document.createElement("div");
  title.className = "memepop-believe-title";
  title.textContent = "Believe Mode";

  const subtitle = document.createElement("div");
  subtitle.className = "memepop-believe-subtitle";
  subtitle.textContent = "You're stronger than you think. Keep believing in yourself!";

  const neon = document.createElement("span");
  neon.className = "memepop-believe-neon";
  neon.textContent = "You've Got This!";

  const heartLight = document.createElement("span");
  heartLight.className = "memepop-believe-heart-light";

  const shelf = document.createElement("span");
  shelf.className = "memepop-believe-shelf";

  const lamp = document.createElement("span");
  lamp.className = "memepop-believe-lamp";

  const cup = document.createElement("span");
  cup.className = "memepop-believe-cup";

  const stringLights = document.createElement("span");
  stringLights.className = "memepop-believe-string-lights";

  const leftCorner = document.createElement("span");
  leftCorner.className = "memepop-believe-corner memepop-believe-corner-left";

  const rightCorner = document.createElement("span");
  rightCorner.className = "memepop-believe-corner memepop-believe-corner-right";

  const pendulum = document.createElement("span");
  pendulum.className = "memepop-believe-pendulum";

  const clockFace = document.createElement("span");
  clockFace.className = "memepop-believe-pendulum-face";

  const clockHands = document.createElement("span");
  clockHands.className = "memepop-believe-pendulum-hands";

  const clockBob = document.createElement("span");
  clockBob.className = "memepop-believe-pendulum-bob";

  const timeNote = document.createElement("span");
  timeNote.className = "memepop-believe-time-note";
  timeNote.textContent = "One moment at a time";

  clockFace.append(clockHands);
  pendulum.append(clockFace, clockBob);
  rightCorner.append(pendulum, timeNote);

  const notes = document.createElement("div");
  notes.className = "memepop-believe-notes";

  for (const noteText of ["Dream Big", "Progress Over Perfection", "Be You", "Small steps every day", "Trust your journey", "Keep going!"]) {
    const note = document.createElement("span");
    note.textContent = noteText;
    notes.append(note);
  }

  const quest = document.createElement("span");
  quest.className = "memepop-believe-quest";
  quest.textContent = "Today's Quest: Believe & Begin";

  stage.append(title, subtitle, neon, heartLight, shelf, lamp, cup, stringLights, leftCorner, rightCorner, notes, quest);
  return stage;
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

  for (let index = 1; index <= 10; index += 1) {
    const balloon = document.createElement("span");
    balloon.className = `memepop-balloon memepop-balloon-${index}`;
    effects.append(balloon);
  }

  return effects;
}

function createCardConfetti(): HTMLElement {
  const confettiLayer = document.createElement("div");
  confettiLayer.className = "memepop-card-confetti";
  confettiLayer.setAttribute("aria-hidden", "true");

  for (let index = 1; index <= 32; index += 1) {
    const confetti = document.createElement("span");
    const side = index % 2 === 0 ? "right" : "left";
    confetti.className = `memepop-confetti memepop-confetti-burst memepop-confetti-${side} memepop-confetti-${index}`;
    confettiLayer.append(confetti);
  }

  return confettiLayer;
}

function configureEntranceSequence(root: HTMLElement, character: HTMLElement, shell: HTMLElement): void {
  clearTimer(entranceTimer);
  clearTimer(shellTimer);
  clearPartyEntranceTimers();
  root.classList.remove(
    "memepop-entrance-sequenced",
    "memepop-drop-supported",
    "memepop-walk-supported",
    "memepop-shell-visible",
    "memepop-sequence-complete",
    "memepop-party-sequence",
    "memepop-party-gradient-visible",
    "memepop-party-disco-visible",
    "memepop-party-confetti-visible",
    "memepop-party-character-start"
  );

  const usesDrop = shouldUseDropSequence();
  const usesPartySequence = root.classList.contains("memepop-accessory-partyHat");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    clearPartyEntranceTimers();

    if (usesPartySequence) {
      root.classList.add(
        "memepop-party-gradient-visible",
        "memepop-party-disco-visible",
        "memepop-party-confetti-visible",
        "memepop-party-character-start"
      );
    }

    root.classList.add("memepop-shell-visible");
    shellTimer = window.setTimeout(finishShell, 700);
  };

  applyEntranceModeClass(root);

  if (usesPartySequence) {
    root.classList.add("memepop-party-sequence", "memepop-party-gradient-visible");

    if (reduceMotion) {
      root.classList.add("memepop-party-disco-visible", "memepop-party-confetti-visible", "memepop-party-character-start");
    } else {
      partyDiscoTimer = window.setTimeout(() => {
        root.classList.add("memepop-party-disco-visible");
      }, 420);
      partyConfettiTimer = window.setTimeout(() => {
        root.classList.add("memepop-party-confetti-visible");
      }, 1180);
      partyCharacterTimer = window.setTimeout(() => {
        root.classList.add("memepop-party-character-start");
      }, 1550);
    }
  }

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

  entranceTimer = window.setTimeout(finishEntrance, usesPartySequence ? (reduceMotion ? 1200 : 4400) : usesDrop ? 1400 : 2600);
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

  const defaultWebStage = createDefaultWebStage();
  const chillStage = createChillStage();
  const believeStage = createBelieveStage();
  const partyStage = createPartyStage();
  const splash = createHydrationSplash();
  const partyEffects = createPartyEffects();

  const card = document.createElement("div");
  card.className = "memepop-card";

  const shell = document.createElement("div");
  shell.className = "memepop-card-shell";
  shell.setAttribute("aria-hidden", "true");

  const cardConfetti = createCardConfetti();

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

  const accessory = document.createElement("span");
  accessory.className = "memepop-accessory";
  accessory.setAttribute("aria-hidden", "true");

  characterButton.append(image, hydrationArm, hydrationCup, accessory);

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

  const modeLabel = document.createElement("span");
  modeLabel.className = "memepop-mode-label";
  modeLabel.textContent = getCurrentModeLabel();

  card.append(shell, cardConfetti, controls, countdown, characterButton, bubble, modeLabel, reward);
  root.append(defaultWebStage, chillStage, believeStage, partyStage, splash, partyEffects, card);

  rootElement = root;
  cardElement = card;
  messageElement = messageText;
  countdownElement = countdown;
  modeLabelElement = modeLabel;
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

    const previousModeKey = getModeSettingsKey(appState.settings);
    appState = MemePop.normalizeState(changes[MemePop.STATE_KEY].newValue);
    updateAccessoryClass();
    updateThemeClass();

    if (rootElement && previousModeKey !== getModeSettingsKey(appState.settings)) {
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
