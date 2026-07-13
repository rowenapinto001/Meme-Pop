"use strict";
importScripts("shared.js");
const FOCUS_ALARM_NAME = "memepop-focus-complete";
function sendToActiveTab(message) {
    try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (!tabId) {
                return;
            }
            chrome.tabs.sendMessage(tabId, message, () => {
                void chrome.runtime.lastError;
            });
        });
    }
    catch {
    }
}
function createNotification(title, message) {
    try {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "assets/icons/icon128.png",
            title,
            message
        }, () => {
            void chrome.runtime.lastError;
        });
    }
    catch {
    }
}
async function ensureInitialState() {
    const state = await MemePop.readState();
    await MemePop.writeState(state);
    if (state.focus.active && state.focus.endsAt > Date.now()) {
        chrome.alarms.create(FOCUS_ALARM_NAME, { when: state.focus.endsAt });
    }
}
chrome.runtime.onInstalled.addListener(() => {
    void ensureInitialState();
});
chrome.runtime.onStartup.addListener(() => {
    void ensureInitialState();
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "MEMEPOP_CHARACTER_CLICKED") {
        let awarded = false;
        void MemePop.updateState((state) => {
            const now = Date.now();
            if (now - state.wallet.lastClickCoinAt >= MemePop.CLICK_COIN_COOLDOWN_MS) {
                state.wallet.coins += 1;
                state.wallet.lastClickCoinAt = now;
                awarded = true;
            }
        }).then((state) => {
            sendResponse({ awarded, coins: state.wallet.coins });
        });
        return true;
    }
    if (message?.type === "MEMEPOP_FOCUS_START") {
        const durationMinutes = Math.max(15, Math.min(60, Math.floor(message.durationMinutes ?? 25)));
        const startedAt = Date.now();
        const endsAt = startedAt + durationMinutes * 60000;
        void MemePop.updateState((state) => {
            state.focus = {
                active: true,
                durationMinutes,
                startedAt,
                endsAt
            };
        }).then((state) => {
            chrome.alarms.create(FOCUS_ALARM_NAME, { when: endsAt });
            sendToActiveTab({
                type: "MEMEPOP_FOCUS_START",
                message: MemePop.FOCUS_START_MESSAGES[Math.floor(Math.random() * MemePop.FOCUS_START_MESSAGES.length)]
            });
            sendResponse({ ok: true, focus: state.focus });
        });
        return true;
    }
    if (message?.type === "MEMEPOP_FOCUS_CANCEL") {
        void chrome.alarms.clear(FOCUS_ALARM_NAME);
        void MemePop.updateState((state) => {
            state.focus.active = false;
            state.focus.endsAt = 0;
        }).then((state) => {
            sendResponse({ ok: true, focus: state.focus });
        });
        return true;
    }
    if (message?.type === "MEMEPOP_OPEN_SETTINGS") {
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        return;
    }
    if (message?.type === "MEMEPOP_OPEN_MOMENT") {
        const params = new URLSearchParams();
        if (message.message) {
            params.set("message", message.message);
        }
        chrome.tabs.create({ url: chrome.runtime.getURL(`moment.html?${params.toString()}`) });
        sendResponse({ ok: true });
    }
});
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== FOCUS_ALARM_NAME) {
        return;
    }
    void MemePop.updateState((state) => {
        if (!state.focus.active) {
            return;
        }
        state.focus.active = false;
        state.focus.endsAt = 0;
        state.wallet.coins += 10;
    }).then(() => {
        const message = MemePop.FOCUS_DONE_MESSAGES[Math.floor(Math.random() * MemePop.FOCUS_DONE_MESSAGES.length)];
        createNotification("MemePop focus complete", "Nice work. You earned 10 Meme Coins.");
        sendToActiveTab({ type: "MEMEPOP_FOCUS_DONE", message });
    });
});
