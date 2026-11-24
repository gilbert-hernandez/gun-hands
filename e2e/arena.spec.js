import { test, expect } from '@playwright/test';
import arenaMap from '../src/assets/maps/gh_arena.json' with { type: 'json' };
import { DISPLAY } from '../src/config/display.js';

// The Tiled arena: size, spawn, wall collision for the player, bullets and other actors (GH-4).
// Positions below refer to the shipped map: a vertical wall run in column 14, rows 17-22
// (x 448-480, y 544-736), and the player spawn at the center of tile (30, 20).

const T = arenaMap.tilewidth;
const WORLD_W = arenaMap.width * T;
const WORLD_H = arenaMap.height * T;
const SPAWN = arenaMap.layers.find((l) => l.name === 'spawns').objects.find((o) => o.name === 'player');
const WALL_RUN_RIGHT = 15 * T; // right face of the column-14 run
const near = (a, b) => Math.abs(a - b) < 0.01;

let errors;

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.player?.body);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

function state(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const p = scene.player;
    const b = p.body;
    // Wall tiles under the hurtbox, inset by half a pixel so touching edges don't count.
    const overlapping = scene.arena.walls.getTilesWithinWorldXY(b.left + 0.5, b.top + 0.5, b.width - 1, b.height - 1, {
      isNotEmpty: true,
    }).length;
    return {
      x: p.x,
      y: p.y,
      vx: b.velocity.x,
      vy: b.velocity.y,
      body: { left: b.left, top: b.top, right: b.right, bottom: b.bottom },
      overlapping,
    };
  });
}

function teleport(page, x, y) {
  return page.evaluate(([px, py]) => window.__GAME__.scene.getScene('Game').player.body.reset(px, py), [x, y]);
}

/** Hold keys until `done(state)` holds, keep holding briefly, then release and return the state. */
async function holdUntil(page, keys, done, timeout = 15000) {
  for (const k of keys) await page.keyboard.down(k);
  await expect.poll(async () => done(await state(page)), { timeout, intervals: [100] }).toBe(true);
  await page.waitForTimeout(300);
  const s = await state(page);
  for (const k of keys) await page.keyboard.up(k);
  return s;
}

/** Move the mouse `dx, dy` game px away from the player on screen. */
async function pointAt(page, dx, dy) {
  const box = await page.locator('#game canvas').boundingBox();
  const scale = box.width / DISPLAY.width;
  const p = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const cam = scene.cameras.main;
    return { x: scene.player.x - cam.scrollX, y: scene.player.y - cam.scrollY };
  });
  await page.mouse.move(box.x + (p.x + dx) * scale, box.y + (p.y + dy) * scale);
}

/**
 * Resolve with where and when the next fired bullet despawns (tracked in the page from the moment
 * it is fired, so pool reuse and round-trip lag can't confuse it).
 */
function nextBulletDespawn(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const scene = window.__GAME__.scene.getScene('Game');
        const loop = scene.game.loop;
        const pool = scene.player.bullets;
        const fire = pool.fire;
        let minX = Infinity;
        pool.fire = (...args) => {
          const b = fire.apply(pool, args);
          if (!b) return b;
          pool.fire = fire;
          const track = () => {
            minX = Math.min(minX, b.x);
          };
          scene.events.on('postupdate', track);
          b.despawn = () => {
            delete b.despawn;
            scene.events.off('postupdate', track);
            const out = { x: b.x, minX: Math.min(minX, b.x), expired: loop.time >= b.expiresAt };
            b.despawn();
            resolve({ ...out, active: b.active });
          };
          return b;
        };
      }),
  );
}

test('world and camera bounds come from the map (1920x1280)', async ({ page }) => {
  const r = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const wb = scene.physics.world.bounds;
    const cb = scene.cameras.main.getBounds();
    return { world: [wb.x, wb.y, wb.width, wb.height], cam: [cb.x, cb.y, cb.width, cb.height] };
  });
  expect([WORLD_W, WORLD_H]).toEqual([1920, 1280]);
  expect(r.world).toEqual([0, 0, WORLD_W, WORLD_H]);
  expect(r.cam).toEqual([0, 0, WORLD_W, WORLD_H]);
});

test("the player starts at the map's player spawn point", async ({ page }) => {
  const s = await state(page);
  expect(s.x).toBe(SPAWN.x);
  expect(s.y).toBe(SPAWN.y);
});

test('walking into an interior obstacle stops the player flush, with no overlap', async ({ page }) => {
  await teleport(page, WALL_RUN_RIGHT + 120, 640);
  // holdUntil keeps A held 300 ms after reaching the wall; the player must not have moved further.
  const s = await holdUntil(page, ['KeyA'], (t) => near(t.body.left, WALL_RUN_RIGHT));
  expect(s.body.left).toBeCloseTo(WALL_RUN_RIGHT, 2);
  expect(s.overlapping).toBe(0);
});

test('holding A+W against the left border wall slides up along it', async ({ page }) => {
  await teleport(page, 80, 900);
  await holdUntil(page, ['KeyA'], (t) => near(t.body.left, T));
  await page.keyboard.down('KeyA');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(150);
  const a = await state(page);
  await page.waitForTimeout(600);
  const b = await state(page);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyW');
  expect(b.y).toBeLessThan(a.y - 20);
  expect(b.body.left).toBeCloseTo(T, 2);
  expect(b.overlapping).toBe(0);
});

test('a decor tile does not block movement', async ({ page }) => {
  // Find a decor cell whose surroundings (3 rows, 4 columns either side) have no walls.
  const W = arenaMap.width;
  const walls = arenaMap.layers.find((l) => l.name === 'walls').data;
  const decor = arenaMap.layers.find((l) => l.name === 'decor').data;
  let cell;
  for (let i = 0; i < decor.length && !cell; i++) {
    if (!decor[i]) continue;
    const c = i % W;
    const r = Math.floor(i / W);
    let clear = c >= 5 && c < W - 5;
    for (let dr = -1; dr <= 1 && clear; dr++) {
      for (let dc = -4; dc <= 4 && clear; dc++) if (walls[(r + dr) * W + c + dc]) clear = false;
    }
    if (clear) cell = { c, r };
  }
  expect(cell).toBeTruthy();
  const y = cell.r * T + T / 2 - 4; // hurtbox (y-6..y+14) inside the decor row
  const target = (cell.c + 2) * T;
  await teleport(page, (cell.c - 2) * T + T / 2, y);
  const s = await holdUntil(page, ['KeyD'], (t) => t.x > target);
  expect(s.x).toBeGreaterThan(target);
});

test('a bullet fired at a nearby wall despawns at its face, before its lifetime ends', async ({ page }) => {
  await teleport(page, WALL_RUN_RIGHT + 120, 640);
  await page.waitForTimeout(300);
  await pointAt(page, -60, 0);
  await page.waitForTimeout(300);
  const r = await nextBulletDespawn(page);
  expect(r.active).toBe(false);
  expect(r.expired).toBe(false);
  // Stopped at the wall face (the 8x8 bullet's center sits a few px off it), never beyond it.
  expect(r.minX).toBeGreaterThanOrEqual(WALL_RUN_RIGHT);
  expect(r.x).toBeLessThan(WALL_RUN_RIGHT + 12);
});

test('a bullet with pierce 3 still stops at the wall', async ({ page }) => {
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').player.weapon.bullet.pierce = 3;
  });
  await teleport(page, WALL_RUN_RIGHT + 120, 640);
  await page.waitForTimeout(300);
  await pointAt(page, -60, 0);
  await page.waitForTimeout(300);
  const r = await nextBulletDespawn(page);
  expect(r.expired).toBe(false);
  expect(r.minX).toBeGreaterThanOrEqual(WALL_RUN_RIGHT);
  expect(r.x).toBeLessThan(WALL_RUN_RIGHT + 12);
});

test('another physics body registered with arena.collide stops at a wall', async ({ page }) => {
  await page.evaluate((x) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const s = scene.physics.add.sprite(x, 640, 'enemy_grunt_walk');
    s.body.setSize(20, 20);
    scene.arena.collide(s);
    s.setVelocityX(-200);
    window.__actor = s;
  }, WALL_RUN_RIGHT + 120);
  await expect
    .poll(() => page.evaluate(() => window.__actor.body.left), { timeout: 10000, intervals: [100] })
    .toBeCloseTo(WALL_RUN_RIGHT, 2);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__actor.body.left)).toBeCloseTo(WALL_RUN_RIGHT, 2);
});

test('isSolidAt is true inside a wall and false on open floor', async ({ page }) => {
  const r = await page.evaluate(
    ([wx, wy, fx, fy]) => {
      const arena = window.__GAME__.scene.getScene('Game').arena;
      return { wall: arena.isSolidAt(wx, wy), floor: arena.isSolidAt(fx, fy), border: arena.isSolidAt(5, 5) };
    },
    [14 * T + 16, 18 * T + 16, SPAWN.x, SPAWN.y],
  );
  expect(r).toEqual({ wall: true, floor: false, border: true });
});
