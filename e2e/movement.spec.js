import { test, expect } from '@playwright/test';
import { PLAYER } from '../src/config/player.js';
import arenaMap from '../src/assets/maps/gh_arena.json' with { type: 'json' };
import { DISPLAY } from '../src/config/display.js';
import { ignoreWindowBlur } from './support.js';

// Player movement, facing, bounds, camera and hurtbox (GH-2). Since GH-4 the arena is the Tiled map,
// so the player stops at the inner face of the 1-tile border wall.
// Frame timing in headless swiftshader is uneven, so these assert on velocity, direction and
// bounds rather than on exact distance travelled.

const WORLD_W = arenaMap.width * arenaMap.tilewidth;
const WORLD_H = arenaMap.height * arenaMap.tileheight;
const WALL = arenaMap.tilewidth;
// Tile separation can leave float dust, so compare edges to within 0.01 px.
const near = (a, b) => Math.abs(a - b) < 0.01;

let errors;

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ignoreWindowBlur(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.player?.body);
  // No enemies (GH-5/6): a chaser could absorb a test bullet or touch the player mid-test.
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').enemies.director.enabled = false;
  });
  await page.waitForTimeout(200);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** Snapshot of the player and camera from the running Game scene. */
function state(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const p = scene.player;
    const b = p.body;
    const cam = scene.cameras.main;
    return {
      x: p.x,
      y: p.y,
      vx: b.velocity.x,
      vy: b.velocity.y,
      flipX: p.flipX,
      anim: p.anims.currentAnim?.key,
      body: {
        left: b.left,
        top: b.top,
        right: b.right,
        bottom: b.bottom,
        width: b.width,
        height: b.height,
        offsetX: b.offset.x,
        offsetY: b.offset.y,
      },
      cam: { scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height },
    };
  });
}

/** Teleport the player (test setup only). */
function teleport(page, x, y) {
  return page.evaluate(([px, py]) => window.__GAME__.scene.getScene('Game').player.body.reset(px, py), [x, y]);
}

async function hold(page, keys, ms) {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
}

async function release(page, keys) {
  for (const k of keys) await page.keyboard.up(k);
}

/**
 * Hold keys until `done(state)` is true (game time runs slower than wall time when the machine
 * is busy, so fixed durations are flaky), then keep holding a bit longer to check it sticks.
 */
async function holdUntil(page, keys, done, timeout = 15000) {
  for (const k of keys) await page.keyboard.down(k);
  await expect.poll(async () => done(await state(page)), { timeout, intervals: [100] }).toBe(true);
  await page.waitForTimeout(300);
  const s = await state(page);
  await release(page, keys);
  return s;
}

test('moves right at the configured speed, then stops on release', async ({ page }) => {
  const start = await state(page);
  expect(start.anim).toBe('player_body_idle');

  await hold(page, ['KeyD'], 400);
  const moving = await state(page);
  expect(moving.vx).toBeCloseTo(PLAYER.speed, 5);
  expect(moving.vy).toBe(0);
  expect(moving.x).toBeGreaterThan(start.x);
  expect(moving.anim).toBe('player_body_run');

  await release(page, ['KeyD']);
  await page.waitForTimeout(100);
  const stopped = await state(page);
  expect(stopped.vx).toBe(0);
  expect(stopped.vy).toBe(0);
  expect(stopped.anim).toBe('player_body_idle');
});

test('diagonal speed equals the configured speed (±1%)', async ({ page }) => {
  await hold(page, ['KeyW', 'KeyD'], 300);
  const s = await state(page);
  await release(page, ['KeyW', 'KeyD']);
  expect(s.vx).toBeGreaterThan(0);
  expect(s.vy).toBeLessThan(0);
  const speed = Math.hypot(s.vx, s.vy);
  expect(Math.abs(speed - PLAYER.speed) / PLAYER.speed).toBeLessThanOrEqual(0.01);
});

test('A + D cancel out horizontally', async ({ page }) => {
  // Keys go down one at a time, so a frame may run with only A held (and under parallel workers
  // that frame can land late). Measure from the first frame both keys are seen as down.
  await hold(page, ['KeyA', 'KeyD'], 100);
  await page.waitForFunction(() => {
    const { keys, body } = window.__GAME__.scene.getScene('Game').player;
    return keys.A.isDown && keys.D.isDown && body.velocity.x === 0;
  });
  // One more physics step, so any movement from an A-only frame has already been applied.
  await page.evaluate(() => new Promise((r) => window.__GAME__.events.once('postrender', () => r(undefined))));
  const start = await state(page);
  await page.waitForTimeout(300);
  const s = await state(page);
  await release(page, ['KeyA', 'KeyD']);
  expect(s.vx).toBe(0);
  expect(s.x).toBe(start.x);
});

test("can't pass the left/top border walls and the camera clamps at the corner", async ({ page }) => {
  await teleport(page, 100, 100);
  const s = await holdUntil(
    page,
    ['KeyW', 'KeyA'],
    (t) => near(t.body.left, WALL) && near(t.body.top, WALL) && t.cam.scrollX === 0 && t.cam.scrollY === 0,
  );
  expect(s.body.left).toBeCloseTo(WALL, 2);
  expect(s.body.top).toBeCloseTo(WALL, 2);
  expect(s.cam.scrollX).toBe(0);
  expect(s.cam.scrollY).toBe(0);
});

test('camera follows and clamps at the bottom-right corner', async ({ page }) => {
  const start = await state(page);
  await hold(page, ['KeyD'], 800);
  const followed = await state(page);
  await release(page, ['KeyD']);
  expect(followed.cam.scrollX).toBeGreaterThan(start.cam.scrollX);

  await teleport(page, WORLD_W - 100, WORLD_H - 100);
  const s = await holdUntil(
    page,
    ['KeyS', 'KeyD'],
    (t) =>
      near(t.body.right, WORLD_W - WALL) &&
      near(t.body.bottom, WORLD_H - WALL) &&
      t.cam.scrollX === WORLD_W - DISPLAY.width &&
      t.cam.scrollY === WORLD_H - DISPLAY.height,
  );
  expect(s.body.right).toBeCloseTo(WORLD_W - WALL, 2);
  expect(s.body.bottom).toBeCloseTo(WORLD_H - WALL, 2);
  expect(s.cam.scrollX).toBe(WORLD_W - DISPLAY.width);
  expect(s.cam.scrollY).toBe(WORLD_H - DISPLAY.height);
  // Off-center: the player is in the right half / bottom half of the screen.
  expect(s.x - s.cam.scrollX).toBeGreaterThan(DISPLAY.width / 2);
  expect(s.y - s.cam.scrollY).toBeGreaterThan(DISPLAY.height / 2);
});

test('hurtbox is smaller than 32 px and matches the config', async ({ page }) => {
  const { body } = await state(page);
  const hb = PLAYER.hurtbox;
  expect(body.width).toBeLessThan(32);
  expect(body.height).toBeLessThan(32);
  expect([body.width, body.height, body.offsetX, body.offsetY]).toEqual([hb.width, hb.height, hb.offsetX, hb.offsetY]);
});

test('facing flips with movement, then follows the pointer once it is used', async ({ page }) => {
  await hold(page, ['KeyA'], 200);
  expect((await state(page)).flipX).toBe(true);
  await release(page, ['KeyA']);

  await hold(page, ['KeyD'], 200);
  expect((await state(page)).flipX).toBe(false);

  // Moving only vertically keeps the current facing.
  await release(page, ['KeyD']);
  await hold(page, ['KeyW'], 200);
  expect((await state(page)).flipX).toBe(false);
  await release(page, ['KeyW']);

  // Pointer to the left of the player while moving right -> faces left.
  const box = await page.locator('#game canvas').boundingBox();
  const scale = box.width / DISPLAY.width;
  await page.keyboard.down('KeyD');
  const s = await state(page);
  const screenX = (s.x - s.cam.scrollX) * scale + box.x;
  const screenY = (s.y - s.cam.scrollY) * scale + box.y;
  await page.mouse.move(screenX - 150, screenY);
  await page.waitForTimeout(200);
  expect((await state(page)).flipX).toBe(true);

  // Pointer to the right -> faces right.
  await page.mouse.move(screenX + 300, screenY);
  await page.waitForTimeout(200);
  expect((await state(page)).flipX).toBe(false);
  await page.keyboard.up('KeyD');
});
