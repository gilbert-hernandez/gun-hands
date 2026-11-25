import { test, expect } from '@playwright/test';
import { FLOW } from '../src/config/flow.js';
import { PLAYER } from '../src/config/player.js';
import { TOUCH } from '../src/config/touch.js';
import { ignoreWindowBlur, touchDriver } from './support.js';

// Touch controls (GH-25): twin sticks, pointer ownership, input modes, resets, the pause button and
// LevelUp taps, with real multi-touch events. Tests wait on game state, not wall-clock time.

test.use({ hasTouch: true, isMobile: true, viewport: { width: 960, height: 540 } });

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

/** Start a session by tapping Start, with no enemies; shots are recorded instead of fired. */
async function start(page) {
  await touch.tap(9, 480, FLOW.title.startY);
  await page.waitForFunction(() => {
    const g = window.__GAME__;
    return g.scene.isActive('Game') && g.scene.isActive('UI') && g.scene.getScene('Game').powerups;
  });
  await quiet(page);
}

function quiet(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enemies.director.enabled = false;
    for (const e of scene.enemies.group.getChildren()) if (e.active) e.despawn();
    scene.powerups.dropChance = 0;
  });
}

/** Let two full frames run, so input sent before has been applied. */
function frames(page, n = 2) {
  return page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((r) => window.__GAME__.events.once('postrender', () => r(0)));
  }, n);
}

async function state(page) {
  await frames(page);
  return page.evaluate(() => {
    const p = window.__GAME__.scene.getScene('Game').player;
    const ui = window.__GAME__.scene.getScene('UI').touch;
    const stick = (s) => s && { x: s.origin.x, y: s.origin.y };
    return {
      vx: p.body.velocity.x,
      vy: p.body.velocity.y,
      aim: p.aim,
      facing: p.facing,
      mode: p.controls.mode,
      move: stick(p.controls.sticks.move),
      aimStick: stick(p.controls.sticks.aim),
      pauseShown: ui.pauseHit.visible,
    };
  });
}

const isActive = (page, key) => page.waitForFunction((k) => window.__GAME__.scene.isActive(k), key);

const UP = -Math.PI / 2;
const still = (s) => expect({ vx: s.vx, vy: s.vy }).toEqual({ vx: 0, vy: 0 });

/** Open LevelUp with fixed cards; resolves once it accepts mouse/key input. */
async function openLevelUp(page) {
  await page.evaluate(() => {
    const game = window.__GAME__.scene.getScene('Game');
    game.upgrades.draw = () => ['damage', 'firerate', 'pierce'];
    game.xp.grantLevel();
  });
  await page.waitForFunction(() => window.__GAME__.scene.getScene('LevelUp').ready);
}

const touchReady = (page) => page.waitForFunction(() => window.__GAME__.scene.getScene('LevelUp').touchReady);

const picked = (page) =>
  page.evaluate(() => ({
    chosen: window.__GAME__.scene.getScene('LevelUp').chosen,
    ranks: { ...window.__GAME__.scene.getScene('Game').upgrades.ranks },
  }));

const cards = (page) =>
  page.evaluate(() => window.__GAME__.scene.getScene('LevelUp').cards.map((c) => ({ x: c.x, y: c.y })));

// ---------------------------------------------------------------- sticks

test('both thumbs: moves left while aiming up, at full speed and any angle', async ({ page }) => {
  await start(page);
  await touch.down(1, 200, 400);
  await touch.down(2, 760, 400);
  await touch.move(1, 150, 400);
  await touch.move(2, 760, 350);
  const s = await state(page);
  expect(s.vx).toBeCloseTo(-PLAYER.speed, 3);
  expect(s.vy).toBeCloseTo(0, 3);
  expect(s.aim).toBeCloseTo(UP, 2);
  // Straight up has no side, so the body faces the movement.
  expect(s.facing).toBe('left');

  await touch.move(1, 200 + 52, 400 + 30);
  const d = await state(page);
  expect(Math.hypot(d.vx, d.vy)).toBeCloseTo(PLAYER.speed, 1);
  expect(Math.atan2(d.vy, d.vx)).toBeCloseTo(Math.atan2(30, 52), 2);

  // Aim left while moving right: the body faces the aim.
  await touch.move(2, 700, 400);
  expect((await state(page)).facing).toBe('left');
});

test('a thumb inside the dead zone stands still', async ({ page }) => {
  await start(page);
  await touch.down(1, 200, 400);
  await touch.move(1, 200 + TOUCH.stick.deadZone - 4, 400);
  const s = await state(page);
  expect(s.move).not.toBeNull();
  still(s);
});

test('releasing the aim stick keeps the aim, the guns firing, and the move stick working', async ({ page }) => {
  await start(page);
  await touch.down(1, 200, 400);
  await touch.down(2, 760, 400);
  await touch.move(1, 250, 400);
  await touch.move(2, 760, 340);
  await state(page);
  await touch.up(2);
  const s = await state(page);
  expect(s.aimStick).toBeNull();
  expect(s.aim).toBeCloseTo(UP, 2);
  expect(s.vx).toBeCloseTo(PLAYER.speed, 3);
  const angle = await page.evaluate(
    () => new Promise((r) => window.__GAME__.scene.getScene('Game').events.once('player-fired', (e) => r(e.angle))),
  );
  expect(angle).toBeCloseTo(UP, 2);
});

test('a stick keeps its touch across the center line; a second touch on its side is ignored', async ({ page }) => {
  await start(page);
  await touch.down(1, 400, 300);
  await touch.move(1, 700, 300);
  let s = await state(page);
  expect(s.vx).toBeCloseTo(PLAYER.speed, 3);
  expect(s.aimStick).toBeNull();
  await touch.down(2, 100, 300);
  s = await state(page);
  expect(s.move).toEqual({ x: 400, y: 300 });
  expect(s.aimStick).toBeNull();
});

// ---------------------------------------------------------------- modes

test('touch shows the pause button, W switches back and lets go, and mode survives into a new session', async ({
  page,
}) => {
  await start(page);
  expect((await state(page)).pauseShown).toBe(false);
  await touch.down(1, 200, 400);
  await touch.move(1, 250, 400);
  let s = await state(page);
  expect(s.mode).toBe('touch');
  expect(s.pauseShown).toBe(true);
  await page.keyboard.down('KeyW');
  s = await state(page);
  await page.keyboard.up('KeyW');
  expect(s.mode).toBe('keys');
  expect(s.move).toBeNull();
  expect(s.pauseShown).toBe(false);
  expect(s.vx).toBe(0);
  expect(s.vy).toBeLessThan(0);
  await touch.up(1);

  await touch.tap(1, 200, 400);
  expect((await state(page)).mode).toBe('touch');
  // Braces: returning the scene plugin would make Playwright serialize the whole game.
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').scene.restart();
  });
  await frames(page, 4);
  expect((await state(page)).pauseShown).toBe(true);
});

test('a mouse takes the aim over, and touches never count as mouse use', async ({ page }) => {
  await start(page);
  await touch.down(2, 760, 400);
  await touch.move(2, 760, 340);
  await state(page);
  await touch.up(2);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').player.controls.mouseUsed)).toBe(false);
  await page.mouse.move(900, 270);
  await page.mouse.move(920, 270);
  const s = await state(page);
  expect(s.mode).toBe('keys');
  expect(Math.abs(s.aim)).toBeLessThan(0.2);
});

// ---------------------------------------------------------------- resets

test('a thumb lifted while LevelUp is open does not keep moving afterwards', async ({ page }) => {
  await start(page);
  await touch.down(1, 200, 100);
  await touch.move(1, 250, 100);
  await state(page);
  await openLevelUp(page);
  await touch.up(1);
  await page.keyboard.press('1');
  await isActive(page, 'Game');
  still(await state(page));
});

test('a thumb held through a pause must lift and press again', async ({ page }) => {
  await start(page);
  await touch.down(1, 200, 400);
  await touch.move(1, 250, 400);
  await state(page);
  await page.evaluate(() => window.__GAME__.events.emit('blur'));
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Pause').ready);
  await page.evaluate(() => window.__GAME__.scene.getScene('Pause').resume());
  await isActive(page, 'Game');
  await touch.move(1, 260, 400);
  still(await state(page));
  await touch.up(1);
  await touch.down(1, 200, 400);
  await touch.move(1, 250, 400);
  expect((await state(page)).vx).toBeCloseTo(PLAYER.speed, 3);
});

test('a cancelled touch stops the player', async ({ page }) => {
  await start(page);
  await touch.down(1, 200, 400);
  await touch.move(1, 250, 400);
  expect((await state(page)).vx).toBeCloseTo(PLAYER.speed, 3);
  await touch.cancel();
  const s = await state(page);
  expect(s.move).toBeNull();
  still(s);
});

test('death lets go of the sticks and new touches start none', async ({ page }) => {
  await start(page);
  await touch.down(1, 200, 400);
  await page.evaluate(() => {
    const game = window.__GAME__.scene.getScene('Game');
    game.combat.damagePlayer(game.player.hp, { force: true });
  });
  await touch.down(2, 760, 400);
  const s = await state(page);
  expect(s.move).toBeNull();
  expect(s.aimStick).toBeNull();
  expect(s.pauseShown).toBe(false);
});

// ---------------------------------------------------------------- pause button and menus

test('the pause button pauses without starting a stick, and Resume continues by touch', async ({ page }) => {
  await start(page);
  await touch.tap(1, 200, 400);
  await state(page);
  await touch.down(1, TOUCH.pause.x, TOUCH.pause.y);
  expect((await state(page)).aimStick).toBeNull();
  await touch.up(1);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Pause').ready);
  await touch.tap(1, 480, FLOW.pause.resumeY);
  await isActive(page, 'Game');
});

test('a cancelled touch activates neither the pause button nor a menu button', async ({ page }) => {
  await touch.down(1, 480, FLOW.title.startY);
  await frames(page);
  await touch.cancel();
  await frames(page, 3);
  expect(await page.evaluate(() => window.__GAME__.scene.isActive('Title'))).toBe(true);

  await start(page);
  await touch.tap(1, 200, 400);
  await state(page);
  await touch.down(1, TOUCH.pause.x, TOUCH.pause.y);
  await frames(page);
  await touch.cancel();
  await frames(page, 3);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').pauseOpen)).toBe(false);
});

test('a touch device gets the touch hint on the title', async ({ page }) => {
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Title').hintText.text)).toBe(FLOW.title.touchHint);
});

test('dragging on the canvas does not scroll the page or select text', async ({ page }) => {
  await start(page);
  await touch.down(1, 200, 450);
  for (let y = 430; y >= 100; y -= 30) await touch.move(1, 200, y);
  await touch.up(1);
  const r = await page.evaluate(() => ({
    scroll: window.scrollY,
    selection: String(window.getSelection()),
    action: getComputedStyle(window.__GAME__.canvas).touchAction,
    menuAllowed: window.__GAME__.canvas.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true })),
  }));
  expect(r).toEqual({ scroll: 0, selection: '', action: 'none', menuAllowed: false });
});

// ---------------------------------------------------------------- LevelUp

test('a tap picks its card, and the prompt says tap', async ({ page }) => {
  await start(page);
  await openLevelUp(page);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('LevelUp').promptText.text)).toContain('tap a card');
  await touchReady(page);
  const [card] = await cards(page);
  await touch.tap(1, card.x, card.y);
  await isActive(page, 'Game');
  expect((await picked(page)).ranks.damage).toBe(1);
});

test('a thumb already down, an early touch, a slide off and a cancel pick nothing', async ({ page }) => {
  await start(page);
  const x = 280; // over the left card
  await touch.down(1, x, 300);
  await state(page);
  await openLevelUp(page);
  await touchReady(page);
  const [left, middle] = await cards(page);
  await touch.up(1);
  await frames(page);
  expect((await picked(page)).chosen).toBe(false);

  await touch.down(1, left.x, left.y);
  await touch.move(1, middle.x, middle.y);
  await touch.up(1);
  await frames(page);
  expect((await picked(page)).chosen).toBe(false);

  await touch.down(1, left.x, left.y);
  await touch.move(1, left.x, 500);
  await touch.up(1);
  await frames(page);
  expect((await picked(page)).chosen).toBe(false);

  await touch.down(1, left.x, left.y);
  await frames(page);
  await touch.cancel();
  await frames(page);
  expect((await picked(page)).chosen).toBe(false);

  // A touch that starts before the delay is over never arms, however late it lifts.
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('LevelUp').touchReady = false;
  });
  await touch.down(1, left.x, left.y);
  await frames(page);
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('LevelUp').touchReady = true;
  });
  await touch.up(1);
  await frames(page);
  expect((await picked(page)).chosen).toBe(false);
});

// ---------------------------------------------------------------- sessions

test('three sessions leave the same number of listeners', async ({ page }) => {
  await start(page);
  const count = () =>
    page.evaluate(() => {
      const game = window.__GAME__.scene.getScene('Game');
      const total = (e) => e.eventNames().reduce((n, name) => n + e.listenerCount(name), 0);
      return { input: total(game.input), keyboard: total(game.input.keyboard), events: total(game.events) };
    });
  await frames(page, 4);
  const first = await count();
  for (let i = 0; i < 2; i++) {
    await touch.tap(1, 200, 400);
    await page.evaluate(() => {
      const game = window.__GAME__.scene.getScene('Game');
      game.combat.damagePlayer(game.player.hp, { force: true });
    });
    await page.waitForFunction(
      () => window.__GAME__.scene.isActive('GameOver') && window.__GAME__.scene.getScene('GameOver').ready,
    );
    const restart = await page.evaluate(() => {
      const b = window.__GAME__.scene.getScene('GameOver').restartButton;
      return { x: b.x, y: b.y };
    });
    await touch.tap(1, restart.x, restart.y);
    await page.waitForFunction(
      () => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.getScene('Game').player.dead,
    );
    await quiet(page);
    await frames(page, 4);
  }
  expect(await count()).toEqual(first);
});

test.describe('desktop', () => {
  test.use({ hasTouch: false, isMobile: false });

  test('keyboard and mouse show no touch controls or touch wording', async ({ page }) => {
    expect(await page.evaluate(() => window.__GAME__.scene.getScene('Title').hintText.text)).toBe(FLOW.title.hint);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__GAME__.scene.isActive('UI') && window.__GAME__.scene.isActive('Game'));
    await quiet(page);
    await page.mouse.move(700, 100);
    await page.mouse.down();
    await page.mouse.move(720, 120);
    await page.mouse.up();
    const s = await state(page);
    expect({ mode: s.mode, move: s.move, aimStick: s.aimStick, pauseShown: s.pauseShown }).toEqual({
      mode: 'keys',
      move: null,
      aimStick: null,
      pauseShown: false,
    });
    await openLevelUp(page);
    const prompt = await page.evaluate(() => window.__GAME__.scene.getScene('LevelUp').promptText.text);
    expect(prompt).toContain('press its number');
  });
});
