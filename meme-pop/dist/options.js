"use strict";
const optionsEnabledInput = document.querySelector("#enabledInput");
const optionsDndInput = document.querySelector("#dndInput");
const optionsThemeSelect = document.querySelector("#themeSelect");
const optionsFrequencySelect = document.querySelector("#frequencySelect");
const optionsCoinCount = document.querySelector("#coinCount");
const optionsStreakCount = document.querySelector("#streakCount");
const optionsLongestStreak = document.querySelector("#longestStreak");
const resetPositionButton = document.querySelector("#resetPositionButton");
const clearMuteButton = document.querySelector("#clearMuteButton");
const optionsStatusText = document.querySelector("#statusText");
let optionsState = MemePop.normalizeState(undefined);
let optionsStatusTimer;
function setOptionsStatus(message) {
    if (!optionsStatusText) {
        return;
    }
    window.clearTimeout(optionsStatusTimer);
    optionsStatusText.textContent = message;
    optionsStatusTimer = window.setTimeout(() => {
        optionsStatusText.textContent = "";
    }, 3000);
}
function renderOptions() {
    if (optionsEnabledInput) {
        optionsEnabledInput.checked = optionsState.settings.enabled;
    }
    if (optionsDndInput) {
        optionsDndInput.checked = optionsState.settings.doNotDisturb;
    }
    if (optionsFrequencySelect) {
        optionsFrequencySelect.value = optionsState.settings.frequency;
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
async function saveOptions() {
    optionsState = await MemePop.updateState((state) => {
        state.settings.enabled = optionsEnabledInput?.checked ?? state.settings.enabled;
        state.settings.doNotDisturb = optionsDndInput?.checked ?? state.settings.doNotDisturb;
        state.settings.theme = optionsThemeSelect?.value ?? state.settings.theme;
        state.settings.frequency = optionsFrequencySelect?.value ?? state.settings.frequency;
    });
    renderOptions();
    setOptionsStatus("Settings saved.");
}
optionsEnabledInput?.addEventListener("change", () => void saveOptions());
optionsDndInput?.addEventListener("change", () => void saveOptions());
optionsThemeSelect?.addEventListener("change", () => void saveOptions());
optionsFrequencySelect?.addEventListener("change", () => void saveOptions());
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
chrome.storage.onChanged.addListener((changes, areaName) => {
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
