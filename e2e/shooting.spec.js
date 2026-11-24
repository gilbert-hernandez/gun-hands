import { test, expect } from '@playwright/test';
import { WEAPON } from '../src/config/weapon.js';
import arenaMap from '../src/assets/maps/gh_arena.json' with { type: 'json' };
import { DISPLAY } from '../src/config/display.js';

// Aiming, auto-fire, bullet stats, pooling and pierce (GH-3).
// Frame timing in headless swiftshader is uneven, so rates are measured against the game's own
// frame deltas (summed in the page) instead of wall-clock time, with the tolerances the spec allows.

const DEG = Math.PI / 180;
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
  await installRecorder(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

/**
 * Record every shot in the page: the bullets each `player-fired` event launched (wrapping the
 * pool's `fire`), summed game time, and the largest pool size seen. Lives on `window.__rec`.
 */
function installRecorder(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const rec = { shots: [], pending: [], gameMs: 0, maxPool: 0, wrap: null };
    rec.wrap = (pool) => {
      const orig = pool.fire.bind(pool);
      pool.fire = (...args) => {
        const b = orig(...args);
        rec.pending.push(b);
        return b;
      };
    };
    rec.wrap(scene.player.bullets);
    scene.events.on('player-fired', (e) => {
      const bullets = rec.pending.filter(Boolean).map((b) => ({
        ref: b,
        x: b.x,
        y: b.y,
        vx: b.body.velocity.x,
        vy: b.body.velocity.y,
        rotation: b.rotation,
        damage: b.damage,
        pierceLeft: b.pierceLeft,
      }));
      rec.shots.push({ ...e, requested: rec.pending.length, bullets });
      rec.pending = [];
    });
    scene.events.on('update', (_t, d) => {
      rec.gameMs += d;
      rec.maxPool = Math.max(rec.maxPool, scene.player.bullets.group.getLength());
    });
    window.__rec = rec;
  });
}

/** Clear recorded shots and game time. */
function resetRec(page) {
  return page.evaluate(() => {
    window.__rec.shots = [];
    window.__rec.gameMs = 0;
    window.__rec.maxPool = 0;
  });
}

/** Wait until `ms` of game time has passed since the last reset. */
function waitGameMs(page, ms) {
  return page.waitForFunction((t) => window.__rec.gameMs >= t, ms, { timeout: 60000 });
}

/** Shots recorded since the last reset, without object references. */
function shots(page) {
  return page.evaluate(() =>
    window.__rec.shots.map(({ bullets, ...s }) => ({ ...s, bullets: bullets.map(({ ref: _ref, ...b }) => b) })),
  );
}

/** Wait for the next shot and return it. */
async function nextShot(page) {
  await resetRec(page);
  await page.waitForFunction(() => window.__rec.shots.length > 0, null, { timeout: 10000 });
  return (await shots(page))[0];
}

function state(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const p = scene.player;
    const cam = scene.cameras.main;
    const ptr = scene.input.activePointer;
    const world = cam.getWorldPoint(ptr.x, ptr.y);
    return {
      x: p.x,
      y: p.y,
      aim: p.aim,
      rotation: p.guns.rotation,
      flipY: p.guns.flipY,
      pointer: { x: world.x, y: world.y },
      cam: { scrollX: cam.scrollX, scrollY: cam.scrollY },
    };
  });
}

/** Move the mouse to the screen position `dx, dy` px (game pixels) away from the player. */
async function pointAt(page, dx, dy) {
  const box = await page.locator('#game canvas').boundingBox();
  const scale = box.width / DISPLAY.width;
  const s = await state(page);
  await page.mouse.move(box.x + (s.x - s.cam.scrollX + dx) * scale, box.y + (s.y - s.cam.scrollY + dy) * scale);
}

/** Smallest difference between two angles, in degrees. */
function angleDiffDeg(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) / DEG;
}

function setWeapon(page, patch) {
  return page.evaluate((p) => {
    const w = window.__GAME__.scene.getScene('Game').player.weapon;
    Object.assign(w, p.weapon ?? {});
    Object.assign(w.bullet, p.bullet ?? {});
  }, patch);
}

function teleport(page, x, y) {
  return page.evaluate(([px, py]) => window.__GAME__.scene.getScene('Game').player.body.reset(px, py), [x, y]);
}

test('points right and fires right before the mouse moves', async ({ page }) => {
  const s = await state(page);
  expect(s.rotation).toBe(0);
  expect(s.flipY).toBe(false);
  const shot = await nextShot(page);
  expect(shot.angle).toBe(0);
  expect(shot.bullets[0].vx).toBeGreaterThan(0);
  expect(shot.bullets[0].vy).toBeCloseTo(0, 6);
});

test('guns rotate toward the pointer (±1°) and flip vertically when aiming left', async ({ page }) => {
  await pointAt(page, 150, -100);
  await page.waitForTimeout(200);
  let s = await state(page);
  const expected = Math.atan2(s.pointer.y - s.y, s.pointer.x - s.x);
  expect(angleDiffDeg(s.rotation, expected)).toBeLessThanOrEqual(1);
  expect(s.flipY).toBe(false);

  await pointAt(page, -150, 60);
  await page.waitForTimeout(200);
  s = await state(page);
  expect(angleDiffDeg(s.rotation, Math.atan2(s.pointer.y - s.y, s.pointer.x - s.x))).toBeLessThanOrEqual(1);
  expect(Math.abs(s.rotation)).toBeGreaterThan(Math.PI / 2);
  expect(s.flipY).toBe(true);

  // Bullets go where the guns point.
  const shot = await nextShot(page);
  expect(angleDiffDeg(Math.atan2(shot.bullets[0].vy, shot.bullets[0].vx), s.rotation)).toBeLessThanOrEqual(1);
});

test('aim stays on the world point under a still mouse while the camera scrolls', async ({ page }) => {
  await pointAt(page, 250, 120);
  await page.waitForTimeout(200);
  // Check every frame, after physics has moved the player (same moment the guns are synced).
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    window.__aimErr = { max: 0, frames: 0 };
    scene.events.on('postupdate', () => {
      const p = scene.player;
      const ptr = scene.input.activePointer;
      const w = scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const want = Math.atan2(w.y - p.y, w.x - p.x);
      const d = Math.abs(Math.atan2(Math.sin(p.guns.rotation - want), Math.cos(p.guns.rotation - want)));
      window.__aimErr.max = Math.max(window.__aimErr.max, (d * 180) / Math.PI);
      window.__aimErr.frames++;
    });
  });
  const before = await state(page);
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyS');
  const after = await state(page);
  expect(after.cam.scrollY).toBeGreaterThan(before.cam.scrollY + 50);
  const err = await page.evaluate(() => window.__aimErr);
  expect(err.frames).toBeGreaterThan(10);
  // The aim uses this frame's pre-physics position; one step of movement is < 2° at this range.
  expect(err.max).toBeLessThan(2);

  // Once the camera settles, it's exact again.
  await page.waitForTimeout(1500);
  const s = await state(page);
  expect(angleDiffDeg(s.rotation, Math.atan2(s.pointer.y - s.y, s.pointer.x - s.x))).toBeLessThanOrEqual(1);
});

test('fires about 8 shots in 2 s at 4 shots/s', async ({ page }) => {
  expect(WEAPON.fireRate).toBe(4);
  await page.waitForTimeout(300);
  await resetRec(page);
  await waitGameMs(page, 2000);
  const n = (await shots(page)).length;
  expect(n).toBeGreaterThanOrEqual(7);
  expect(n).toBeLessThanOrEqual(9);
});

test('no shots while the Game scene is paused', async ({ page }) => {
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').scene.pause();
  });
  await resetRec(page);
  await page.waitForTimeout(1000);
  expect(await shots(page)).toHaveLength(0);

  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').scene.resume();
  });
  await page.waitForFunction(() => window.__rec.shots.length > 0, null, { timeout: 5000 });
});

test('bullets fly at the configured speed along the aim and carry the configured damage', async ({ page }) => {
  await pointAt(page, 120, 160);
  await page.waitForTimeout(200);
  const shot = await nextShot(page);
  expect(shot.bullets).toHaveLength(1);
  const b = shot.bullets[0];
  expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(WEAPON.bullet.speed, 3);
  expect(angleDiffDeg(Math.atan2(b.vy, b.vx), shot.angle)).toBeLessThan(0.01);
  expect(b.damage).toBe(WEAPON.bullet.damage);
  expect(b.pierceLeft).toBe(WEAPON.bullet.pierce);
  // Leaves from the gun tip.
  const s = await state(page);
  expect(Math.hypot(b.x - s.x, b.y - s.y)).toBeLessThan(WEAPON.muzzleOffset + 10);
});

test('changing the per-run stats affects the next bullet, not the config or a new session', async ({ page }) => {
  await setWeapon(page, { bullet: { speed: WEAPON.bullet.speed * 2 } });
  const shot = await nextShot(page);
  const b = shot.bullets[0];
  expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(WEAPON.bullet.speed * 2, 3);

  // The game's own config module is unchanged.
  const live = await page.evaluate(async () => (await import('/src/config/weapon.js')).WEAPON.bullet.speed);
  expect(live).toBe(WEAPON.bullet.speed);

  // A new session starts from the config again.
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').scene.restart();
  });
  await page.waitForFunction(() => {
    const p = window.__GAME__.scene.getScene('Game')?.player;
    return p?.body && p.scene?.sys.isActive();
  });
  await installRecorder(page);
  const again = await nextShot(page);
  expect(Math.hypot(again.bullets[0].vx, again.bullets[0].vy)).toBeCloseTo(WEAPON.bullet.speed, 3);
  // One event per shot after restarting (no duplicate listeners).
  await resetRec(page);
  await waitGameMs(page, 1000);
  const n = (await shots(page)).length;
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(5);
});

test('count 3 with a 30° spread fires three bullets at -15°, 0 and +15°', async ({ page }) => {
  await setWeapon(page, { bullet: { count: 3, spreadDeg: 30 } });
  await pointAt(page, 100, -140);
  await page.waitForTimeout(200);
  const shot = await nextShot(page);
  expect(shot.bullets).toHaveLength(3);
  const offsets = shot.bullets
    .map(
      (b) =>
        Math.atan2(Math.sin(Math.atan2(b.vy, b.vx) - shot.angle), Math.cos(Math.atan2(b.vy, b.vx) - shot.angle)) / DEG,
    )
    .sort((a, b) => a - b);
  expect(offsets[0]).toBeCloseTo(-15, 3);
  expect(offsets[1]).toBeCloseTo(0, 3);
  expect(offsets[2]).toBeCloseTo(15, 3);
});

test('count 1 ignores the spread angle', async ({ page }) => {
  await setWeapon(page, { bullet: { count: 1, spreadDeg: 90 } });
  const shot = await nextShot(page);
  expect(shot.bullets).toHaveLength(1);
  expect(angleDiffDeg(Math.atan2(shot.bullets[0].vy, shot.bullets[0].vx), shot.angle)).toBeLessThan(0.01);
});

test('a bullet despawns when its lifetime ends, inside the arena', async ({ page }) => {
  await setWeapon(page, { bullet: { lifetime: 300 } });
  // Track the next bullet from the moment it is fired, in the page: a round trip from the test
  // can take longer than the 300 ms lifetime, and by then the pool may have reused the object.
  // Lifetime runs on the game loop clock, while physics distance depends on frame pacing (Phaser
  // caps the physics delta when headless frames stall), so this checks time, not distance.
  const r = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const scene = window.__GAME__.scene.getScene('Game');
        const loop = scene.game.loop;
        const pool = scene.player.bullets;
        const fire = pool.fire;
        pool.fire = (...args) => {
          const b = fire.apply(pool, args);
          if (!b) return b;
          pool.fire = fire;
          const t0 = loop.time;
          b.despawn = () => {
            delete b.despawn;
            const out = {
              ms: loop.time - t0,
              expired: loop.time >= b.expiresAt,
              nearWall: scene.arena.isSolidAt(b.x + 16, b.y),
            };
            b.despawn();
            resolve({ ...out, visible: b.visible, enabled: b.body.enable });
          };
          return b;
        };
      }),
  );
  expect(r.visible).toBe(false);
  expect(r.enabled).toBe(false);
  // Fired right from the spawn with no wall in front of it, so the lifetime ended it: not before
  // 300 ms (one frame of slack), and on the first update at or after its expiry time. Distance and
  // an upper time bound aren't checked: stalled headless frames make both unreliable.
  expect(r.nearWall).toBe(false);
  expect(r.expired).toBe(true);
  expect(r.ms).toBeGreaterThanOrEqual(250);
});

test('a bullet despawns when it leaves the arena', async ({ page }) => {
  await setWeapon(page, { bullet: { lifetime: 100000 } });
  // Walls normally stop bullets first (GH-4); switch that off to test the world-bounds fallback.
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').bulletWalls.active = false;
  });
  await teleport(page, 60, (arenaMap.height * arenaMap.tileheight) / 2);
  await page.waitForTimeout(500);
  await pointAt(page, -40, 0);
  await page.waitForTimeout(200);
  const shot = await nextShot(page);
  expect(shot.bullets[0].vx).toBeLessThan(0);
  await page.evaluate(() => {
    window.__tracked = window.__rec.shots[0].bullets[0].ref;
  });
  await page.waitForFunction(() => !window.__tracked.active, null, { timeout: 5000 });
  const x = await page.evaluate(() => window.__tracked.x);
  expect(x).toBeLessThan(0);
  expect(x).toBeGreaterThan(-30);
});

test('10 s of heavy firing never exceeds the pool size', async ({ page }) => {
  test.setTimeout(90000);
  // 20 shots/s x 5 bullets x 1.2 s = 120 alive at the peak: right at the pool size.
  await setWeapon(page, { weapon: { fireRate: 20 }, bullet: { count: 5, spreadDeg: 40 } });
  await resetRec(page);
  await waitGameMs(page, 10000);
  const r = await page.evaluate(() => ({
    maxPool: window.__rec.maxPool,
    len: window.__GAME__.scene.getScene('Game').bullets.group.getLength(),
    shots: window.__rec.shots.length,
  }));
  expect(r.shots).toBeGreaterThan(100);
  expect(r.maxPool).toBeLessThanOrEqual(WEAPON.poolSize);
  expect(r.len).toBeLessThanOrEqual(WEAPON.poolSize);
});

test('an exhausted pool fires what it can and skips the rest without errors', async ({ page }) => {
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const Bullets = scene.bullets.constructor;
    const small = new Bullets(scene, 2);
    window.__rec.wrap(small);
    scene.player.bullets = small;
    scene.player.weapon.bullet.count = 5;
  });
  const shot = await nextShot(page);
  expect(shot.requested).toBe(5);
  expect(shot.bullets).toHaveLength(2);
  await resetRec(page);
  await waitGameMs(page, 1500);
  const r = await page.evaluate(() => ({
    len: window.__GAME__.scene.getScene('Game').player.bullets.group.getLength(),
    shots: window.__rec.shots.length,
  }));
  expect(r.len).toBe(2);
  expect(r.shots).toBeGreaterThanOrEqual(4);
});

test('bullet.hit() honors pierce', async ({ page }) => {
  await setWeapon(page, { bullet: { pierce: 1 } });
  await nextShot(page);
  const pierce1 = await page.evaluate(() => {
    const b = window.__rec.shots[0].bullets[0].ref;
    const first = b.hit();
    const afterFirst = b.active;
    const second = b.hit();
    return { first, afterFirst, second, afterSecond: b.active };
  });
  expect(pierce1).toEqual({ first: true, afterFirst: true, second: false, afterSecond: false });

  await setWeapon(page, { bullet: { pierce: 0 } });
  await nextShot(page);
  const pierce0 = await page.evaluate(() => {
    const b = window.__rec.shots[0].bullets[0].ref;
    return { hit: b.hit(), active: b.active };
  });
  expect(pierce0).toEqual({ hit: false, active: false });
});

test('each shot shows the muzzle flash at the gun tip; no duplicate events after a new session', async ({ page }) => {
  await pointAt(page, 140, 90);
  await page.waitForTimeout(200);
  // Capture the flash in the same frame as the shot.
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    window.__flash = [];
    window.__rec.shots = []; // only shots from now on, checked in their own frame
    scene.events.on('postupdate', () => {
      const last = window.__rec.shots.at(-1);
      if (!last || last.flashChecked) return;
      last.flashChecked = true;
      const m = scene.muzzle;
      window.__flash.push({ visible: m.visible, dx: m.x - last.x, dy: m.y - last.y, dr: m.rotation - last.angle });
    });
  });
  await resetRec(page);
  await waitGameMs(page, 1000);
  const flashes = await page.evaluate(() => window.__flash);
  expect(flashes.length).toBeGreaterThanOrEqual(3);
  for (const f of flashes) expect(f).toEqual({ visible: true, dx: 0, dy: 0, dr: 0 });
  // It hides between shots (60 ms flash, 250 ms interval).
  await page.waitForFunction(() => !window.__GAME__.scene.getScene('Game').muzzle.visible, null, { timeout: 2000 });

  // Game -> GameOver -> Title -> Game, then count events against the game's own shot count.
  await page.keyboard.press('KeyG');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('GameOver'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => window.__GAME__.scene.getScene('Game')?.player?.body && window.__GAME__.scene.isActive('Game'),
  );
  const r = await page.evaluate(async () => {
    const scene = window.__GAME__.scene.getScene('Game');
    let events = 0;
    let flashes = 0;
    const onFired = () => events++;
    scene.events.on('player-fired', onFired);
    const vis = scene.muzzle.setVisible.bind(scene.muzzle);
    scene.muzzle.setVisible = (v) => {
      if (v) flashes++;
      return vis(v);
    };
    await new Promise((res) => setTimeout(res, 1500));
    scene.events.off('player-fired', onFired);
    return { events, flashes, listeners: scene.events.listenerCount('player-fired') };
  });
  expect(r.events).toBeGreaterThan(0);
  // One flash per event: a leftover listener from the first session would double it.
  expect(r.flashes).toBe(r.events);
  // The recorder from the first session plus GameScene's own listener; no Player/scene leftovers.
  expect(r.listeners).toBe(2);
});
