/**
 * TSnooze – options page logic.
 * View, add and remove whitelisted hostnames (stored in chrome.storage.local).
 */

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const msgEl = document.getElementById('msg');
const inputEl = document.getElementById('site');

/** Turn user input ("https://www.Example.com/path") into a bare hostname ("example.com"). */
function normalize(input) {
  let value = input.trim().toLowerCase();
  if (!value) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(value)) value = 'https://' + value;
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    return host.includes('.') || host === 'localhost' ? host : '';
  } catch {
    return '';
  }
}

async function getWhitelist() {
  const { whitelist = [] } = await chrome.storage.local.get('whitelist');
  return whitelist;
}

/** Re-draw the list from storage. */
async function render() {
  const whitelist = await getWhitelist();
  listEl.textContent = '';
  emptyEl.hidden = whitelist.length > 0;

  for (const host of whitelist) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = host; // textContent = no HTML injection
    const btn = document.createElement('button');
    btn.className = 'remove';
    btn.textContent = 'Remove';
    btn.addEventListener('click', async () => {
      const current = await getWhitelist();
      await chrome.storage.local.set({ whitelist: current.filter((h) => h !== host) });
      render();
    });
    li.append(name, btn);
    listEl.appendChild(li);
  }
}

// Add a site
document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  msgEl.textContent = '';
  const host = normalize(inputEl.value);
  if (!host) {
    msgEl.textContent = 'Please enter a valid website, e.g. example.com';
    return;
  }
  const whitelist = await getWhitelist();
  if (whitelist.includes(host)) {
    msgEl.textContent = `${host} is already whitelisted.`;
    return;
  }
  await chrome.storage.local.set({ whitelist: [...whitelist, host].sort() });
  inputEl.value = '';
  render();
});

render();
