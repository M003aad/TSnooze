/**
 * TSnooze – popup logic.
 * Talks directly to chrome.storage / chrome.tabs; the background worker
 * picks up setting changes automatically on its next alarm tick.
 */

const DEFAULTS = { enabled: true, delayMinutes: 5, whitelist: [] };
const MB_PER_SLEEPING_TAB = 100; // rough average renderer footprint of a typical tab

const $ = (id) => document.getElementById(id);
const statusEl = $('status');

function showStatus(msg) {
  statusEl.textContent = msg;
  setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 3000);
}

/** Normalize a URL/hostname to a bare hostname without "www." */
function toHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Update the "Approx. XXX MB saved" card from the number of discarded tabs. */
async function renderMemory() {
  const sleeping = await chrome.tabs.query({ discarded: true });
  const mb = sleeping.length * MB_PER_SLEEPING_TAB;
  $('memory').textContent =
    mb >= 1000 ? `Approx. ${(mb / 1000).toFixed(1)} GB saved` : `Approx. ${mb} MB saved`;
  $('sleeping').textContent = `${sleeping.length} tab${sleeping.length === 1 ? '' : 's'} sleeping`;
}

/** Enable/disable the whitelist button depending on the current tab. */
async function renderWhitelistButton() {
  const btn = $('whitelist');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = tab && /^https?:/i.test(tab.url || '') ? toHost(tab.url) : '';
  const { whitelist } = await chrome.storage.local.get(DEFAULTS);

  if (!host) {
    btn.disabled = true;
    btn.textContent = 'Whitelist Current Site';
    btn.title = 'Only works on regular websites';
  } else if (whitelist.includes(host)) {
    btn.disabled = true;
    btn.textContent = `✓ ${host} is whitelisted`;
  } else {
    btn.disabled = false;
    btn.textContent = 'Whitelist Current Site';
  }
}

/**
 * Per-document Google account selector. Shown only on google.com pages.
 * The rule is saved under this document's key and applied just before the tab sleeps.
 */
async function renderAccount() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const key = tab && getAccountKey(tab.url);
  const host = tab ? toHost(tab.url) : '';
  if (!key || !host.endsWith('google.com')) return;
  const { accountRules = {} } = await chrome.storage.local.get('accountRules');
  $('account').value = accountRules[key] ?? '';
  $('account-row').hidden = false;
}

async function init() {
  const settings = await chrome.storage.local.get(DEFAULTS);
  $('enabled').checked = settings.enabled;
  $('delay').value = String(settings.delayMinutes);
  await Promise.all([renderMemory(), renderWhitelistButton(), renderAccount()]);
}

// Master ON/OFF switch
$('enabled').addEventListener('change', (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
  showStatus(e.target.checked ? 'Auto-suspend enabled' : 'Auto-suspend paused');
});

// Suspension delay dropdown
$('delay').addEventListener('change', (e) => {
  chrome.storage.local.set({ delayMinutes: Number(e.target.value) });
  showStatus('Delay updated');
});

// Save / clear the account rule for the current document
$('account').addEventListener('change', async (e) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const key = getAccountKey(tab?.url);
  if (!key) return;
  const { accountRules = {} } = await chrome.storage.local.get('accountRules');
  if (e.target.value === '') delete accountRules[key];
  else accountRules[key] = e.target.value;
  await chrome.storage.local.set({ accountRules });
  showStatus(e.target.value === '' ? 'Account rule cleared' : `Saved: this document → account ${e.target.value}`);
});

// Add the active tab's site to the whitelist
$('whitelist').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = toHost(tab?.url);
  if (!host) return;
  const { whitelist } = await chrome.storage.local.get(DEFAULTS);
  if (!whitelist.includes(host)) {
    await chrome.storage.local.set({ whitelist: [...whitelist, host].sort() });
  }
  showStatus(`${host} added to whitelist`);
  renderWhitelistButton();
});

// Wake every discarded tab by reloading it
$('wake').addEventListener('click', async () => {
  const sleeping = await chrome.tabs.query({ discarded: true });
  await Promise.all(sleeping.map((t) => chrome.tabs.reload(t.id).catch(() => {})));
  showStatus(sleeping.length ? `Woke ${sleeping.length} tab(s)` : 'No sleeping tabs');
  setTimeout(renderMemory, 500);
});

$('options').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
