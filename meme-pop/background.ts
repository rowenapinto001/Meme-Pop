type BackgroundTheme = "random" | "office" | "coding" | "studying" | "gaming";

type BackgroundSettings = {
  enabled: boolean;
  theme: BackgroundTheme;
  intervalSeconds: number;
  soundEnabled: boolean;
};

const BACKGROUND_DEFAULT_SETTINGS: BackgroundSettings = {
  enabled: true,
  theme: "random",
  intervalSeconds: 180,
  soundEnabled: false
};

const BACKGROUND_VALID_THEMES: BackgroundTheme[] = ["random", "office", "coding", "studying", "gaming"];
const BACKGROUND_VALID_INTERVALS = [10, 60, 180, 300, 600];

function normalizeBackgroundSettings(raw: Partial<BackgroundSettings> | undefined): BackgroundSettings {
  const theme = raw?.theme && BACKGROUND_VALID_THEMES.includes(raw.theme) ? raw.theme : BACKGROUND_DEFAULT_SETTINGS.theme;
  const intervalSeconds =
    raw?.intervalSeconds && BACKGROUND_VALID_INTERVALS.includes(raw.intervalSeconds)
      ? raw.intervalSeconds
      : BACKGROUND_DEFAULT_SETTINGS.intervalSeconds;

  return {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : BACKGROUND_DEFAULT_SETTINGS.enabled,
    theme,
    intervalSeconds,
    soundEnabled: typeof raw?.soundEnabled === "boolean" ? raw.soundEnabled : BACKGROUND_DEFAULT_SETTINGS.soundEnabled
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("memePopSettings", (result: { memePopSettings?: Partial<BackgroundSettings> }) => {
    const settings = result.memePopSettings
      ? normalizeBackgroundSettings(result.memePopSettings)
      : BACKGROUND_DEFAULT_SETTINGS;

    chrome.storage.local.set({ memePopSettings: settings });
  });
});
