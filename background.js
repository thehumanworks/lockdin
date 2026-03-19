const STORAGE_KEY = "lockdin-enabled";

function getChromeApi(override) {
  if (override) {
    return override;
  }

  if (typeof chrome === "undefined") {
    throw new Error("Chrome API unavailable");
  }

  return chrome;
}

async function getEnabledState(chromeApi = getChromeApi()) {
  const stored = await chromeApi.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] !== false;
}

async function setEnabledState(enabled, chromeApi = getChromeApi()) {
  await chromeApi.storage.local.set({ [STORAGE_KEY]: enabled });
  return enabled;
}

async function updateActionState(enabled, chromeApi = getChromeApi()) {
  await chromeApi.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chromeApi.action.setBadgeBackgroundColor({
    color: enabled ? "#0a66c2" : "#6b7280"
  });
  await chromeApi.action.setTitle({
    title: enabled ? "LockdIn is enabled" : "LockdIn is disabled"
  });
}

async function syncActionState(chromeApi = getChromeApi()) {
  const enabled = await getEnabledState(chromeApi);
  await updateActionState(enabled, chromeApi);
  return enabled;
}

async function reloadLinkedInTab(tab, chromeApi = getChromeApi()) {
  if (!tab || typeof tab.id !== "number" || typeof tab.url !== "string") {
    return;
  }

  if (!tab.url.startsWith("https://www.linkedin.com/")) {
    return;
  }

  await chromeApi.tabs.reload(tab.id);
}

async function handleActionClick(tab, chromeApi = getChromeApi()) {
  const enabled = !(await getEnabledState(chromeApi));

  await setEnabledState(enabled, chromeApi);
  await syncActionState(chromeApi);
  await reloadLinkedInTab(tab, chromeApi);

  return enabled;
}

function setupBackground(chromeApi = getChromeApi()) {
  chromeApi.runtime.onInstalled.addListener(() => {
    void syncActionState(chromeApi);
  });

  chromeApi.runtime.onStartup.addListener(() => {
    void syncActionState(chromeApi);
  });

  chromeApi.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      void syncActionState(chromeApi);
    }
  });

  chromeApi.action.onClicked.addListener((tab) => {
    void handleActionClick(tab, chromeApi);
  });
}

if (typeof module !== "undefined") {
  module.exports = {
    STORAGE_KEY,
    getEnabledState,
    handleActionClick,
    reloadLinkedInTab,
    setEnabledState,
    setupBackground,
    syncActionState,
    updateActionState
  };
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
  setupBackground(chrome);
}
