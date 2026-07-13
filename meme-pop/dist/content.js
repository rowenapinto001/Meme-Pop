"use strict";
const CONTENT_DEFAULT_SETTINGS = {
    enabled: true,
    theme: "random",
    intervalSeconds: 180,
    soundEnabled: false
};
const CONTENT_VALID_THEMES = ["random", "office", "coding", "studying", "gaming"];
const CONTENT_VALID_INTERVALS = [10, 60, 180, 300, 600];
const MEME_ITEMS = [
    {
        id: "office-1",
        theme: "office",
        image: "assets/memes/office-1.png",
        messages: [
            "That meeting could have been an email.",
            "Pretending to look busy...",
            "Another spreadsheet has appeared.",
            "My calendar just developed a side quest."
        ]
    },
    {
        id: "coding-1",
        theme: "coding",
        image: "assets/memes/coding-1.png",
        messages: [
            "It worked yesterday.",
            "One tiny fix. Definitely.",
            "Have you tried turning it off and on again?",
            "The bug saw me open DevTools and left."
        ]
    },
    {
        id: "study-1",
        theme: "studying",
        image: "assets/memes/study-1.png",
        messages: [
            "One more chapter... maybe.",
            "Your notes are judging you.",
            "Focus mode activated... almost.",
            "The highlighter is doing most of the learning."
        ]
    },
    {
        id: "gaming-1",
        theme: "gaming",
        image: "assets/memes/gaming-1.png",
        messages: [
            "Just one more round.",
            "That was totally lag.",
            "Victory is loading.",
            "My strategy is mostly enthusiasm."
        ]
    }
];
let contentSettings = CONTENT_DEFAULT_SETTINGS;
let currentPopup = null;
let nextMemeTimeout;
let autoRemoveTimeout;
let removeAnimationTimeout;
let lastMemeId = "";
let lastMessage = "";
function normalizeContentSettings(raw) {
    const theme = raw?.theme && CONTENT_VALID_THEMES.includes(raw.theme) ? raw.theme : CONTENT_DEFAULT_SETTINGS.theme;
    const intervalSeconds = raw?.intervalSeconds && CONTENT_VALID_INTERVALS.includes(raw.intervalSeconds)
        ? raw.intervalSeconds
        : CONTENT_DEFAULT_SETTINGS.intervalSeconds;
    return {
        enabled: typeof raw?.enabled === "boolean" ? raw.enabled : CONTENT_DEFAULT_SETTINGS.enabled,
        theme,
        intervalSeconds,
        soundEnabled: typeof raw?.soundEnabled === "boolean" ? raw.soundEnabled : CONTENT_DEFAULT_SETTINGS.soundEnabled
    };
}
function loadContentSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get("memePopSettings", (result) => {
            resolve(normalizeContentSettings(result.memePopSettings));
        });
    });
}
function scheduleNextMeme() {
    window.clearTimeout(nextMemeTimeout);
    if (!contentSettings.enabled) {
        return;
    }
    nextMemeTimeout = window.setTimeout(() => {
        showMeme(false);
        scheduleNextMeme();
    }, contentSettings.intervalSeconds * 1000);
}
function pickMeme() {
    const eligibleMemes = contentSettings.theme === "random"
        ? MEME_ITEMS
        : MEME_ITEMS.filter((meme) => meme.theme === contentSettings.theme);
    const pool = eligibleMemes.length > 0 ? eligibleMemes : MEME_ITEMS;
    let meme = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && meme.id === lastMemeId) {
        const alternatives = pool.filter((item) => item.id !== lastMemeId);
        meme = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    lastMemeId = meme.id;
    return meme;
}
function pickMessage(meme) {
    let message = meme.messages[Math.floor(Math.random() * meme.messages.length)];
    if (meme.messages.length > 1 && message === lastMessage) {
        const alternatives = meme.messages.filter((item) => item !== lastMessage);
        message = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    lastMessage = message;
    return message;
}
function formatThemeLabel(theme) {
    if (theme === "studying") {
        return "Studying";
    }
    return theme.charAt(0).toUpperCase() + theme.slice(1);
}
function removeExistingPopupNow() {
    window.clearTimeout(autoRemoveTimeout);
    window.clearTimeout(removeAnimationTimeout);
    const existingPopup = document.getElementById("meme-pop-root");
    existingPopup?.remove();
    currentPopup = null;
}
function beginRemovePopup(animated) {
    if (!currentPopup) {
        return;
    }
    window.clearTimeout(autoRemoveTimeout);
    window.clearTimeout(removeAnimationTimeout);
    const popupToRemove = currentPopup;
    if (!animated) {
        popupToRemove.remove();
        currentPopup = null;
        return;
    }
    popupToRemove.classList.add("meme-pop-leaving");
    removeAnimationTimeout = window.setTimeout(() => {
        if (currentPopup === popupToRemove) {
            currentPopup = null;
        }
        popupToRemove.remove();
    }, 600);
}
function startAutoRemoveTimer() {
    window.clearTimeout(autoRemoveTimeout);
    autoRemoveTimeout = window.setTimeout(() => {
        beginRemovePopup(true);
    }, 9400);
}
function updateSpeechBubble(messageElement, meme) {
    messageElement.textContent = pickMessage(meme);
}
function createMemePopup(meme) {
    const root = document.createElement("aside");
    root.id = "meme-pop-root";
    root.className = `meme-pop-theme-${meme.theme}`;
    root.setAttribute("aria-live", "polite");
    const card = document.createElement("div");
    card.className = "meme-pop-card";
    const characterButton = document.createElement("button");
    characterButton.className = "meme-pop-character";
    characterButton.type = "button";
    characterButton.title = "Show another joke";
    characterButton.setAttribute("aria-label", "Show another Meme Pop joke");
    const image = document.createElement("img");
    image.src = chrome.runtime.getURL(meme.image);
    image.alt = `${formatThemeLabel(meme.theme)} meme character`;
    image.decoding = "async";
    const bubble = document.createElement("div");
    bubble.className = "meme-pop-bubble";
    const closeButton = document.createElement("button");
    closeButton.className = "meme-pop-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close Meme Pop");
    closeButton.textContent = "x";
    const message = document.createElement("p");
    message.className = "meme-pop-message";
    message.textContent = pickMessage(meme);
    const label = document.createElement("span");
    label.className = "meme-pop-label";
    label.textContent = formatThemeLabel(meme.theme);
    characterButton.append(image);
    bubble.append(closeButton, message, label);
    card.append(characterButton, bubble);
    root.append(card);
    characterButton.addEventListener("click", () => {
        updateSpeechBubble(message, meme);
    });
    closeButton.addEventListener("click", () => {
        beginRemovePopup(true);
    });
    return root;
}
function playPopSound() {
    if (!contentSettings.soundEnabled) {
        return;
    }
    try {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) {
            return;
        }
        const context = new AudioContextConstructor();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(420, now);
        oscillator.frequency.exponentialRampToValueAtTime(720, now + 0.08);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        oscillator.addEventListener("ended", () => {
            void context.close();
        });
    }
    catch {
    }
}
function showMeme(force) {
    if (!force && (currentPopup || document.getElementById("meme-pop-root"))) {
        return;
    }
    if (force) {
        removeExistingPopupNow();
    }
    const target = document.body || document.documentElement;
    if (!target) {
        return;
    }
    const popup = createMemePopup(pickMeme());
    target.append(popup);
    currentPopup = popup;
    playPopSound();
    startAutoRemoveTimer();
}
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.memePopSettings) {
        return;
    }
    contentSettings = normalizeContentSettings(changes.memePopSettings.newValue);
    if (!contentSettings.enabled) {
        beginRemovePopup(true);
    }
    scheduleNextMeme();
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "MEME_POP_SHOW_NOW") {
        return;
    }
    if (message.settings) {
        contentSettings = normalizeContentSettings(message.settings);
    }
    showMeme(true);
    scheduleNextMeme();
    sendResponse({ ok: Boolean(document.getElementById("meme-pop-root")) });
});
void loadContentSettings().then((settings) => {
    contentSettings = settings;
    scheduleNextMeme();
});
