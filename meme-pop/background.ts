declare function importScripts(...urls: string[]): void;

importScripts("shared.js");

const FOCUS_ALARM_NAME = "memepop-focus-complete";
const DEADLINE_ALARM_PREFIX = "memepop-deadline-reminder:";

type RuntimeMessage = {
  type?: string;
  durationMinutes?: number;
  message?: string;
};

function deadlineAlarmName(deadlineId: string): string {
  return `${DEADLINE_ALARM_PREFIX}${deadlineId}`;
}

function scheduleDeadlineReminders(state: MemePop.AppState): void {
  chrome.alarms.getAll((alarms: Array<{ name: string }>) => {
    for (const alarm of alarms) {
      if (alarm.name.startsWith(DEADLINE_ALARM_PREFIX)) {
        void chrome.alarms.clear(alarm.name);
      }
    }

    const now = Date.now();

    for (const deadline of state.deadlines) {
      if (deadline.completed) {
        continue;
      }

      const reminderMinutes = MemePop.getDeadlineReminderMinutes(deadline);

      if (!reminderMinutes) {
        continue;
      }

      const reminderAt = deadline.dueAt - reminderMinutes * 60000;

      if (reminderAt > now) {
        chrome.alarms.create(deadlineAlarmName(deadline.id), { when: reminderAt });
      }
    }
  });
}

function sendToActiveTab(message: Record<string, unknown>): void {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: Array<{ id?: number }>) => {
      const tabId = tabs[0]?.id;

      if (!tabId) {
        return;
      }

      chrome.tabs.sendMessage(tabId, message, () => {
        void chrome.runtime.lastError;
      });
    });
  } catch {
    // Some browser surfaces do not expose a normal active tab.
  }
}

function createNotification(title: string, message: string): void {
  try {
    chrome.notifications.create(
      {
        type: "basic",
        iconUrl: "assets/icons/icon128.png",
        title,
        message
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  } catch {
    // Notifications are optional; focus completion still saves locally.
  }
}

async function ensureInitialState(): Promise<void> {
  const state = await MemePop.readState();
  await MemePop.writeState(state);

  if (state.focus.active && state.focus.endsAt > Date.now()) {
    chrome.alarms.create(FOCUS_ALARM_NAME, { when: state.focus.endsAt });
  }

  scheduleDeadlineReminders(state);
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureInitialState();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureInitialState();
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender: unknown, sendResponse: (response: Record<string, unknown>) => void) => {
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

chrome.alarms.onAlarm.addListener((alarm: { name: string }) => {
  if (alarm.name.startsWith(DEADLINE_ALARM_PREFIX)) {
    const deadlineId = alarm.name.slice(DEADLINE_ALARM_PREFIX.length);

    void MemePop.readState().then((state) => {
      const deadline = state.deadlines.find((item) => item.id === deadlineId && !item.completed);

      if (!deadline) {
        return;
      }

      const dueTime = new Date(deadline.dueAt).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit"
      });
      createNotification("MemePop deadline reminder", `${deadline.title} is due ${dueTime}.`);
      sendToActiveTab({
        type: "MEMEPOP_SHOW_NOW",
        message: `Deadline detected. ${deadline.title} is getting closer.`
      });
    });
    return;
  }

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

chrome.storage.onChanged.addListener((changes: Record<string, { newValue?: Partial<MemePop.AppState> }>, areaName: string) => {
  if (areaName !== "local" || !changes[MemePop.STATE_KEY]) {
    return;
  }

  scheduleDeadlineReminders(MemePop.normalizeState(changes[MemePop.STATE_KEY].newValue));
});
