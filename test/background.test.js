const test = require("node:test");
const assert = require("node:assert/strict");
const background = require("../background.js");

function createChromeMock(initialEnabled = true) {
  const state = {
    enabled: initialEnabled,
    badgeText: "",
    badgeColor: "",
    title: "",
    reloadedTabId: null
  };

  const chromeMock = {
    storage: {
      local: {
        async get(key) {
          return { [key]: state.enabled };
        },
        async set(values) {
          state.enabled = values[background.STORAGE_KEY];
        }
      },
      onChanged: {
        addListener() {}
      }
    },
    action: {
      async setBadgeText({ text }) {
        state.badgeText = text;
      },
      async setBadgeBackgroundColor({ color }) {
        state.badgeColor = color;
      },
      async setTitle({ title }) {
        state.title = title;
      },
      onClicked: {
        addListener() {}
      }
    },
    tabs: {
      async reload(tabId) {
        state.reloadedTabId = tabId;
      }
    },
    runtime: {
      onInstalled: {
        addListener() {}
      },
      onStartup: {
        addListener() {}
      }
    }
  };

  return { chromeMock, state };
}

test("background sync registers the linkedin content script when enabled", async () => {
  const { chromeMock, state } = createChromeMock(true);

  const enabled = await background.syncActionState(chromeMock);

  assert.equal(enabled, true);
  assert.equal(state.badgeText, "ON");
});

test("background action click disables the extension and reloads the active linkedin tab", async () => {
  const { chromeMock, state } = createChromeMock(true);

  const enabled = await background.handleActionClick(
    { id: 7, url: "https://www.linkedin.com/feed/" },
    chromeMock
  );

  assert.equal(enabled, false);
  assert.equal(state.enabled, false);
  assert.equal(state.badgeText, "OFF");
  assert.equal(state.reloadedTabId, 7);
});
