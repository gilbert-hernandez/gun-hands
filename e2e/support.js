// Shared e2e helpers.

/**
 * Keep window focus changes (another worker's window, the video recorder) from opening the GH-11
 * pause menu in specs that don't test it. Runs before the game's scripts, so this capture listener
 * is first on `window` and stops Phaser's `blur` handler for every session, including restarts.
 * @param {import('@playwright/test').Page} page
 */
export function ignoreWindowBlur(page) {
  return page.addInitScript(() => {
    window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true);
  });
}
