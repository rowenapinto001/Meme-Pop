namespace MemePop {
  export type Frequency = "off" | "rare" | "normal" | "frequent";
  export type Theme =
    | "random"
    | "focus"
    | "break"
    | "motivation"
    | "procrastination"
    | "lateNight"
    | "social"
    | "studying"
    | "gaming"
    | "office"
    | "coding"
    | "hydration";
  export type AccessoryId = "none" | "partyHat" | "sunglasses" | "crown";
  export type MessageCategory =
    | "general"
    | "focusMode"
    | "breakTime"
    | "motivationMode"
    | "procrastinationMode"
    | "lateNightMode"
    | "socialMode"
    | "office"
    | "studying"
    | "coding"
    | "gaming"
    | "hydration"
    | "videos"
    | "shopping"
    | "lateNight"
    | "motivation"
    | "procrastination"
    | "social";

  export type CharacterPosition = {
    x: number | null;
    y: number | null;
  };

  export type FocusState = {
    active: boolean;
    durationMinutes: number;
    startedAt: number;
    endsAt: number;
  };

  export type Settings = {
    enabled: boolean;
    theme: Theme;
    frequency: Frequency;
    soundEnabled: boolean;
    doNotDisturb: boolean;
    mutedUntil: number;
    accessory: AccessoryId;
  };

  export type Wallet = {
    coins: number;
    lastClickCoinAt: number;
    lastDailyVisitDate: string;
  };

  export type Streak = {
    current: number;
    longest: number;
    lastActiveDate: string;
  };

  export type AppState = {
    settings: Settings;
    wallet: Wallet;
    streak: Streak;
    focus: FocusState;
    position: CharacterPosition;
    unlockedAccessories: AccessoryId[];
  };

  export type MessageItem = {
    id: string;
    category: MessageCategory;
    text: string;
  };

  export type Accessory = {
    id: AccessoryId;
    name: string;
    price: number;
    description: string;
  };

  export const STATE_KEY = "memePopState";
  export const CLICK_COIN_COOLDOWN_MS = 15000;
  export const AUTO_HIDE_MIN_MS = 6000;
  export const AUTO_HIDE_MAX_MS = 10000;

  export const ACCESSORIES: Accessory[] = [
    { id: "none", name: "No accessory", price: 0, description: "Classic MemePop energy." },
    { id: "partyHat", name: "Party hat", price: 20, description: "For tiny celebrations." },
    { id: "sunglasses", name: "Sunglasses", price: 40, description: "Maximum cool, minimum effort." },
    { id: "crown", name: "Tiny crown", price: 60, description: "A royal amount of silliness." }
  ];

  export const DEFAULT_STATE: AppState = {
    settings: {
      enabled: true,
      theme: "random",
      frequency: "normal",
      soundEnabled: false,
      doNotDisturb: false,
      mutedUntil: 0,
      accessory: "none"
    },
    wallet: {
      coins: 0,
      lastClickCoinAt: 0,
      lastDailyVisitDate: ""
    },
    streak: {
      current: 0,
      longest: 0,
      lastActiveDate: ""
    },
    focus: {
      active: false,
      durationMinutes: 25,
      startedAt: 0,
      endsAt: 0
    },
    position: {
      x: null,
      y: null
    },
    unlockedAccessories: ["none"]
  };

  export const MESSAGES: MessageItem[] = [
    { id: "general-1", category: "general", text: "MemePop has entered the tab." },
    { id: "general-2", category: "general", text: "Scrolling with purpose. Allegedly." },
    { id: "general-3", category: "general", text: "This page looks important. I will hover respectfully." },
    { id: "general-4", category: "general", text: "Tiny browser buddy reporting for duty." },
    { id: "general-5", category: "general", text: "I brought good vibes and no useful paperwork." },
    { id: "general-6", category: "general", text: "Tab count status: emotionally complex." },
    { id: "general-7", category: "general", text: "MemePop is silently judging the refresh button." },
    { id: "general-8", category: "general", text: "This is your scheduled micro-silliness." },
    { id: "general-9", category: "general", text: "The browser is calm. Suspiciously calm." },
    { id: "general-10", category: "general", text: "A wild productivity thought appeared." },
    { id: "general-11", category: "general", text: "You look like someone who deserves a snack break." },
    { id: "general-12", category: "general", text: "MemePop approves this click. Probably." },
    { id: "general-13", category: "general", text: "Keep going. The tabs believe in you." },

    { id: "focus-mode-1", category: "focusMode", text: "Focus mode activated." },
    { id: "focus-mode-2", category: "focusMode", text: "The distractions can wait." },
    { id: "focus-mode-3", category: "focusMode", text: "You have this." },
    { id: "focus-mode-4", category: "focusMode", text: "Stay with the task." },
    { id: "focus-mode-5", category: "focusMode", text: "Five more focused minutes." },
    { id: "focus-mode-6", category: "focusMode", text: "Focus session complete. Tiny victory achieved." },

    { id: "break-time-1", category: "breakTime", text: "Your eyes need a screen break." },
    { id: "break-time-2", category: "breakTime", text: "Stand up before becoming furniture." },
    { id: "break-time-3", category: "breakTime", text: "Stretch those shoulders." },
    { id: "break-time-4", category: "breakTime", text: "Look at something far away." },
    { id: "break-time-5", category: "breakTime", text: "Walk around for two minutes." },
    { id: "break-time-6", category: "breakTime", text: "Rest is part of productivity." },

    { id: "motivation-mode-1", category: "motivationMode", text: "You are doing better than you think." },
    { id: "motivation-mode-2", category: "motivationMode", text: "Start small. Keep going." },
    { id: "motivation-mode-3", category: "motivationMode", text: "Progress does not need to be perfect." },
    { id: "motivation-mode-4", category: "motivationMode", text: "One task at a time." },
    { id: "motivation-mode-5", category: "motivationMode", text: "Today still has potential." },
    { id: "motivation-mode-6", category: "motivationMode", text: "MemePop believes in you." },

    { id: "procrastination-mode-1", category: "procrastinationMode", text: "Interesting. This is not the task." },
    { id: "procrastination-mode-2", category: "procrastinationMode", text: "You came here for five minutes." },
    { id: "procrastination-mode-3", category: "procrastinationMode", text: "The assignment is still waiting." },
    { id: "procrastination-mode-4", category: "procrastinationMode", text: "Productivity has left the browser." },
    { id: "procrastination-mode-5", category: "procrastinationMode", text: "Should we return to work?" },
    { id: "procrastination-mode-6", category: "procrastinationMode", text: "MemePop caught you procrastinating." },

    { id: "late-night-mode-1", category: "lateNightMode", text: "Why are we still awake?" },
    { id: "late-night-mode-2", category: "lateNightMode", text: "Tomorrow-you will remember this." },
    { id: "late-night-mode-3", category: "lateNightMode", text: "Sleep is a free productivity upgrade." },
    { id: "late-night-mode-4", category: "lateNightMode", text: "One more scroll is never one more scroll." },
    { id: "late-night-mode-5", category: "lateNightMode", text: "Your pillow misses you." },
    { id: "late-night-mode-6", category: "lateNightMode", text: "MemePop recommends bedtime." },

    { id: "social-mode-1", category: "socialMode", text: "The scroll has no ending." },
    { id: "social-mode-2", category: "socialMode", text: "You have seen enough posts." },
    { id: "social-mode-3", category: "socialMode", text: "Time disappeared again." },
    { id: "social-mode-4", category: "socialMode", text: "MemePop suggests touching grass." },
    { id: "social-mode-5", category: "socialMode", text: "That comment section looks dangerous." },
    { id: "social-mode-6", category: "socialMode", text: "Close the tab while you still can." },

    { id: "office-1", category: "office", text: "That meeting could have been a snack." },
    { id: "office-2", category: "office", text: "Spreadsheet opened. Confidence pending." },
    { id: "office-3", category: "office", text: "Pretending to look busy: advanced mode." },
    { id: "office-4", category: "office", text: "Inbox says hello. MemePop says later." },
    { id: "office-5", category: "office", text: "Professional tiny chaos has arrived." },
    { id: "office-6", category: "office", text: "This tab needs a coffee and a boundary." },
    { id: "office-7", category: "office", text: "Calendar invite detected. Emotional support deployed." },

    { id: "study-1", category: "studying", text: "Academic comeback loading." },
    { id: "study-2", category: "studying", text: "One more chapter. Maybe two if the font is big." },
    { id: "study-3", category: "studying", text: "Your notes are trying their best." },
    { id: "study-4", category: "studying", text: "Highlighting counts as emotional support." },
    { id: "study-5", category: "studying", text: "Tiny progress is still progress." },
    { id: "study-6", category: "studying", text: "The syllabus cannot hurt you from here." },
    { id: "study-7", category: "studying", text: "Focus mode is warming up." },
    { id: "study-8", category: "studying", text: "Remembering things would be convenient." },
    { id: "study-9", category: "studying", text: "This paragraph has main character energy." },
    { id: "study-10", category: "studying", text: "Study break scheduled by vibes only." },
    { id: "study-11", category: "studying", text: "Your future self is nodding politely." },
    { id: "study-12", category: "studying", text: "Brain loading. Please keep snacks nearby." },
    { id: "study-13", category: "studying", text: "The assignment fears your tiny momentum." },

    { id: "coding-1", category: "coding", text: "That bug lives here now." },
    { id: "coding-2", category: "coding", text: "It worked yesterday. A classic." },
    { id: "coding-3", category: "coding", text: "One tiny fix. Famous last words." },
    { id: "coding-4", category: "coding", text: "The semicolon is watching." },
    { id: "coding-5", category: "coding", text: "Console logs are emotional breadcrumbs." },
    { id: "coding-6", category: "coding", text: "The build passed. Everyone stay calm." },
    { id: "coding-7", category: "coding", text: "This function has seen things." },
    { id: "coding-8", category: "coding", text: "Naming variables: the final boss." },
    { id: "coding-9", category: "coding", text: "Refactor gently. The code is shy." },
    { id: "coding-10", category: "coding", text: "Cache said no." },
    { id: "coding-11", category: "coding", text: "Have you tried asking the rubber duck nicely?" },
    { id: "coding-12", category: "coding", text: "Debugging is just detective work with snacks." },
    { id: "coding-13", category: "coding", text: "The bug vanished when you opened DevTools." },

    { id: "gaming-1", category: "gaming", text: "Just one more round. Very scientific." },
    { id: "gaming-2", category: "gaming", text: "That was totally lag." },
    { id: "gaming-3", category: "gaming", text: "Victory is loading." },
    { id: "gaming-4", category: "gaming", text: "Inventory full. Brain also full." },
    { id: "gaming-5", category: "gaming", text: "Boss fight energy detected." },
    { id: "gaming-6", category: "gaming", text: "MemePop believes in the comeback." },
    { id: "gaming-7", category: "gaming", text: "Respawn with snacks." },

    { id: "hydration-1", category: "hydration", text: "Hydration break! MemePop brought water." },
    { id: "hydration-2", category: "hydration", text: "Tiny sip. Dramatic delivery." },
    { id: "hydration-3", category: "hydration", text: "Open mouth? Browser cup incoming." },
    { id: "hydration-4", category: "hydration", text: "Sip check: please accept this pixels-water." },
    { id: "hydration-5", category: "hydration", text: "MemePop is feeding you water responsibly." },
    { id: "hydration-6", category: "hydration", text: "Stay hydrated. Your tabs are cheering." },
    { id: "hydration-7", category: "hydration", text: "Water has entered the chat." },

    { id: "video-1", category: "videos", text: "One more video? Very believable." },
    { id: "video-2", category: "videos", text: "The autoplay button is feeling powerful." },
    { id: "video-3", category: "videos", text: "Your watch history has plot development." },
    { id: "video-4", category: "videos", text: "This counts as research if you squint." },
    { id: "video-5", category: "videos", text: "Episode energy detected." },
    { id: "video-6", category: "videos", text: "The thumbnail made a convincing argument." },
    { id: "video-7", category: "videos", text: "Snack synchronization recommended." },
    { id: "video-8", category: "videos", text: "The progress bar is moving faster than time." },
    { id: "video-9", category: "videos", text: "MemePop respects the pause button." },
    { id: "video-10", category: "videos", text: "Your attention span is buffering." },
    { id: "video-11", category: "videos", text: "Educational content, emotionally speaking." },
    { id: "video-12", category: "videos", text: "Plot twist: you still have responsibilities." },
    { id: "video-13", category: "videos", text: "The next video looks suspiciously next." },

    { id: "shopping-1", category: "shopping", text: "Do we really need that in the cart?" },
    { id: "shopping-2", category: "shopping", text: "Cart confidence level: decorative." },
    { id: "shopping-3", category: "shopping", text: "The sale tag is using persuasion magic." },
    { id: "shopping-4", category: "shopping", text: "Wishlist now, think later." },
    { id: "shopping-5", category: "shopping", text: "MemePop recommends a dramatic pause." },
    { id: "shopping-6", category: "shopping", text: "Free shipping is not a personality trait." },
    { id: "shopping-7", category: "shopping", text: "The cart is getting emotionally attached." },
    { id: "shopping-8", category: "shopping", text: "Reviews are just tiny shopping gossip." },
    { id: "shopping-9", category: "shopping", text: "That color does look very you." },
    { id: "shopping-10", category: "shopping", text: "Budget spreadsheet has entered the chat." },
    { id: "shopping-11", category: "shopping", text: "Maybe sleep on it. The cart can wait." },
    { id: "shopping-12", category: "shopping", text: "Add to cart? More like add to thoughts." },
    { id: "shopping-13", category: "shopping", text: "MemePop is not a financial advisor." },

    { id: "night-1", category: "lateNight", text: "Late-night browsing has mysterious lighting." },
    { id: "night-2", category: "lateNight", text: "Your pillow filed a missing person report." },
    { id: "night-3", category: "lateNight", text: "The clock is being dramatic again." },
    { id: "night-4", category: "lateNight", text: "This tab has midnight energy." },
    { id: "night-5", category: "lateNight", text: "Sleep mode is waving from far away." },
    { id: "night-6", category: "lateNight", text: "The moon said close three tabs." },
    { id: "night-7", category: "lateNight", text: "Tomorrow-you is taking notes." },
    { id: "night-8", category: "lateNight", text: "MemePop whispers: hydration." },
    { id: "night-9", category: "lateNight", text: "Browsing after midnight unlocks side quests." },
    { id: "night-10", category: "lateNight", text: "Tiny bedtime reminder, softly delivered." },
    { id: "night-11", category: "lateNight", text: "The tabs are sleepy too." },
    { id: "night-12", category: "lateNight", text: "Night mode cannot hide the time." },
    { id: "night-13", category: "lateNight", text: "One more search, then peace. Probably." },

    { id: "motivation-1", category: "motivation", text: "Tiny progress is still progress." },
    { id: "motivation-2", category: "motivation", text: "You are doing better than the loading spinner." },
    { id: "motivation-3", category: "motivation", text: "Small steps. Big sparkle." },
    { id: "motivation-4", category: "motivation", text: "MemePop believes in your next click." },
    { id: "motivation-5", category: "motivation", text: "The task is scared of your momentum." },
    { id: "motivation-6", category: "motivation", text: "Ten focused minutes can still win the day." },
    { id: "motivation-7", category: "motivation", text: "You showed up. That counts." },
    { id: "motivation-8", category: "motivation", text: "A calm tab is a powerful tab." },
    { id: "motivation-9", category: "motivation", text: "Deep breath. Click with confidence." },
    { id: "motivation-10", category: "motivation", text: "You can do one small thing now." },
    { id: "motivation-11", category: "motivation", text: "Momentum has tiny shoes." },
    { id: "motivation-12", category: "motivation", text: "Future-you sent a thumbs up." },
    { id: "motivation-13", category: "motivation", text: "That was progress. MemePop saw it." },

    { id: "procrastination-1", category: "procrastination", text: "Productivity has left the chat." },
    { id: "procrastination-2", category: "procrastination", text: "This delay has excellent branding." },
    { id: "procrastination-3", category: "procrastination", text: "The task is still there. Very loyal." },
    { id: "procrastination-4", category: "procrastination", text: "Five-minute break speedrun begins." },
    { id: "procrastination-5", category: "procrastination", text: "MemePop sees the side quest." },
    { id: "procrastination-6", category: "procrastination", text: "Avoidance level: cozy." },
    { id: "procrastination-7", category: "procrastination", text: "The deadline is stretching politely." },
    { id: "procrastination-8", category: "procrastination", text: "Maybe start with the tiniest piece." },
    { id: "procrastination-9", category: "procrastination", text: "A tab detour has occurred." },
    { id: "procrastination-10", category: "procrastination", text: "The plan is planning itself." },
    { id: "procrastination-11", category: "procrastination", text: "Your todo list is pretending not to stare." },
    { id: "procrastination-12", category: "procrastination", text: "Opening the doc counts as chapter one." },
    { id: "procrastination-13", category: "procrastination", text: "MemePop suggests a heroic return." },

    { id: "social-1", category: "social", text: "The feed is feeding." },
    { id: "social-2", category: "social", text: "Scroll responsibly, tiny legend." },
    { id: "social-3", category: "social", text: "That notification looked important. Rude." },
    { id: "social-4", category: "social", text: "MemePop brought a gentle reality check." },
    { id: "social-5", category: "social", text: "The timeline has opinions today." },
    { id: "social-6", category: "social", text: "Your thumb is on a journey." },
    { id: "social-7", category: "social", text: "A wholesome exit is still available." },
    { id: "social-8", category: "social", text: "The algorithm is wearing fancy shoes." },
    { id: "social-9", category: "social", text: "Comment section weather: cloudy." },
    { id: "social-10", category: "social", text: "A tiny break from the feed might sparkle." },
    { id: "social-11", category: "social", text: "MemePop is here for balance." },
    { id: "social-12", category: "social", text: "Scroll pause checkpoint reached." },
    { id: "social-13", category: "social", text: "Your attention deserves snacks and boundaries." }
  ];

  export const FOCUS_START_MESSAGES = [
    "Focus mode activated.",
    "The distractions can wait.",
    "You have this.",
    "Stay with the task.",
    "Five more focused minutes."
  ];

  export const FOCUS_DONE_MESSAGES = [
    "Focus session complete. Tiny victory achieved."
  ];

  export function normalizeState(raw: Partial<AppState> | undefined): AppState {
    const settings = (raw?.settings ?? {}) as Partial<Settings>;
    const wallet = (raw?.wallet ?? {}) as Partial<Wallet>;
    const streak = (raw?.streak ?? {}) as Partial<Streak>;
    const focus = (raw?.focus ?? {}) as Partial<FocusState>;
    const position = (raw?.position ?? {}) as Partial<CharacterPosition>;
    const unlockedAccessories = Array.isArray(raw?.unlockedAccessories)
      ? raw.unlockedAccessories.filter((item): item is AccessoryId => ACCESSORIES.some((accessoryItem) => accessoryItem.id === item))
      : DEFAULT_STATE.unlockedAccessories;
    const normalizedUnlocked = Array.from(new Set<AccessoryId>(["none", ...unlockedAccessories]));
    const requestedAccessory: AccessoryId =
      settings.accessory && ACCESSORIES.some((item) => item.id === settings.accessory) ? settings.accessory : "none";
    const accessory = normalizedUnlocked.includes(requestedAccessory) ? requestedAccessory : "none";
    const frequency: Frequency = ["off", "rare", "normal", "frequent"].includes(settings.frequency as string)
      ? (settings.frequency as Frequency)
      : DEFAULT_STATE.settings.frequency;
    const theme: Theme = [
      "random",
      "focus",
      "break",
      "motivation",
      "procrastination",
      "lateNight",
      "social",
      "studying",
      "gaming",
      "office",
      "coding",
      "hydration"
    ].includes(settings.theme as string)
      ? (settings.theme as Theme)
      : DEFAULT_STATE.settings.theme;

    return {
      settings: {
        enabled: typeof settings.enabled === "boolean" ? settings.enabled : DEFAULT_STATE.settings.enabled,
        theme,
        frequency,
        soundEnabled: typeof settings.soundEnabled === "boolean" ? settings.soundEnabled : DEFAULT_STATE.settings.soundEnabled,
        doNotDisturb: typeof settings.doNotDisturb === "boolean" ? settings.doNotDisturb : DEFAULT_STATE.settings.doNotDisturb,
        mutedUntil: typeof settings.mutedUntil === "number" ? Math.max(0, settings.mutedUntil) : DEFAULT_STATE.settings.mutedUntil,
        accessory
      },
      wallet: {
        coins: typeof wallet.coins === "number" ? Math.max(0, Math.floor(wallet.coins)) : DEFAULT_STATE.wallet.coins,
        lastClickCoinAt: typeof wallet.lastClickCoinAt === "number" ? Math.max(0, wallet.lastClickCoinAt) : 0,
        lastDailyVisitDate: typeof wallet.lastDailyVisitDate === "string" ? wallet.lastDailyVisitDate : ""
      },
      streak: {
        current: typeof streak.current === "number" ? Math.max(0, Math.floor(streak.current)) : 0,
        longest: typeof streak.longest === "number" ? Math.max(0, Math.floor(streak.longest)) : 0,
        lastActiveDate: typeof streak.lastActiveDate === "string" ? streak.lastActiveDate : ""
      },
      focus: {
        active: typeof focus.active === "boolean" ? focus.active : false,
        durationMinutes: typeof focus.durationMinutes === "number" ? Math.max(15, Math.floor(focus.durationMinutes)) : 25,
        startedAt: typeof focus.startedAt === "number" ? Math.max(0, focus.startedAt) : 0,
        endsAt: typeof focus.endsAt === "number" ? Math.max(0, focus.endsAt) : 0
      },
      position: {
        x: typeof position.x === "number" ? position.x : null,
        y: typeof position.y === "number" ? position.y : null
      },
      unlockedAccessories: normalizedUnlocked
    };
  }

  export function readState(): Promise<AppState> {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(STATE_KEY, (result: Record<string, Partial<AppState> | undefined>) => {
          if (chrome.runtime.lastError) {
            resolve(normalizeState(undefined));
            return;
          }

          resolve(normalizeState(result[STATE_KEY]));
        });
      } catch {
        resolve(normalizeState(undefined));
      }
    });
  }

  export function writeState(state: AppState): Promise<AppState> {
    const normalized = normalizeState(state);

    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [STATE_KEY]: normalized }, () => {
          resolve(normalized);
        });
      } catch {
        resolve(normalized);
      }
    });
  }

  export async function updateState(mutator: (state: AppState) => AppState | void): Promise<AppState> {
    const state = await readState();
    const nextState = mutator(state) ?? state;
    return writeState(nextState);
  }

  export function todayKey(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  export function daysBetween(previous: string, current: string): number {
    if (!previous || !current) {
      return 0;
    }

    const previousDate = new Date(`${previous}T00:00:00`);
    const currentDate = new Date(`${current}T00:00:00`);
    return Math.round((currentDate.getTime() - previousDate.getTime()) / 86400000);
  }

  export function getRandomDelayMs(frequency: Frequency): number {
    const minute = 60000;

    if (frequency === "rare") {
      return randomBetween(15 * minute, 20 * minute);
    }

    if (frequency === "normal") {
      return randomBetween(7 * minute, 12 * minute);
    }

    if (frequency === "frequent") {
      return randomBetween(3 * minute, 6 * minute);
    }

    return 0;
  }

  export function randomBetween(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  export function isQuiet(state: AppState): boolean {
    const now = Date.now();
    const focusActive = state.focus.active && state.focus.endsAt > now;
    return (
      !state.settings.enabled ||
      state.settings.frequency === "off" ||
      state.settings.doNotDisturb ||
      state.settings.mutedUntil > now ||
      focusActive
    );
  }

  export function categoryForUrl(url: string): MessageCategory {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      return "general";
    }

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const hour = new Date().getHours();

    if (hour >= 23 || hour < 5) {
      return "lateNight";
    }

    if (host.includes("youtube") || host.includes("vimeo") || host.includes("netflix") || host.includes("twitch")) {
      return "videos";
    }

    if (
      host.includes("github") ||
      host.includes("stackoverflow") ||
      host.includes("gitlab") ||
      host.includes("developer") ||
      host.includes("npmjs")
    ) {
      return "coding";
    }

    if (
      host.includes("steam") ||
      host.includes("epicgames") ||
      host.includes("itch.io") ||
      host.includes("roblox") ||
      host.includes("xbox") ||
      host.includes("playstation")
    ) {
      return "gaming";
    }

    if (
      host.includes("docs.google") ||
      host.includes("sheets.google") ||
      host.includes("office") ||
      host.includes("notion") ||
      host.includes("slack") ||
      host.includes("teams")
    ) {
      return "office";
    }

    if (
      host.includes("coursera") ||
      host.includes("khanacademy") ||
      host.includes("edx") ||
      host.includes("quizlet") ||
      host.includes("duolingo") ||
      host.includes("wikipedia") ||
      path.includes("learn")
    ) {
      return "studying";
    }

    if (host.includes("amazon") || host.includes("shop") || host.includes("store") || host.includes("etsy") || host.includes("ebay")) {
      return "shopping";
    }

    if (
      host.includes("twitter") ||
      host.includes("x.com") ||
      host.includes("facebook") ||
      host.includes("instagram") ||
      host.includes("reddit") ||
      host.includes("tiktok") ||
      host.includes("linkedin")
    ) {
      return "social";
    }

    return Math.random() > 0.78 ? "motivation" : "general";
  }

  export function messagesForCategory(category: MessageCategory): MessageItem[] {
    const categoryMessages = MESSAGES.filter((message) => message.category === category);
    return categoryMessages.length > 0 ? categoryMessages : MESSAGES.filter((message) => message.category === "general");
  }

  export function pickMessage(category: MessageCategory, previous = ""): MessageItem {
    const pool = messagesForCategory(category);
    let choice = pool[Math.floor(Math.random() * pool.length)];

    if (pool.length > 1 && choice.text === previous) {
      const alternatives = pool.filter((message) => message.text !== previous);
      choice = alternatives[Math.floor(Math.random() * alternatives.length)];
    }

    return choice;
  }

  export function getAccessory(id: AccessoryId): Accessory {
    return ACCESSORIES.find((item) => item.id === id) ?? ACCESSORIES[0];
  }
}
