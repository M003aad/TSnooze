/**
 * TSnooze – background service worker (Manifest V3)
 *
 * How it works:
 *  1. We record "last active" timestamps per tab in chrome.storage.session
 *     (a service worker can be killed at any time, so no in-memory state).
 *  2. A chrome.alarms alarm fires every 30s and checks every tab.
 *  3. A tab that has been inactive longer than the user's delay is
 *     "suspended": we prefix its title with 💤, then call chrome.tabs.discard().
 *     A discarded tab stays in the tab strip with its title + favicon, frees
 *     its renderer process (RAM), and reloads automatically the moment the
 *     user clicks on it.
 */

importScripts('shared.js');

const DEFAULTS = { enabled: true, delayMinutes: 5, whitelist: [] };
const ALARM_NAME = 'inactivity-check';
const SLEEP_PREFIX = '💤 ';

/* ------------------------------------------------------------------ *
 * Settings + state helpers
 * ------------------------------------------------------------------ */

/** Read user settings, falling back to defaults for missing keys. */
const getSettings = () => chrome.storage.local.get(DEFAULTS);

/** Per-tab "last active" timestamps: { [tabId]: epochMs }. */
async function getTimes() {
  const { lastActive = {} } = await chrome.storage.session.get('lastActive');
  return lastActive;
}
const setTimes = (lastActive) => chrome.storage.session.set({ lastActive });

/** Remember which tab is active in each window: { [windowId]: tabId }. */
async function getActiveMap() {
  const { activeByWindow = {} } = await chrome.storage.session.get('activeByWindow');
  return activeByWindow;
}

/** True if the tab's hostname matches (or is a subdomain of) a whitelist entry. */
function isWhitelisted(url, whitelist) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return whitelist.some((entry) => host === entry || host.endsWith('.' + entry));
  } catch {
    return false;
  }
}

/**
 * Decide whether a tab may be suspended.
 * Never touches: active, pinned, audible (playing media), already-discarded,
 * non-web pages (chrome://, file://, etc.) or whitelisted sites.
 */
function canSuspend(tab, settings) {
  return (
    !tab.active &&
    !tab.pinned &&
    !tab.audible &&
    !tab.discarded &&
    tab.autoDiscardable !== false &&
    /^https?:/i.test(tab.url || '') &&
    !isWhitelisted(tab.url, settings.whitelist)
  );
}

/* ------------------------------------------------------------------ *
 * Suspension
 * ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Page-context helpers (serialized and injected into the tab). */
function prepareTab(prefix, fixedUrl) {
  // Rewrite the URL in place (no navigation, no reload, state is kept).
  if (fixedUrl && fixedUrl !== location.href) history.replaceState(history.state, '', fixedUrl);
  if (!document.title.startsWith(prefix)) document.title = prefix + document.title;
}

/**
 * Look up the account the user assigned to THIS document (set from the popup).
 * Returns the URL pinned to that account, or null when no rule exists
 * (then the URL is left untouched – there is no default account).
 */
async function prepareUrlForAccount(url) {
  const key = getAccountKey(url);
  if (!key) return null;
  const { accountRules = {} } = await chrome.storage.local.get('accountRules');
  const n = accountRules[key];
  return n === undefined ? null : withAuthUser(url, n);
}
function removeSleepIcon(prefix) {
  if (document.title.startsWith(prefix)) document.title = document.title.slice(prefix.length);
}

/**
 * Suspend one tab: add the 💤 title cue, then discard it.
 * Discarding keeps the tab (and its last-known title/favicon) in the tab strip.
 */
async function suspendTab(tab) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: prepareTab,
      args: [SLEEP_PREFIX, await prepareUrlForAccount(tab.url)],
    });
    await sleep(150); // let the new title propagate to the browser UI
  } catch {
    // Injection can fail on restricted pages (e.g. Web Store) – discard anyway.
  }

  try {
    // Re-check: the user may have switched to this tab during the delay.
    const fresh = await chrome.tabs.get(tab.id);
    if (fresh.active || fresh.audible) {
      chrome.scripting
        .executeScript({ target: { tabId: tab.id }, func: removeSleepIcon, args: [SLEEP_PREFIX] })
        .catch(() => {});
      return;
    }
    await chrome.tabs.discard(tab.id);
  } catch {
    // Tab was closed in the meantime – nothing to do.
  }
}

/** Main loop, run by the alarm: refresh active tabs, suspend stale ones. */
async function checkTabs() {
  const settings = await getSettings();
  if (!settings.enabled) return;

  const now = Date.now();
  const limit = settings.delayMinutes * 60 * 1000;
  const times = await getTimes();
  const tabs = await chrome.tabs.query({});
  const toSuspend = [];

  for (const tab of tabs) {
    // Active or audible tabs are "in use": keep resetting their clock.
    if (tab.active || tab.audible) {
      times[tab.id] = now;
      continue;
    }
    // First time we see this tab: use Chrome's real last-used time so tabs that
    // were already idle before the extension loaded/restarted are handled right away.
    if (times[tab.id] === undefined) times[tab.id] = tab.lastAccessed || now;
    if (canSuspend(tab, settings) && now - times[tab.id] >= limit) toSuspend.push(tab);
  }

  await setTimes(times);
  await Promise.all(toSuspend.map(suspendTab));
}

/* ------------------------------------------------------------------ *
 * Activity tracking
 * ------------------------------------------------------------------ */

// When a tab becomes active, its inactivity clock restarts when it is left again.
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  const [times, activeMap] = await Promise.all([getTimes(), getActiveMap()]);
  const now = Date.now();
  const previous = activeMap[windowId];
  if (previous !== undefined) times[previous] = now; // previous tab starts idling now
  times[tabId] = now;
  activeMap[windowId] = tabId;
  await Promise.all([setTimes(times), chrome.storage.session.set({ activeByWindow: activeMap })]);
});

// Media starting/stopping counts as activity (the idle clock restarts afterwards).
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if ('audible' in changeInfo) {
    const times = await getTimes();
    times[tabId] = Date.now();
    await setTimes(times);
  }
});

// Clean up timestamps of closed tabs.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const times = await getTimes();
  if (tabId in times) {
    delete times[tabId];
    await setTimes(times);
  }
});

/* ------------------------------------------------------------------ *
 * Alarm lifecycle
 * ------------------------------------------------------------------ */

/** Create the repeating alarm if it doesn't exist (alarms can be cleared on restart). */
async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 }); // every 30s
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkTabs();
});

chrome.runtime.onInstalled.addListener(async () => {
  // Write defaults without overwriting anything the user has already set.
  const current = await chrome.storage.local.get(null);
  await chrome.storage.local.set({ ...DEFAULTS, ...current });
  ensureAlarm();
});

chrome.runtime.onStartup.addListener(ensureAlarm);
ensureAlarm(); // also runs whenever the service worker wakes up
