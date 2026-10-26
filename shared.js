/**
 * Shared helpers (loaded by background.js via importScripts and by popup.html).
 *
 * An account rule is stored per DOCUMENT, not per domain:
 *   chrome.storage.local → accountRules = { "<key>": "<authuser number>" }
 */

/**
 * Build a stable key that identifies one document, ignoring query, hash and /u/N/.
 *   docs.google.com/spreadsheets/d/AAA/edit?gid=1#gid=1  → docs.google.com/spreadsheets/d/AAA
 *   docs.google.com/document/u/1/d/BBB/edit              → docs.google.com/document/d/BBB
 *   drive.google.com/drive/u/1/folders/CCC               → drive.google.com/drive/folders/CCC
 */
function getAccountKey(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const path = u.pathname.replace(/\/u\/\d+(?=\/|$)/, '');
  const m = path.match(/^(.*?\/d\/[^/]+)/); // cut after the document ID
  return u.hostname + (m ? m[1] : path.replace(/\/+$/, ''));
}

/** Return the URL pinned to account N (replaces /u/N/ if present, else sets ?authuser=N). */
function withAuthUser(url, n) {
  const u = new URL(url);
  if (/\/u\/\d+(\/|$)/.test(u.pathname)) {
    u.pathname = u.pathname.replace(/\/u\/\d+(?=\/|$)/, `/u/${n}`);
  } else {
    u.searchParams.set('authuser', n);
  }
  return u.toString();
}
