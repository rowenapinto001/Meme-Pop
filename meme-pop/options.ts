const optionsEnabledInput = document.querySelector<HTMLInputElement>("#enabledInput");
const optionsDndInput = document.querySelector<HTMLInputElement>("#dndInput");
const optionsThemeSelect = document.querySelector<HTMLSelectElement>("#themeSelect");
const optionsAppearanceMinutesInput = document.querySelector<HTMLInputElement>("#appearanceMinutesInput");
const optionsBreakMinutesInput = document.querySelector<HTMLInputElement>("#breakMinutesInput");
const optionsTargetSitesInput = document.querySelector<HTMLTextAreaElement>("#targetSitesInput");
const optionsCoinCount = document.querySelector<HTMLElement>("#coinCount");
const optionsStreakCount = document.querySelector<HTMLElement>("#streakCount");
const optionsLongestStreak = document.querySelector<HTMLElement>("#longestStreak");
const resetPositionButton = document.querySelector<HTMLButtonElement>("#resetPositionButton");
const clearMuteButton = document.querySelector<HTMLButtonElement>("#clearMuteButton");
const optionsStatusText = document.querySelector<HTMLElement>("#statusText");

let optionsState: MemePop.AppState = MemePop.normalizeState(undefined);
let optionsStatusTimer: number | undefined;

function setOptionsStatus(message: string): void {
  if (!optionsStatusText) {
    return;
  }

  window.clearTimeout(optionsStatusTimer);
  optionsStatusText.textContent = message;
  optionsStatusTimer = window.setTimeout(() => {
    optionsStatusText.textContent = "";
  }, 3000);
}

function renderOptions(): void {
  if (optionsEnabledInput) {
    optionsEnabledInput.checked = optionsState.settings.enabled;
  }

  if (optionsDndInput) {
    optionsDndInput.checked = optionsState.settings.doNotDisturb;
  }

  if (optionsAppearanceMinutesInput) {
    optionsAppearanceMinutesInput.value = String(optionsState.settings.appearanceMinutes);
  }

  if (optionsBreakMinutesInput) {
    optionsBreakMinutesInput.value = String(optionsState.settings.breakMinutes);
  }

  if (optionsTargetSitesInput) {
    optionsTargetSitesInput.value = MemePop.targetSitesToText(optionsState.settings.targetSites);
  }

  if (optionsThemeSelect) {
    optionsThemeSelect.value = optionsState.settings.theme;
  }

  if (optionsCoinCount) {
    optionsCoinCount.textContent = `Meme Coins: ${optionsState.wallet.coins}`;
  }

  if (optionsStreakCount) {
    optionsStreakCount.textContent = `Current streak: ${optionsState.streak.current}`;
  }

  if (optionsLongestStreak) {
    optionsLongestStreak.textContent = `Longest streak: ${optionsState.streak.longest}`;
  }
}

async function saveOptions(): Promise<void> {
  optionsState = await MemePop.updateState((state) => {
    state.settings.enabled = optionsEnabledInput?.checked ?? state.settings.enabled;
    state.settings.doNotDisturb = optionsDndInput?.checked ?? state.settings.doNotDisturb;
    state.settings.theme = (optionsThemeSelect?.value as MemePop.Theme | undefined) ?? state.settings.theme;
    state.settings.appearanceMinutes = MemePop.clampSettingMinutes(
      optionsAppearanceMinutesInput?.value,
      state.settings.appearanceMinutes
    );
    state.settings.breakMinutes = MemePop.clampSettingMinutes(optionsBreakMinutesInput?.value, state.settings.breakMinutes);
    state.settings.targetSites = MemePop.normalizeTargetSites(optionsTargetSitesInput?.value ?? state.settings.targetSites);
  });
  renderOptions();
  setOptionsStatus("Settings saved.");
}

optionsEnabledInput?.addEventListener("change", () => void saveOptions());
optionsDndInput?.addEventListener("change", () => void saveOptions());
optionsThemeSelect?.addEventListener("change", () => void saveOptions());
optionsAppearanceMinutesInput?.addEventListener("change", () => void saveOptions());
optionsBreakMinutesInput?.addEventListener("change", () => void saveOptions());
optionsTargetSitesInput?.addEventListener("change", () => void saveOptions());

resetPositionButton?.addEventListener("click", () => {
  void MemePop.updateState((state) => {
    state.position = { x: null, y: null };
  }).then((state) => {
    optionsState = state;
    renderOptions();
    setOptionsStatus("Character position reset.");
  });
});

clearMuteButton?.addEventListener("click", () => {
  void MemePop.updateState((state) => {
    state.settings.mutedUntil = 0;
  }).then((state) => {
    optionsState = state;
    renderOptions();
    setOptionsStatus("Temporary mute cleared.");
  });
});

chrome.storage.onChanged.addListener((changes: Record<string, { newValue?: Partial<MemePop.AppState> }>, areaName: string) => {
  if (areaName !== "local" || !changes[MemePop.STATE_KEY]) {
    return;
  }

  optionsState = MemePop.normalizeState(changes[MemePop.STATE_KEY].newValue);
  renderOptions();
});

document.addEventListener("DOMContentLoaded", () => {
  void MemePop.readState().then((state) => {
    optionsState = state;
    renderOptions();
  });
});
