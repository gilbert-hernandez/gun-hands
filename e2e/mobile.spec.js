import { test, expect } from '@playwright/test';
import { FLOW } from '../src/config/flow.js';
import { TOUCH } from '../src/config/touch.js';
import { ignoreWindowBlur, touchDriver } from './support.js';

// Mobile layout (GH-26): rotate prompt, side-bar thumbs, safe areas and the touch layout. The
// landscape viewport is wider than 16:9, so there is a 120 px bar on each side of the canvas.

const LANDSCAPE = { width: 1200, height: 540 };
const PORTRAIT = { width: 540, height: 1200 };

test.use({ hasTouch: true, isMobile: true, viewport: LANDSCAPE });

let errors;
let touch;

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    // Phaser calls preventDefault on every touchcancel, which Chromium reports as an error.
    if (m.text().includes('cancel a touchcancel event')) return;
    if (m.type() === 'error') errors.push(m.text());
  });
  await ignoreWindowBlur(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  touch = await touchDriver(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------- helpers

function quiet(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enemies.director.enabled = false;
    for (const e of scene.enemies.group.getChildren()) if (e.active) e.despawn();
    scene.powerups.dropChance = 0;
  });
}

async function start(page) {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const g = window.__GAME__;
    return g.scene.isActive('Game') && g.scene.isActive('UI') && g.scene.getScene('Game').powerups;
  });
  await quiet(page);
}

function frames(page, n = 3) {
  return page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((r) => window.__GAME__.events.once('postrender', () => r(0)));
  }, n);
}

const isActive = (page, key) => page.waitForFunction((k) => window.__GAME__.scene.isActive(k), key);
const active = (page, key) => page.evaluate((k) => window.__GAME__.scene.isActive(k), key);
const survival = (page) => page.evaluate(() => window.__GAME__.scene.getScene('Game').survivalMs);
const pauseReady = (page) =>
  page.waitForFunction(() => window.__GAME__.scene.isActive('Pause') && window.__GAME__.scene.getScene('Pause').ready);

/** Rotate and wait until the canvas has refitted. */
async function rotate(page, size) {
  await page.setViewportSize(size);
  await page.waitForFunction((w) => {
    const r = window.__GAME__.canvas.getBoundingClientRect();
    return Math.abs(window.__GAME__.scale.displaySize.width - r.width) < 1 && r.width <= w && r.width > 0;
  }, size.width);
  await frames(page);
}

async function input(page) {
  await frames(page);
  return page.evaluate(() => {
    const p = window.__GAME__.scene.getScene('Game').player;
    const { sticks, mode } = p.controls;
    return { vx: p.body.velocity.x, vy: p.body.velocity.y, aim: p.aim, mode, move: !!sticks.move, aimed: !!sticks.aim };
  });
}

/** Bounds of game objects given as expressions, in game pixels, plus their font size if text. */
function boxes(page, scene, names) {
  return page.evaluate(
    ([key, list]) => {
      const s = window.__GAME__.scene.getScene(key);
      return list.map((name) => {
        const o = name.split('.').reduce((v, k) => v[k], s);
        const b = o.getBounds();
        return {
          name,
          left: b.left,
          top: b.top,
          right: b.right,
          bottom: b.bottom,
          font: o.style ? parseInt(o.style.fontSize, 10) : null,
        };
      });
    },
    [scene, names],
  );
}

function expectLaidOut(list) {
  for (const a of list) {
    expect(a.left, a.name).toBeGreaterThanOrEqual(0);
    expect(a.top, a.name).toBeGreaterThanOrEqual(0);
    expect(a.right, a.name).toBeLessThanOrEqual(960);
    expect(a.bottom, a.name).toBeLessThanOrEqual(540);
    if (a.font !== null) expect(a.font, a.name).toBeGreaterThanOrEqual(20);
    for (const b of list) {
      if (a === b) continue;
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(overlap, `${a.name} overlaps ${b.name}`).toBe(false);
    }
  }
}

function expectTarget(b) {
  expect(b.right - b.left, b.name).toBeGreaterThanOrEqual(64);
  expect(b.bottom - b.top, b.name).toBeGreaterThanOrEqual(64);
}

async function expectButtons(page, scene, names) {
  for (const b of await boxes(
    page,
    scene,
    names.map((n) => `${n}.image`),
  ))
    expectTarget(b);
  for (const b of await boxes(
    page,
    scene,
    names.map((n) => `${n}.label`),
  ))
    expect(b.font).toBeGreaterThanOrEqual(20);
}

async function openLevelUp(page) {
  await page.evaluate(() => {
    const game = window.__GAME__.scene.getScene('Game');
    game.upgrades.draw = () => ['damage', 'pierce', 'pickup'];
    game.xp.grantLevel();
  });
  await page.waitForFunction(() => window.__GAME__.scene.getScene('LevelUp').touchReady);
}

// ---------------------------------------------------------------- rotate prompt

test('portrait pauses play under the prompt, and landscape waits for Resume', async ({ page }) => {
  await start(page);
  await expect(page.locator('#rotate')).toBeHidden();
  await rotate(page, PORTRAIT);
  await expect(page.locator('#rotate')).toBeVisible();
  await expect(page.locator('#rotate')).toHaveText('Rotate your phone');
  await pauseReady(page);
  const before = await survival(page);

  // Esc behind the prompt resumes nothing for longer than a frame.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').pauseOpen);
  await pauseReady(page);
  expect(await survival(page)).toBe(before);

  await rotate(page, LANDSCAPE);
  await expect(page.locator('#rotate')).toBeHidden();
  expect(await active(page, 'Pause')).toBe(true);
  expect(await survival(page)).toBe(before);
  const [resume] = await boxes(page, 'Pause', ['resumeButton.image']);
  await touch.tap(1, (resume.left + resume.right) / 2, (resume.top + resume.bottom) / 2);
  await isActive(page, 'Game');
});

test('portrait during LevelUp keeps the same cards unpicked', async ({ page }) => {
  await start(page);
  await openLevelUp(page);
  await rotate(page, PORTRAIT);
  await rotate(page, LANDSCAPE);
  const r = await page.evaluate(() => {
    const { choices, chosen } = window.__GAME__.scene.getScene('LevelUp');
    return { choices, chosen };
  });
  expect(r).toEqual({ choices: ['damage', 'pierce', 'pickup'], chosen: false });
  expect(await active(page, 'LevelUp')).toBe(true);
});

test('taps on the prompt do not reach buttons under it, and a run started in portrait is paused', async ({ page }) => {
  await rotate(page, PORTRAIT);
  await touch.tap(1, 480, FLOW.title.startY);
  await frames(page, 6);
  expect(await active(page, 'Title')).toBe(true);
  await page.keyboard.press('Enter');
  await pauseReady(page);
  expect(await survival(page)).toBe(0);
});

// ---------------------------------------------------------------- side bars

test('thumbs in the side bars move and aim, and letting go stops', async ({ page }) => {
  await start(page);
  await touch.downPage(1, 60, 400);
  await touch.downPage(2, 1140, 400);
  await touch.movePage(1, 20, 400);
  await touch.movePage(2, 1140, 340);
  let s = await input(page);
  expect(s.mode).toBe('touch');
  expect(s.vx).toBeLessThan(0);
  expect(s.vy).toBeCloseTo(0);
  expect(s.aim).toBeCloseTo(-Math.PI / 2, 1);
  await touch.up(1);
  s = await input(page);
  expect({ vx: s.vx, move: s.move, aimed: s.aimed }).toEqual({ vx: 0, move: false, aimed: true });
});

test('a stick from the canvas keeps following its thumb into the bar and back', async ({ page }) => {
  await start(page);
  await touch.down(1, 60, 400);
  await touch.movePage(1, 60, 400);
  expect((await input(page)).vx).toBeLessThan(0);
  await touch.movePage(1, 180, 340); // the thumb landed at page x 180
  await touch.movePage(1, 60, 460);
  const s = await input(page);
  expect(s.vx).toBeLessThan(0);
  expect(s.vy).toBeGreaterThan(0);
  await touch.up(1);
  expect((await input(page)).vx).toBe(0);
});

test('a cancelled bar touch stops, and a bar tap stays in touch mode', async ({ page }) => {
  await start(page);
  await touch.downPage(1, 60, 400);
  await touch.movePage(1, 20, 400);
  expect((await input(page)).vx).toBeLessThan(0);
  await touch.cancel();
  expect((await input(page)).vx).toBe(0);

  await page.touchscreen.tap(60, 400);
  // Emulated mouse events, as browsers send after a tap.
  await page.evaluate(() => {
    const bar = document.getElementById('game');
    for (const type of ['mousemove', 'mousedown', 'mouseup'])
      bar.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 60, clientY: 400 }));
  });
  expect((await input(page)).mode).toBe('touch');
});

test('dragging in a bar does not scroll, select or open a menu', async ({ page }) => {
  await start(page);
  await touch.downPage(1, 60, 450);
  for (let y = 430; y >= 100; y -= 30) await touch.movePage(1, 60, y);
  await touch.up(1);
  const r = await page.evaluate(() => ({
    scroll: window.scrollY,
    selection: String(window.getSelection()),
    action: getComputedStyle(document.body).touchAction,
    menuAllowed: document.body.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true, bubbles: true })),
  }));
  expect(r).toEqual({ scroll: 0, selection: '', action: 'none', menuAllowed: false });
});

// ---------------------------------------------------------------- safe areas

test('the canvas stays inside body padding (safe-area insets) and refits a shorter page', async ({ page }) => {
  const fits = (left, top, right, bottom) =>
    page.waitForFunction(
      ([l, t, r, b]) => {
        const c = window.__GAME__.canvas.getBoundingClientRect();
        return c.width > 0 && c.left >= l - 1 && c.top >= t - 1 && c.right <= r + 1 && c.bottom <= b + 1;
      },
      [left, top, right, bottom],
    );
  // Big enough that the canvas must shrink, on one side only.
  await page.evaluate(() => (document.body.style.padding = '0 0 30px 300px'));
  await fits(300, 0, 1200, 510);
  await page.evaluate(() => (document.body.style.padding = ''));
  await page.setViewportSize({ width: 1200, height: 460 });
  await fits(0, 0, 1200, 460);
});

// ---------------------------------------------------------------- touch layout

test('menus use big buttons and readable text', async ({ page }) => {
  await expectButtons(page, 'Title', ['startButton']);
  expectLaidOut(await boxes(page, 'Title', ['logo', 'startButton.image', 'hintText', 'soundToggle']));
  expectTarget((await boxes(page, 'Title', ['soundToggle']))[0]);

  await start(page);
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').openPause());
  await pauseReady(page);
  await expectButtons(page, 'Pause', ['resumeButton', 'quitButton']);
  expectLaidOut(await boxes(page, 'Pause', ['resumeButton.image', 'quitButton.image', 'soundToggle']));
  expectTarget((await boxes(page, 'Pause', ['soundToggle']))[0]);
  await page.keyboard.press('Escape');
  await isActive(page, 'Game');

  await page.evaluate(() => {
    const game = window.__GAME__.scene.getScene('Game');
    game.combat.damagePlayer(game.player.hp, { force: true });
  });
  await page.waitForFunction(() => window.__GAME__.scene.getScene('GameOver').ready);
  await expectButtons(page, 'GameOver', ['restartButton', 'titleButton']);
  expectLaidOut(await boxes(page, 'GameOver', ['statsText', 'restartButton.image', 'titleButton.image']));
});

test('LevelUp cards are big, readable and tappable', async ({ page }) => {
  await start(page);
  await openLevelUp(page);
  const frame = (i) => `cards.${i}.list.1`;
  const cards = await boxes(page, 'LevelUp', [frame(0), frame(1), frame(2)]);
  cards.forEach(expectTarget);
  expectLaidOut([...(await boxes(page, 'LevelUp', ['promptText'])), ...cards]);
  for (const i of [0, 1, 2]) {
    const parts = await boxes(
      page,
      'LevelUp',
      [2, 3, 4, 5, 6].map((n) => `cards.${i}.list.${n}`),
    );
    expectLaidOut(parts);
    for (const p of parts) {
      expect(p.left, p.name).toBeGreaterThanOrEqual(cards[i].left);
      expect(p.right, p.name).toBeLessThanOrEqual(cards[i].right);
      expect(p.bottom, p.name).toBeLessThanOrEqual(cards[i].bottom);
    }
  }
  await touch.tap(1, (cards[1].left + cards[1].right) / 2, (cards[1].top + cards[1].bottom) / 2);
  await isActive(page, 'Game');
});

test('the HUD is readable with three powerups and the pause button', async ({ page }) => {
  await start(page);
  await touch.tap(1, 200, 400);
  await page.evaluate(() => {
    const game = window.__GAME__.scene.getScene('Game');
    game.player.maxHp = 200;
    game.player.hp = 200;
    game.combat.kills = 1234;
    for (const id of ['rapidfire', 'spread', 'shield']) game.powerups.collect(id);
  });
  await page.waitForFunction(() => window.__GAME__.scene.getScene('UI').slots.every((s) => s.text.visible));
  await frames(page);
  const names = ['hpText', 'levelText', 'timerText', 'killsText', 'hpFrame', 'xpFrame', 'touch.pauseHit'];
  for (const i of [0, 1, 2]) names.push(`slots.${i}.icon`, `slots.${i}.text`);
  const list = await boxes(page, 'UI', names);
  expectLaidOut(list);
  const pause = list.find((b) => b.name === 'touch.pauseHit');
  expectTarget(pause);
  expect(pause.right - pause.left).toBe(TOUCH.pause.hitSize);
});

// ---------------------------------------------------------------- desktop

test.describe('desktop', () => {
  test.use({ hasTouch: false, isMobile: false });

  test('a tall window shows no prompt and keeps playing', async ({ page }) => {
    await rotate(page, PORTRAIT);
    await start(page);
    await frames(page);
    await expect(page.locator('#rotate')).toBeHidden();
    expect(await active(page, 'Pause')).toBe(false);
    expect(await survival(page)).toBeGreaterThan(0);
  });

  test('keeps the desktop sizes and positions', async ({ page }) => {
    const title = await page.evaluate(() => {
      const t = window.__GAME__.scene.getScene('Title');
      return [t.startButton.y, t.startButton.image.displayWidth, t.startButton.label.style.fontSize, t.hintText.y];
    });
    expect(title).toEqual([FLOW.title.startY, 160, '18px', 400]);
    await start(page);
    const hud = await page.evaluate(() => {
      const u = window.__GAME__.scene.getScene('UI');
      return [u.hpText.style.fontSize, u.timerText.style.fontSize, u.slots[1].icon.x, u.slots[1].icon.displayWidth];
    });
    expect(hud).toEqual(['14px', '22px', 60, 16]);
    await openLevelUp(page);
    const cards = await page.evaluate(() =>
      window.__GAME__.scene.getScene('LevelUp').cards.map((c) => [c.x, c.y, c.list[1].displayWidth]),
    );
    expect(cards).toEqual([
      [296, 300, 160],
      [480, 300, 160],
      [664, 300, 160],
    ]);
  });
});
