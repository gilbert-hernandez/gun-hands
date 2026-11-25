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

/**
 * Multi-touch through the DevTools protocol (Playwright's own touchscreen only taps). Points are
 * game coordinates; needs a `hasTouch` context.
 * @param {import('@playwright/test').Page} page
 */
export async function touchDriver(page) {
  const cdp = await page.context().newCDPSession(page);
  /** @type {Map<number, {x: number, y: number}>} */
  const held = new Map();
  const toPage = (x, y) =>
    page.evaluate(
      ([gx, gy]) => {
        const r = window.__GAME__.canvas.getBoundingClientRect();
        return { x: r.left + (gx * r.width) / 960, y: r.top + (gy * r.height) / 540 };
      },
      [x, y],
    );
  const send = (type) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...held].map(([id, p]) => ({ id, ...p })) });
  return {
    async down(id, x, y) {
      held.set(id, await toPage(x, y));
      await send('touchStart');
    },
    async move(id, x, y) {
      held.set(id, await toPage(x, y));
      await send('touchMove');
    },
    async up(id) {
      const p = held.get(id);
      held.delete(id);
      // A touchEnd names the points being lifted (or none, for all of them).
      const touchPoints = held.size ? [{ id, ...p }] : [];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints });
    },
    /** The system cancels every touch. */
    async cancel() {
      held.clear();
      await send('touchCancel');
    },
    /** Like `down`/`move`, but in page pixels, for touches beside the canvas. */
    async downPage(id, x, y) {
      held.set(id, { x, y });
      await send('touchStart');
    },
    async movePage(id, x, y) {
      held.set(id, { x, y });
      await send('touchMove');
    },
    async tap(id, x, y) {
      await this.down(id, x, y);
      await this.up(id);
    },
  };
}
