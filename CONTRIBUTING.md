# Contributing

Thanks for contributing to TSnooze.

## Bug reports

Before filing a bug report:

- Check the existing issues to avoid duplicates.
- Confirm the issue still reproduces in the current code.
- Record the browser version, OS, and exact reproduction steps.

Please open a new issue using the bug report template in `.github/ISSUE_TEMPLATE/bug_report.md`.

## Feature requests

Feature suggestions are welcome. Please describe the problem to be solved, the use case, and any relevant examples. Use the feature request template in `.github/ISSUE_TEMPLATE/feature_request.md`.

## Local development setup

1. Clone the repository:

   ```bash
   git clone https://github.com/M003aad/DevEye.git
   cd DevEye
   ```

2. Open the project in your editor.
3. Load the extension in Developer mode from `chrome://extensions/` or `edge://extensions/`.
4. Click **Load unpacked** and select the project folder.
5. Make your edits and reload the extension from the extension page after changes.

## Development notes

- This project is a static Manifest V3 browser extension.
- There is no package manager or build step in the repository.
- JavaScript files are plain browser scripts and should remain compatible with current Chromium-based browsers.
- No environment variables are used in the current project.

## Pull request standards

- Keep changes focused and easy to review.
- Include clear rationale for behavior changes.
- Update documentation when the extension behavior or user flow changes.
- Validate the extension locally in Chrome or Edge after testing the affected flow.

Pull requests should use the repository template in `.github/PULL_REQUEST_TEMPLATE.md`.
