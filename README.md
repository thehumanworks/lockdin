# LockdIn

Manifest V3 extension for Chromium-based browsers that:

- hides LinkedIn's main feed
- hides the LinkedIn News rail
- hides the Notifications nav entry
- keeps the profile rail on the left and replaces the remaining area with a motivational backdrop panel

## Install

1. Open `chrome://extensions` in Chrome, ChatGPT Atlas, Perplexity Comet, or another Chromium-based browser.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/Users/mish/dev/chrome-plugins/linkhidin`

Click the LockdIn toolbar button to toggle the extension on or off for LinkedIn. When toggled, the current LinkedIn tab reloads so the new state applies immediately.

## Notes

- The news rail is detected by locating a `<p>` whose text normalizes to `Linkedin News`, then hiding the matching top-level column in the main layout.
- The replacement panel uses the bundled `Bricolage Grotesque` font and rotates through 50 hardcoded motivational lines.
- Background images are randomly selected from bundled free stock photos sourced from Pexels:
  - `workspace-plants.jpg`
  - `studio-chair.jpg`
  - `desk-hello.jpg`
  - `dolomites.jpg`
  - `sunrise-peaks.jpg`
