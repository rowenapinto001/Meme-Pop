"use strict";
var MemePop;
(function (MemePop) {
    MemePop.STATE_KEY = "memePopState";
    MemePop.CLICK_COIN_COOLDOWN_MS = 15000;
    MemePop.AUTO_HIDE_MIN_MS = 6000;
    MemePop.AUTO_HIDE_MAX_MS = 10000;
    MemePop.ACCESSORIES = [
        { id: "none", name: "No accessory", price: 0, description: "Classic MemePop energy." },
        { id: "partyHat", name: "Party hat", price: 20, description: "For tiny celebrations." },
        { id: "sunglasses", name: "Sunglasses", price: 40, description: "Maximum cool, minimum effort." },
        { id: "crown", name: "Tiny crown", price: 60, description: "A royal amount of silliness." }
    ];
    MemePop.DEFAULT_STATE = {
        settings: {
            enabled: true,
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
    MemePop.MESSAGES = [
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
    MemePop.FOCUS_START_MESSAGES = [
        "Focus mode activated. Tiny progress incoming.",
        "MemePop will guard the quiet zone.",
        "Deep breath. The timer has your back.",
        "Starting strong with soft paws."
    ];
    MemePop.FOCUS_DONE_MESSAGES = [
        "Focus session complete. MemePop is proud.",
        "You did the focused thing. Coins delivered.",
        "Timer finished. Tiny victory parade.",
        "That was real progress. Sparkles approved."
    ];
    function normalizeState(raw) {
        const settings = (raw?.settings ?? {});
        const wallet = (raw?.wallet ?? {});
        const streak = (raw?.streak ?? {});
        const focus = (raw?.focus ?? {});
        const position = (raw?.position ?? {});
        const unlockedAccessories = Array.isArray(raw?.unlockedAccessories)
            ? raw.unlockedAccessories.filter((item) => MemePop.ACCESSORIES.some((accessoryItem) => accessoryItem.id === item))
            : MemePop.DEFAULT_STATE.unlockedAccessories;
        const normalizedUnlocked = Array.from(new Set(["none", ...unlockedAccessories]));
        const requestedAccessory = settings.accessory && MemePop.ACCESSORIES.some((item) => item.id === settings.accessory) ? settings.accessory : "none";
        const accessory = normalizedUnlocked.includes(requestedAccessory) ? requestedAccessory : "none";
        const frequency = ["off", "rare", "normal", "frequent"].includes(settings.frequency)
            ? settings.frequency
            : MemePop.DEFAULT_STATE.settings.frequency;
        return {
            settings: {
                enabled: typeof settings.enabled === "boolean" ? settings.enabled : MemePop.DEFAULT_STATE.settings.enabled,
                frequency,
                soundEnabled: typeof settings.soundEnabled === "boolean" ? settings.soundEnabled : MemePop.DEFAULT_STATE.settings.soundEnabled,
                doNotDisturb: typeof settings.doNotDisturb === "boolean" ? settings.doNotDisturb : MemePop.DEFAULT_STATE.settings.doNotDisturb,
                mutedUntil: typeof settings.mutedUntil === "number" ? Math.max(0, settings.mutedUntil) : MemePop.DEFAULT_STATE.settings.mutedUntil,
                accessory
            },
            wallet: {
                coins: typeof wallet.coins === "number" ? Math.max(0, Math.floor(wallet.coins)) : MemePop.DEFAULT_STATE.wallet.coins,
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
    MemePop.normalizeState = normalizeState;
    function readState() {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(MemePop.STATE_KEY, (result) => {
                    if (chrome.runtime.lastError) {
                        resolve(normalizeState(undefined));
                        return;
                    }
                    resolve(normalizeState(result[MemePop.STATE_KEY]));
                });
            }
            catch {
                resolve(normalizeState(undefined));
            }
        });
    }
    MemePop.readState = readState;
    function writeState(state) {
        const normalized = normalizeState(state);
        return new Promise((resolve) => {
            try {
                chrome.storage.local.set({ [MemePop.STATE_KEY]: normalized }, () => {
                    resolve(normalized);
                });
            }
            catch {
                resolve(normalized);
            }
        });
    }
    MemePop.writeState = writeState;
    async function updateState(mutator) {
        const state = await readState();
        const nextState = mutator(state) ?? state;
        return writeState(nextState);
    }
    MemePop.updateState = updateState;
    function todayKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    MemePop.todayKey = todayKey;
    function daysBetween(previous, current) {
        if (!previous || !current) {
            return 0;
        }
        const previousDate = new Date(`${previous}T00:00:00`);
        const currentDate = new Date(`${current}T00:00:00`);
        return Math.round((currentDate.getTime() - previousDate.getTime()) / 86400000);
    }
    MemePop.daysBetween = daysBetween;
    function getRandomDelayMs(frequency) {
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
    MemePop.getRandomDelayMs = getRandomDelayMs;
    function randomBetween(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }
    MemePop.randomBetween = randomBetween;
    function isQuiet(state) {
        const now = Date.now();
        const focusActive = state.focus.active && state.focus.endsAt > now;
        return (!state.settings.enabled ||
            state.settings.frequency === "off" ||
            state.settings.doNotDisturb ||
            state.settings.mutedUntil > now ||
            focusActive);
    }
    MemePop.isQuiet = isQuiet;
    function categoryForUrl(url) {
        let parsed;
        try {
            parsed = new URL(url);
        }
        catch {
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
        if (host.includes("github") ||
            host.includes("stackoverflow") ||
            host.includes("gitlab") ||
            host.includes("developer") ||
            host.includes("npmjs")) {
            return "coding";
        }
        if (host.includes("coursera") ||
            host.includes("khanacademy") ||
            host.includes("edx") ||
            host.includes("quizlet") ||
            host.includes("duolingo") ||
            host.includes("wikipedia") ||
            path.includes("learn")) {
            return "studying";
        }
        if (host.includes("amazon") || host.includes("shop") || host.includes("store") || host.includes("etsy") || host.includes("ebay")) {
            return "shopping";
        }
        if (host.includes("twitter") ||
            host.includes("x.com") ||
            host.includes("facebook") ||
            host.includes("instagram") ||
            host.includes("reddit") ||
            host.includes("tiktok") ||
            host.includes("linkedin")) {
            return "social";
        }
        return Math.random() > 0.78 ? "motivation" : "general";
    }
    MemePop.categoryForUrl = categoryForUrl;
    function messagesForCategory(category) {
        const categoryMessages = MemePop.MESSAGES.filter((message) => message.category === category);
        return categoryMessages.length > 0 ? categoryMessages : MemePop.MESSAGES.filter((message) => message.category === "general");
    }
    MemePop.messagesForCategory = messagesForCategory;
    function pickMessage(category, previous = "") {
        const pool = messagesForCategory(category);
        let choice = pool[Math.floor(Math.random() * pool.length)];
        if (pool.length > 1 && choice.text === previous) {
            const alternatives = pool.filter((message) => message.text !== previous);
            choice = alternatives[Math.floor(Math.random() * alternatives.length)];
        }
        return choice;
    }
    MemePop.pickMessage = pickMessage;
    function getAccessory(id) {
        return MemePop.ACCESSORIES.find((item) => item.id === id) ?? MemePop.ACCESSORIES[0];
    }
    MemePop.getAccessory = getAccessory;
})(MemePop || (MemePop = {}));
