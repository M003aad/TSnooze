# TSnooze

TSnooze automatically suspends inactive tabs to save RAM and battery while keeping each tab's title and favicon visible in the tab strip. The extension wakes the tab immediately when the user clicks it again.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-6366f1.svg)](manifest.json)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-45c3d6.svg)](manifest.json)
[![CI](https://github.com/M003aad/DevEye/actions/workflows/ci.yml/badge.svg)](https://github.com/M003aad/DevEye/actions/workflows/ci.yml)

## Table of contents

- [Overview / Architecture](#overview--architecture)
- [Features](#features)
- [Screenshots](#screenshots)
- [Codebase Breakdown](#codebase-breakdown)
- [Permissions](#permissions)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Overview / Architecture

TSnooze is a Chromium extension built for Manifest V3. It uses a background service worker to track tab activity and suspend inactive tabs on a fixed timer, while a popup UI and a whitelist management page let the user control behavior without leaving the browser.

### Architecture

- `background.js`: service worker that tracks `lastActive` timestamps, watches tab changes, and runs the inactivity check every 30 seconds.
- `shared.js`: helpers for normalizing document URLs and applying per-document Google account pinning via `authuser`.
- `popup.html` + `popup.js`: extension popup with enable/disable toggle, suspension delay, Google account selector, memory summary, and wake-all action.
- `options.html` + `options.js`: whitelist management page for adding/removing hostname-based exclusions.
- `manifest.json`: extension metadata, permissions, action entry, options page, and icon configuration.

The project is plain JavaScript and HTML; there is no bundler or framework in this workspace, and the extension is loaded directly in Developer Mode in Chromium-based browsers.

## Features

- Automatically suspend inactive tabs after a user-selected delay.
- Support for delay values of 30 seconds, 1 minute, 5 minutes, 15 minutes, 30 minutes, and 1 hour.
- Enable and disable suspension from the popup.
- Keep important sites awake with a whitelist that also protects subdomains.
- Add the current website to the whitelist from the popup.
- Manage whitelist entries from the options page.
- Wake all sleeping tabs with one click.
- Show sleeping-tab count and an approximate RAM saved figure.
- Per-document Google account selection via `authuser` for Google Docs, Sheets, Slides, Forms, and Drive pages.
- Skip suspending the active tab, pinned tabs, audible tabs, already discarded tabs, non-web pages, and whitelisted domains.

## Screenshots

No screenshots have been added to this repository yet.

## Codebase Breakdown

```text
TSnooze/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .prettierrc
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── SUPPORT.md
├── CITATION.cff
├── LICENSE
├── README.md
├── manifest.json
├── background.js
├── options.html
├── options.js
├── popup.css
├── popup.html
├── popup.js
├── shared.js
└── SUMMARY.md
```

| File / directory | Purpose |
| --- | --- |
| `background.js` | Service worker logic for inactivity detection, tab suspension, and storage-based state tracking. |
| `shared.js` | URL normalization helpers and Google account pinning logic shared by the background worker and popup. |
| `popup.html` / `popup.js` | UI for the extension popup, including toggles, delay selection, and wake actions. |
| `options.html` / `options.js` | Whitelist management page for adding and removing hosts. |
| `popup.css` | Styling for the popup UI. |
| `manifest.json` | Declares the extension name, permissions, default popup, service worker, and options page. |
| `icons/` | Extension icons used in Chrome/Edge. |
| `.github/` | Issue templates, pull request template, and GitHub Actions automation. |
| `LICENSE` | AGPL-3.0 license for the project. |

## Permissions

The manifest declares these permissions and host permissions.

| Permission | Required for |
| --- | --- |
| `tabs` | Reading tab activity, URL, discard state, and reloading sleeping tabs. |
| `alarms` | Running the periodic inactivity check without leaving a page open. |
| `storage` | Saving user settings, whitelist data, account rules, and per-tab activity timestamps. |
| `scripting` | Injecting a small script to add the `💤` title prefix and rewrite the URL for a Google account rule before discarding a tab. |
| `http://*/*`, `https://*/*` | Allowing the URL/title rewrite logic on regular web pages. |

## Installation & Setup

1. Clone this repository:

   ```bash
   git clone https://github.com/M003aad/DevEye.git
   cd DevEye
   ```

2. Open Chrome or Edge and go to `chrome://extensions/` (or `edge://extensions/`).
3. Enable Developer mode.
4. Click **Load unpacked**.
5. Select the `TSnooze` project folder.
6. Open the extension popup from the toolbar and verify the controls load correctly.

This project does not use environment variables in the current workspace, so no `.env.example` is required. There is also no package manifest or build tooling in the repo; the extension is loaded directly as a static Manifest V3 project.

## Usage

After installation:

1. Use the enable/disable switch in the popup to pause or resume automatic suspension.
2. Set the inactivity threshold using the **Suspend tabs after** selector.
3. On Google pages, select the desired account under **Account for this tab** when needed.
4. Click **Whitelist Current Site** to protect the active website or its subdomains.
5. Click **Wake All Sleeping Tabs** to reload all discarded tabs.
6. Open the whitelist manager via **Manage whitelist** to add or remove allowed hostnames.

The extension ignores active tabs, pinned tabs, audible tabs, already discarded tabs, non-web pages, and any URL that matches a whitelisted host.

## Scripts

No `package.json` exists in this repository, so no package scripts are defined. Validation is handled by the GitHub Actions workflow in `.github/workflows/ci.yml` instead of a local build script.

## Contributing

Contributions are welcome. Please review [CONTRIBUTING.md](CONTRIBUTING.md) for issue reporting, feature requests, and the local development workflow.

## Security

Please review [SECURITY.md](SECURITY.md) before reporting a vulnerability. The project uses GitHub Private Vulnerability Reporting and the security contact email listed there.

## License

TSnooze is distributed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE) for the full text. Maintainer: M003aad.
