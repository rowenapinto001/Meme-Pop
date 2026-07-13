type PopupTheme = "random" | "office" | "coding" | "studying" | "gaming";

type PopupSettings = {
  enabled: boolean;
  theme: PopupTheme;
  intervalSeconds: number;
  soundEnabled: boolean;
};

const POPUP_DEFAULT_SETTINGS: PopupSettings = {
  enabled: true,
  theme: "random",
  intervalSeconds: 180,
  soundEnabled: false
};

const VALID_POPUP_THEMES: PopupTheme[] = ["random", "office", "coding", "studying", "gaming"];
const VALID_POPUP_INTERVALS = [10, 60, 180, 300, 600];

const enabledInput = document.querySelector<HTMLInputElement>("#enabled");
const themeSelect = document.querySelector<HTMLSelectElement>("#theme");
const intervalSelect = document.querySelector<HTMLSelectElement>("#intervalSeconds");
const soundInput = document.querySelector<HTMLInputElement>("#soundEnabled");
const settingsForm = document.querySelector<HTMLFormElement>("#settingsForm");
const showNowButton = document.querySelector<HTMLButtonElement>("#showNow");
const statusText = document.querySelector<HTMLParagraphElement>("#status");

let statusTimeout: number | undefined;

function normalizePopupSettings(raw: Partial<PopupSettings> | undefined): PopupSettings {
  const theme = raw?.theme && VALID_POPUP_THEMES.includes(raw.theme) ? raw.theme : POPUP_DEFAULT_SETTINGS.theme;
  const intervalSeconds =
    raw?.intervalSeconds && VALID_POPUP_INTERVALS.includes(raw.intervalSeconds)
      ? raw.intervalSeconds
      : POPUP_DEFAULT_SETTINGS.intervalSeconds;

  return {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : POPUP_DEFAULT_SETTINGS.enabled,
    theme,
    intervalSeconds,
    soundEnabled: typeof raw?.soundEnabled === "boolean" ? raw.soundEnabled : POPUP_DEFAULT_SETTINGS.soundEnabled
  };
}

function setStatus(message: string): void {
  if (!statusText) {
    return;
  }

  window.clearTimeout(statusTimeout);
  statusText.textContent = message;
  statusTimeout = window.setTimeout(() => {
    statusText.textContent = "";
  }, 3000);
}

function applySettingsToForm(settings: PopupSettings): void {
  if (enabledInput) {
    enabledInput.checked = settings.enabled;
  }

  if (themeSelect) {
    themeSelect.value = settings.theme;
  }

  if (intervalSelect) {
    intervalSelect.value = String(settings.intervalSeconds);
  }

  if (soundInput) {
    soundInput.checked = settings.soundEnabled;
  }
}

function readSettingsFromForm(): PopupSettings {
  return normalizePopupSettings({
    enabled: enabledInput?.checked ?? POPUP_DEFAULT_SETTINGS.enabled,
    theme: (themeSelect?.value as PopupTheme | undefined) ?? POPUP_DEFAULT_SETTINGS.theme,
    intervalSeconds: Number(intervalSelect?.value ?? POPUP_DEFAULT_SETTINGS.intervalSeconds),
    soundEnabled: soundInput?.checked ?? POPUP_DEFAULT_SETTINGS.soundEnabled
  });
}

function saveSettings(callback?: (settings: PopupSettings) => void): void {
  const settings = readSettingsFromForm();

  chrome.storage.local.set({ memePopSettings: settings }, () => {
    setStatus("Settings saved.");
    callback?.(settings);
  });
}

function loadSettings(): void {
  chrome.storage.local.get("memePopSettings", (result: { memePopSettings?: Partial<PopupSettings> }) => {
    applySettingsToForm(normalizePopupSettings(result.memePopSettings));
  });
}

function showMemeNow(settings: PopupSettings): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: Array<{ id?: number }>) => {
    const activeTab = tabs[0];

    if (!activeTab?.id) {
      setStatus("Open a normal webpage first.");
      return;
    }

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "MEME_POP_SHOW_NOW",
        settings
      },
      (response?: { ok?: boolean }) => {
        if (chrome.runtime.lastError) {
          setStatus("Open or reload a normal webpage first.");
          return;
        }

        setStatus(response?.ok ? "Meme popped." : "Could not show a meme here.");
      }
    );
  });
}

settingsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});

showNowButton?.addEventListener("click", () => {
  saveSettings((settings) => {
    showMemeNow(settings);
  });
});

document.addEventListener("DOMContentLoaded", loadSettings);
