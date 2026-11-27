import { test, expect } from '@playwright/test';
import arenaMap from '../src/assets/maps/gh_arena.json' with { type: 'json' };
import { ENEMIES } from '../src/config/enemies.js';
import { ignoreWindowBlur } from './support.js';

// Enemies (GH-5): types, ring spawning, chase with separation, walls, pool, recycling, waves.
// Most tests turn the wave director off and place enemies themselves. Positions refer to the
// shipped map: a vertical wall run in column 14, rows 17-22 (x 448-480, y 544-736), and the
// player spawn at the center of tile (30, 20).

const T = arenaMap.tilewidth;
const SPAWN = arenaMap.layers.find((l) => l.name === 'spawns').objects.find((o) => o.name === 'player');
const WALL_RUN_LEFT = 14 * T;

let errors;

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await ignoreWindowBlur(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.xp);
  // Magnet off (GH-7): collecting gems from kills could level up and pause Game mid-test.
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').player.pickupRadius = 0;
  });
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** Stop automatic spawning and clear anything already spawned. */
function directorOff(page) {
  return page.evaluate(() => {
    const { enemies } = window.__GAME__.scene.getScene('Game');
    enemies.director.enabled = false;
    for (const e of enemies.group.getChildren()) if (e.active) e.despawn();
  });
}

/** Spawn enemies at fixed points; returns their indexes in the group. */
function spawnAt(page, typeId, points) {
  return page.evaluate(
    ([t, pts]) => {
      const { enemies } = window.__GAME__.scene.getScene('Game');
      // Spawn first: getChildren() may return a snapshot that doesn't include the new enemy.
      return pts.map(([x, y]) => {
        const e = enemies.spawnAt(t, x, y);
        return enemies.group.getChildren().indexOf(e);
      });
    },
    [typeId, points],
  );
}

function enemyState(page, index) {
  return page.evaluate((i) => {
    const e = window.__GAME__.scene.getScene('Game').enemies.group.getChildren()[i];
    const b = e.body;
    return {
      active: e.active,
      typeId: e.typeId,
      key: e.texture.key,
      x: e.x,
      y: e.y,
      vx: b.velocity.x,
      vy: b.velocity.y,
      flipX: e.flipX,
      hp: e.hp,
      speed: e.speed,
      body: { width: b.width, height: b.height, left: b.left, right: b.right, top: b.top, bottom: b.bottom },
      tint: e.tintTopLeft,
    };
  }, index);
}

/**
 * Watch every rendered frame for `ms` of game time (survival time, so slow headless frames
 * don't shorten it): max wall tiles overlapped by any enemy hurtbox, max live count, and how
 * far the player moved.
 */
function watch(page, ms) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const game = window.__GAME__;
        const scene = game.scene.getScene('Game');
        const out = { frames: 0, maxOverlap: 0, maxLive: 0, playerMoved: 0 };
        const p0 = { x: scene.player.x, y: scene.player.y };
        const t0 = scene.survivalMs;
        const onFrame = () => {
          out.frames++;
          out.maxLive = Math.max(out.maxLive, scene.enemies.liveCount);
          out.playerMoved = Math.max(out.playerMoved, Math.hypot(scene.player.x - p0.x, scene.player.y - p0.y));
          for (const e of scene.enemies.group.getChildren()) {
            if (!e.active) continue;
            const b = e.body;
            const n = scene.arena.walls.getTilesWithinWorldXY(b.left + 0.5, b.top + 0.5, b.width - 1, b.height - 1, {
              isNotEmpty: true,
            }).length;
            out.maxOverlap = Math.max(out.maxOverlap, n);
          }
          if (scene.survivalMs - t0 >= duration) {
            game.events.off('postrender', onFrame);
            resolve(out);
          }
        };
        game.events.on('postrender', onFrame);
      }),
    ms,
  );
}

test('a spawned Brute uses the Brute sprite, speed, hurtbox and HP', async ({ page }) => {
  await directorOff(page);
  const [i] = await spawnAt(page, 'brute', [[SPAWN.x + 200, SPAWN.y]]);
  await page.waitForTimeout(300);
  const s = await enemyState(page, i);
  const type = ENEMIES.types.brute;
  expect(s.key).toBe(type.walk);
  expect(s.typeId).toBe('brute');
  expect(s.hp).toBe(type.hp);
  expect([s.body.width, s.body.height]).toEqual([type.hurtbox.width, type.hurtbox.height]);
  expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(type.speed, 3);
});

test('a Grunt left of the player moves right toward it and faces right', async ({ page }) => {
  await directorOff(page);
  const [i] = await spawnAt(page, 'grunt', [[SPAWN.x - 200, SPAWN.y]]);
  await page.waitForTimeout(500);
  const s = await enemyState(page, i);
  expect(s.x).toBeGreaterThan(SPAWN.x - 200);
  expect(s.vx).toBeCloseTo(ENEMIES.types.grunt.speed, 0);
  expect(Math.abs(s.vy)).toBeLessThan(1);
  expect(s.flipX).toBe(false);

  // And faces left when chasing from the other side.
  const [j] = await spawnAt(page, 'grunt', [[SPAWN.x + 200, SPAWN.y - 100]]);
  await page.waitForTimeout(300);
  expect((await enemyState(page, j)).flipX).toBe(true);
});

test('ten Grunts on one point spread out instead of stacking', async ({ page }) => {
  await directorOff(page);
  const pts = Array.from({ length: 10 }, () => [SPAWN.x - 250, SPAWN.y]);
  const idx = await spawnAt(page, 'grunt', pts);
  await page.waitForTimeout(2000);
  const states = await Promise.all(idx.map((i) => enemyState(page, i)));
  const keys = new Set(states.map((s) => `${s.x.toFixed(3)},${s.y.toFixed(3)}`));
  expect(keys.size).toBe(10);
  let spread = 0;
  for (const a of states) for (const b of states) spread = Math.max(spread, Math.hypot(a.x - b.x, a.y - b.y));
  expect(spread).toBeGreaterThan(32);
});

test('an enemy chasing across an obstacle never overlaps a wall tile', async ({ page }) => {
  await directorOff(page);
  // Player right of the column-14 wall run, enemies on the far side of it.
  await page.evaluate(([x, y]) => window.__GAME__.scene.getScene('Game').player.body.reset(x, y), [620, 640]);
  const idx = await spawnAt(page, 'brute', [[300, 640]]);
  idx.push(...(await spawnAt(page, 'grunt', [[300, 600]])));
  idx.push(...(await spawnAt(page, 'runner', [[300, 700]])));
  const w = await watch(page, 4000);
  expect(w.frames).toBeGreaterThan(30);
  expect(w.maxOverlap).toBe(0);
  for (const i of idx) {
    const s = await enemyState(page, i);
    // Still on the near side of the run or gone round its end; never through it.
    if (s.y > 544 && s.y < 736) expect(s.body.right).toBeLessThanOrEqual(WALL_RUN_LEFT + 0.5);
  }
});

test('enemies do not push the player', async ({ page }) => {
  await directorOff(page);
  await spawnAt(page, 'runner', [
    [SPAWN.x - 80, SPAWN.y],
    [SPAWN.x + 80, SPAWN.y],
  ]);
  await spawnAt(page, 'brute', [[SPAWN.x, SPAWN.y - 90]]);
  const w = await watch(page, 2000);
  expect(w.playerMoved).toBe(0);
});

test('an enemy beyond the recycle distance goes back to the pool', async ({ page }) => {
  await directorOff(page);
  // One call, so the far one can't be recycled (and its slot reused) before the near one spawns.
  const [i, j] = await spawnAt(page, 'grunt', [
    [SPAWN.x - ENEMIES.recycleDistance - 40, SPAWN.y],
    [SPAWN.x - 200, SPAWN.y],
  ]);
  await page.waitForTimeout(200);
  expect((await enemyState(page, i)).active).toBe(false);
  expect((await enemyState(page, j)).active).toBe(true);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').enemies.liveCount)).toBe(1);
});

test('ring spawns are fully out of view and never on a wall', async ({ page }) => {
  await directorOff(page);
  // Try with the player in the middle and in a corner (camera clamped to the map edge).
  for (const [px, py] of [
    [SPAWN.x, SPAWN.y],
    [60, 60],
  ]) {
    const result = await page.evaluate(
      ([x, y]) => {
        const scene = window.__GAME__.scene.getScene('Game');
        const { enemies, arena } = scene;
        scene.player.body.reset(x, y);
        scene.cameras.main.centerOn(x, y);
        // preRender applies the follow/bounds clamp, as it would on the next frame.
        scene.cameras.main.preRender();
        const view = scene.cameras.main.worldView;
        const bad = [];
        let spawned = 0;
        for (let n = 0; n < 60; n++) {
          const typeId = ['grunt', 'runner', 'brute'][n % 3];
          const e = enemies.spawnRing(typeId);
          if (!e) continue;
          spawned++;
          const half = e.width / 2;
          const inView =
            e.x + half > view.left && e.x - half < view.right && e.y + half > view.top && e.y - half < view.bottom;
          const b = e.body;
          let solid = false;
          for (let sx = b.left + 1; sx <= b.right - 1; sx += 4)
            for (let sy = b.top + 1; sy <= b.bottom - 1; sy += 4) solid ||= arena.isSolidAt(sx, sy);
          if (inView || solid) bad.push({ typeId, x: e.x, y: e.y, inView, solid });
          e.despawn();
        }
        return { spawned, bad };
      },
      [px, py],
    );
    expect(result.bad).toEqual([]);
    expect(result.spawned).toBeGreaterThan(40);
  }
});

test('the pool is reused and an exhausted pool spawns nothing without errors', async ({ page }) => {
  await directorOff(page);
  const r = await page.evaluate(
    ([x, y]) => {
      const { enemies } = window.__GAME__.scene.getScene('Game');
      enemies.director.enabled = false;
      const all = [];
      for (let n = 0; n < enemies.group.maxSize; n++) all.push(enemies.spawnAt('grunt', x + (n % 10) * 20, y));
      const extra = enemies.spawnAt('grunt', x, y);
      const full = enemies.group.getLength();
      for (const e of all) e.despawn();
      for (let n = 0; n < 20; n++) enemies.spawnAt('runner', x, y);
      return { allOk: all.every(Boolean), extra, full, after: enemies.group.getLength(), live: enemies.liveCount };
    },
    [SPAWN.x - 100, SPAWN.y],
  );
  expect(r.allOk).toBe(true);
  expect(r.extra).toBeNull();
  expect(r.full).toBe(ENEMIES.poolSize);
  expect(r.after).toBe(ENEMIES.poolSize);
  expect(r.live).toBe(20);
});

/** Record every spawn the director makes: type, position, and whether it was in view or on a wall. */
function recordSpawns(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { enemies, arena } = scene;
    window.__SPAWNS__ = [];
    const spawnAt = enemies.spawnAt.bind(enemies);
    enemies.spawnAt = (typeId, x, y) => {
      const e = spawnAt(typeId, x, y);
      if (!e) return e;
      const view = scene.cameras.main.worldView;
      const half = e.width / 2;
      const b = e.body;
      let solid = false;
      for (let sx = b.left + 1; sx <= b.right - 1; sx += 4)
        for (let sy = b.top + 1; sy <= b.bottom - 1; sy += 4) solid ||= arena.isSolidAt(sx, sy);
      window.__SPAWNS__.push({
        typeId,
        t: scene.survivalMs,
        inView: e.x + half > view.left && e.x - half < view.right && e.y + half > view.top && e.y - half < view.bottom,
        solid,
      });
      return e;
    };
  });
}

test('the director starts with Grunts only, out of view and off walls', async ({ page }) => {
  await recordSpawns(page);
  await page.waitForFunction(() => window.__SPAWNS__.length >= 4, null, { timeout: 15000 });
  const spawns = await page.evaluate(() => window.__SPAWNS__);
  for (const s of spawns) {
    expect(s.typeId).toBe('grunt');
    expect(s.inView).toBe(false);
    expect(s.solid).toBe(false);
    expect(s.t).toBeGreaterThanOrEqual(ENEMIES.spawn.startDelayMs);
  }
});

test('the live count never passes the cap', async ({ page }) => {
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').enemies.director.capOverride = 3;
  });
  // At the opening interval (1.4 s) about 5 spawns are due in 8 s of game time; only 3 may be alive.
  const w = await watch(page, 8000);
  expect(w.maxLive).toBe(3);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').enemies.liveCount)).toBe(3);
});

test('pausing the Game scene stops survival time and spawning', async ({ page }) => {
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').survivalMs > 1500);
  const before = await page.evaluate(() => {
    const game = window.__GAME__;
    game.scene.pause('Game');
    const s = game.scene.getScene('Game');
    return { t: s.survivalMs, live: s.enemies.liveCount };
  });
  await page.waitForTimeout(3000);
  const paused = await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    return { t: s.survivalMs, live: s.enemies.liveCount };
  });
  expect(paused).toEqual(before);
  // Braces: returning the SceneManager would make Playwright serialize the whole game (~10 s).
  await page.evaluate(() => {
    window.__GAME__.scene.resume('Game');
  });
  await page.waitForFunction((t) => window.__GAME__.scene.getScene('Game').survivalMs > t + 200, before.t);
});

test('real enemy art is drawn untinted', async ({ page }) => {
  await directorOff(page);
  const ids = await Promise.all([
    spawnAt(page, 'grunt', [[SPAWN.x - 200, SPAWN.y]]),
    spawnAt(page, 'runner', [[SPAWN.x + 200, SPAWN.y]]),
    spawnAt(page, 'brute', [[SPAWN.x, SPAWN.y - 200]]),
  ]).then((xs) => xs.flat());
  const tints = await Promise.all(ids.map(async (i) => (await enemyState(page, i)).tint));
  expect(tints).toEqual([0xffffff, 0xffffff, 0xffffff]);
});

test('placeholder Grunts and Runners are tinted differently', async ({ page }) => {
  await directorOff(page);
  // All GH-17 art is delivered now, so mark the walk sheets as placeholders the way Preload would.
  await page.evaluate(() => {
    const { enemies } = window.__GAME__.scene.getScene('Game');
    enemies.placeholders = new Set(['enemy_grunt_walk', 'enemy_runner_walk', 'enemy_brute_walk']);
  });
  const [g, r, b] = await Promise.all([
    spawnAt(page, 'grunt', [[SPAWN.x - 200, SPAWN.y]]),
    spawnAt(page, 'runner', [[SPAWN.x + 200, SPAWN.y]]),
    spawnAt(page, 'brute', [[SPAWN.x, SPAWN.y - 200]]),
  ]).then((xs) => xs.flat());
  const tints = await Promise.all([g, r, b].map(async (i) => (await enemyState(page, i)).tint));
  expect(tints).toEqual([
    ENEMIES.types.grunt.placeholderTint,
    ENEMIES.types.runner.placeholderTint,
    ENEMIES.types.brute.placeholderTint,
  ]);
  expect(new Set(tints).size).toBe(3);
});
