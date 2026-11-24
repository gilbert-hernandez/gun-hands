import { test, expect } from '@playwright/test';
import { ENEMIES } from '../src/config/enemies.js';
import { PLAYER } from '../src/config/player.js';
import { POWERUPS } from '../src/config/powerups.js';
import { WEAPON } from '../src/config/weapon.js';

// Loot powerups (GH-9): drops, pickups on the floor, the six effects, timers, pausing, and the
// debug key. Every test turns the wave director, the player's auto-fire, powerup drops, and the
// XP magnet off unless it needs them. Timers are set directly and tests wait on state fields,
// not wall-clock time (see the GH-4/GH-6 timing notes). Events land in window.__ev.

const T = POWERUPS.types;
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
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.powerups);
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { enemies, player, powerups } = scene;
    enemies.director.enabled = false;
    for (const e of enemies.group.getChildren()) if (e.active) e.despawn();
    // An own property shadows Player.prototype.fire; `delete player.fire` turns auto-fire back on.
    player.fire = () => {};
    player.pickupRadius = 0;
    powerups.dropChance = { grunt: 0, runner: 0, brute: 0 };
    window.__ev = [];
    for (const name of ['powerup-collected', 'powerup-expired', 'player-hit']) {
      scene.events.on(name, (data) => window.__ev.push({ name, ...data }));
    }
  });
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

function events(page, name) {
  return page.evaluate((n) => window.__ev.filter((e) => !n || e.name === n), name);
}

function waitEvent(page, name, count = 1) {
  return page.waitForFunction(([n, c]) => window.__ev.filter((e) => e.name === n).length >= c, [name, count], {
    timeout: 10000,
  });
}

/** Wait until `ms` of game loop time has passed (runs while Game is paused, too). */
function waitGameMs(page, ms) {
  return page.evaluate(
    (d) =>
      new Promise((resolve) => {
        const loop = window.__GAME__.loop;
        const t0 = loop.time;
        const check = () => {
          if (loop.time - t0 >= d) {
            window.__GAME__.events.off('postrender', check);
            resolve(undefined);
          }
        };
        window.__GAME__.events.on('postrender', check);
      }),
    ms,
  );
}

/** Active pickups as plain data. */
function pickups(page) {
  return page.evaluate(() =>
    window.__GAME__.scene
      .getScene('Game')
      .powerups.pickups.group.getChildren()
      .filter((p) => p.active)
      .map((p) => ({ id: p.id, x: p.x, y: p.y, msLeft: p.msLeft, visible: p.visible, tint: p.tintTopLeft })),
  );
}

/** Drop a pickup at an offset from the player. Returns false when the pool was full. */
function dropAt(page, dx, dy, id) {
  return page.evaluate(
    ([x, y, i]) => {
      const { powerups, player } = window.__GAME__.scene.getScene('Game');
      return powerups.pickups.drop(player.x + x, player.y + y, i) !== null;
    },
    [dx, dy, id],
  );
}

function collect(page, id) {
  return page.evaluate((i) => window.__GAME__.scene.getScene('Game').powerups.collect(i), id);
}

function active(page) {
  return page.evaluate(() => ({ ...window.__GAME__.scene.getScene('Game').powerups.active }));
}

/**
 * Turn auto-fire on and count shots and bullets over `ms` of Game time (summed scene deltas,
 * so it is independent of frame rate).
 */
function measureFire(page, ms) {
  return page.evaluate(
    (d) =>
      new Promise((resolve) => {
        const scene = window.__GAME__.scene.getScene('Game');
        const { player } = scene;
        const pool = player.bullets;
        const fire = pool.fire;
        let shots = 0;
        let bullets = 0;
        let elapsed = 0;
        pool.fire = (...args) => {
          bullets++;
          return fire.apply(pool, args);
        };
        const onFired = () => shots++;
        const onUpdate = (_t, delta) => {
          elapsed += delta;
          if (elapsed < d) return;
          scene.events.off('update', onUpdate);
          scene.events.off('player-fired', onFired);
          pool.fire = fire;
          player.fire = () => {};
          resolve({ shots, bullets });
        };
        scene.events.on('player-fired', onFired);
        scene.events.on('update', onUpdate);
        delete player.fire;
      }),
    ms,
  );
}

function boosted(page) {
  return page.evaluate(() => {
    const { player } = window.__GAME__.scene.getScene('Game');
    const b = player.boosts();
    return {
      fireRate: b.fireRate,
      count: b.bullet.count,
      spreadDeg: b.bullet.spreadDeg,
      base: {
        fireRate: player.weapon.fireRate,
        count: player.weapon.bullet.count,
        spreadDeg: player.weapon.bullet.spreadDeg,
      },
    };
  });
}

test('a forced drop puts a pickup and an XP gem where the enemy died; a zero chance drops none', async ({ page }) => {
  const r = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { enemies, combat, powerups, xp, player } = scene;
    const at = { x: player.x + 200, y: player.y };
    combat.killEnemy(enemies.spawnAt('grunt', at.x, at.y));
    const afterZero = powerups.pickups.liveCount;
    powerups.dropChance = { grunt: 1, runner: 0, brute: 0 };
    combat.killEnemy(enemies.spawnAt('grunt', at.x, at.y));
    const gems = xp.gems.group.getChildren().filter((g) => g.active);
    const life = powerups.pickups.group.getChildren().find((p) => p.active)?.msLeft;
    return { at, afterZero, life, gems: gems.map((g) => ({ x: g.x, y: g.y })) };
  });
  expect(r.afterZero).toBe(0);
  const ps = await pickups(page);
  expect(ps).toHaveLength(1);
  expect(ps[0]).toMatchObject({ x: r.at.x, y: r.at.y });
  expect(r.life).toBe(POWERUPS.lifetimeMs);
  expect(Object.keys(T)).toContain(ps[0].id);
  // One gem per kill, at the kill spot.
  expect(r.gems).toEqual([
    { x: r.at.x, y: r.at.y },
    { x: r.at.x, y: r.at.y },
  ]);
});

test('drops use the weighted pick with the session rng', async ({ page }) => {
  const ids = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { enemies, combat, powerups, player } = scene;
    powerups.dropChance = { grunt: 1, runner: 1, brute: 1 };
    // rng 0 -> drop passes and the first weighted id is picked.
    powerups.rng = () => 0;
    combat.killEnemy(enemies.spawnAt('brute', player.x + 200, player.y));
    return powerups.pickups.group
      .getChildren()
      .filter((p) => p.active)
      .map((p) => p.id);
  });
  expect(ids).toEqual([Object.keys(POWERUPS.weights)[0]]);
});

test('walking over a pickup collects it and applies it', async ({ page }) => {
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').player.hp = 50;
  });
  await dropAt(page, 60, 0, 'health');
  await page.keyboard.down('KeyD');
  await waitEvent(page, 'powerup-collected');
  await page.keyboard.up('KeyD');
  expect(await events(page, 'powerup-collected')).toEqual([{ name: 'powerup-collected', id: 'health' }]);
  expect(await pickups(page)).toEqual([]);
  const hp = await page.evaluate(() => window.__GAME__.scene.getScene('Game').player.hp);
  expect(hp).toBe(50 + T.health.heal);
});

test('a pickup inside the XP pickup radius but outside the collect radius stays put', async ({ page }) => {
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').player.pickupRadius = 200;
  });
  await dropAt(page, 50, 0, 'bomb');
  const before = await pickups(page);
  await waitGameMs(page, 600);
  const after = await pickups(page);
  expect(after).toHaveLength(1);
  expect({ x: after[0].x, y: after[0].y }).toEqual({ x: before[0].x, y: before[0].y });
  expect(await events(page, 'powerup-collected')).toEqual([]);
});

test('each pickup has its own placeholder tint', async ({ page }) => {
  let dx = -250;
  for (const id of Object.keys(T)) {
    await dropAt(page, dx, -150, id);
    dx += 100;
  }
  const ps = await pickups(page);
  expect(new Set(ps.map((p) => p.tint)).size).toBe(6);
});

test('an uncollected pickup is steady, blinks in its last seconds, then despawns', async ({ page }) => {
  await dropAt(page, 200, 0, 'magnet');
  // Skip most of the lifetime, keeping 400 ms before the warning starts.
  await page.evaluate((ms) => {
    const { powerups } = window.__GAME__.scene.getScene('Game');
    const p = powerups.pickups.group.getChildren().find((c) => c.active);
    p.msLeft = ms;
    window.__vis = [];
    window.__GAME__.scene.getScene('Game').events.on('postupdate', () => {
      if (p.active) window.__vis.push({ ms: p.msLeft, visible: p.visible });
    });
  }, POWERUPS.warnMs + 400);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').powerups.pickups.liveCount === 0, null, {
    timeout: 15000,
  });
  const vis = await page.evaluate(() => window.__vis);
  const steady = vis.filter((v) => v.ms > POWERUPS.warnMs);
  const warning = vis.filter((v) => v.ms <= POWERUPS.warnMs);
  expect(steady.length).toBeGreaterThan(0);
  expect(steady.every((v) => v.visible)).toBe(true);
  expect(new Set(warning.map((v) => v.visible))).toEqual(new Set([true, false]));
  expect(await events(page, 'powerup-collected')).toEqual([]);
});

test('a full pickup pool skips new drops without errors', async ({ page }) => {
  for (let i = 0; i < POWERUPS.poolSize; i++) expect(await dropAt(page, -300 + i * 20, -200, 'health')).toBe(true);
  expect(await dropAt(page, 0, 200, 'health')).toBe(false);
  const n = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.powerups.dropChance = { grunt: 1, runner: 1, brute: 1 };
    scene.combat.killEnemy(scene.enemies.spawnAt('grunt', scene.player.x + 200, scene.player.y + 100));
    return scene.powerups.pickups.liveCount;
  });
  expect(n).toBe(POWERUPS.poolSize);
});

test('Rapid Fire doubles the measured fire rate without touching the weapon stats', async ({ page }) => {
  const base = await measureFire(page, 2000);
  await collect(page, 'rapidfire');
  const fast = await measureFire(page, 2000);
  expect(base.shots).toBeGreaterThanOrEqual(WEAPON.fireRate * 2 - 1);
  expect(base.shots).toBeLessThanOrEqual(WEAPON.fireRate * 2 + 1);
  const want = WEAPON.fireRate * T.rapidfire.fireRateMult * 2;
  expect(fast.shots).toBeGreaterThanOrEqual(want - 2);
  expect(fast.shots).toBeLessThanOrEqual(want + 2);
  const b = await boosted(page);
  expect(b.base.fireRate).toBe(WEAPON.fireRate);
  expect(await events(page, 'powerup-collected')).toEqual([
    { name: 'powerup-collected', id: 'rapidfire', durationMs: T.rapidfire.durationMs },
  ]);
});

test('Spread Shot fires the wider fan until it expires, then one bullet again', async ({ page }) => {
  await collect(page, 'spread');
  const during = await measureFire(page, 1000);
  expect(during.shots).toBeGreaterThan(0);
  expect(during.bullets).toBe(during.shots * (1 + T.spread.extraCount));
  const b = await boosted(page);
  expect(b.spreadDeg).toBe(WEAPON.bullet.spreadDeg + T.spread.extraSpreadDeg);
  expect(b.base).toEqual({ fireRate: WEAPON.fireRate, count: 1, spreadDeg: WEAPON.bullet.spreadDeg });
  // Run it out.
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').powerups.active.spread = 50;
  });
  await waitEvent(page, 'powerup-expired');
  expect(await events(page, 'powerup-expired')).toEqual([{ name: 'powerup-expired', id: 'spread' }]);
  expect(await active(page)).toEqual({});
  const after = await measureFire(page, 1000);
  expect(after.bullets).toBe(after.shots);
});

test('a refresh resets the timer without stacking and without an expiry', async ({ page }) => {
  await collect(page, 'rapidfire');
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').powerups.active.rapidfire = 3000;
  });
  await collect(page, 'rapidfire');
  const a = await active(page);
  // At most a frame has ticked since the refresh.
  expect(a.rapidfire).toBeGreaterThan(T.rapidfire.durationMs - 200);
  expect((await boosted(page)).fireRate).toBe(WEAPON.fireRate * T.rapidfire.fireRateMult);
  expect(await events(page, 'powerup-collected')).toHaveLength(2);
  expect(await events(page, 'powerup-expired')).toEqual([]);
});

test('Rapid Fire and Spread Shot together fire the fan at the boosted rate', async ({ page }) => {
  await collect(page, 'rapidfire');
  await collect(page, 'spread');
  const b = await boosted(page);
  expect(b.fireRate).toBe(WEAPON.fireRate * T.rapidfire.fireRateMult);
  expect(b.count).toBe(1 + T.spread.extraCount);
});

test('Multishot picked during Spread Shot stays after Spread Shot ends', async ({ page }) => {
  await collect(page, 'spread');
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').upgrades.choose('multishot'));
  expect((await boosted(page)).count).toBe(2 + T.spread.extraCount);
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').powerups.active.spread = 50;
  });
  await waitEvent(page, 'powerup-expired');
  const b = await boosted(page);
  expect(b.count).toBe(2);
  expect(b.base.count).toBe(2);
});

test('Shield blocks contact damage, and contact hurts again once it runs out', async ({ page }) => {
  await collect(page, 'shield');
  await page.evaluate(() => {
    const { enemies, player } = window.__GAME__.scene.getScene('Game');
    window.__brute = enemies.spawnAt('brute', player.x, player.y);
  });
  await waitGameMs(page, 600);
  let p = await page.evaluate(() => {
    const { player, powerups } = window.__GAME__.scene.getScene('Game');
    return { hp: player.hp, inv: player.invulnerableMs, aura: powerups.aura.visible };
  });
  expect(p).toEqual({ hp: PLAYER.maxHp, inv: 0, aura: true });
  expect(await events(page, 'player-hit')).toEqual([]);

  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').powerups.active.shield = 50;
  });
  await waitEvent(page, 'player-hit');
  p = await page.evaluate(() => {
    const { player, powerups } = window.__GAME__.scene.getScene('Game');
    return { hp: player.hp, aura: powerups.aura.visible };
  });
  expect(p).toEqual({ hp: PLAYER.maxHp - ENEMIES.types.brute.contactDamage, aura: false });
});

test('the shield aura blinks in the shield’s last seconds', async ({ page }) => {
  await collect(page, 'shield');
  await page.evaluate((ms) => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.powerups.active.shield = ms;
    window.__vis = [];
    scene.events.on('postupdate', () => {
      const left = scene.powerups.active.shield;
      if (left) window.__vis.push({ ms: left, visible: scene.powerups.aura.visible });
    });
  }, POWERUPS.shieldWarnMs + 300);
  await waitEvent(page, 'powerup-expired');
  const vis = await page.evaluate(() => window.__vis);
  expect(vis.filter((v) => v.ms > POWERUPS.shieldWarnMs).every((v) => v.visible)).toBe(true);
  expect(new Set(vis.filter((v) => v.ms <= POWERUPS.shieldWarnMs).map((v) => v.visible))).toEqual(
    new Set([true, false]),
  );
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').powerups.aura.visible)).toBe(false);
});

test('Health Pack heals and caps at max HP', async ({ page }) => {
  const hp = await page.evaluate(() => {
    const { player, powerups } = window.__GAME__.scene.getScene('Game');
    player.hp = 50;
    powerups.collect('health');
    const first = player.hp;
    player.hp = player.maxHp - 10;
    powerups.collect('health');
    return [first, player.hp];
  });
  expect(hp).toEqual([50 + T.health.heal, PLAYER.maxHp]);
});

test('Bomb kills on-screen Grunts, spares off-screen ones, and hurts a Brute', async ({ page }) => {
  const r = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { enemies, player, powerups, combat, xp } = scene;
    const view = scene.cameras.main.worldView;
    const on = [
      [150, 0],
      [-150, 0],
      [0, 120],
      [0, -120],
    ].map(([dx, dy]) => enemies.spawnAt('grunt', player.x + dx, player.y + dy));
    const off = enemies.spawnAt('grunt', view.right + 120, player.y);
    const brute = enemies.spawnAt('brute', player.x + 200, player.y + 60);
    const kills = combat.kills;
    powerups.collect('bomb');
    return {
      killed: on.filter((e) => !e.active).length,
      kills: combat.kills - kills,
      gems: xp.gems.liveCount,
      off: { active: off.active, hp: off.hp },
      brute: { active: brute.active, hp: brute.hp, vx: brute.body.velocity.x, vy: brute.body.velocity.y },
      blast: scene.powerups.blast.visible,
    };
  });
  expect(r.killed).toBe(4);
  expect(r.kills).toBe(4);
  expect(r.gems).toBe(4);
  expect(r.off).toEqual({ active: true, hp: ENEMIES.types.grunt.hp });
  expect(r.brute.active).toBe(true);
  expect(r.brute.hp).toBe(ENEMIES.types.brute.hp - T.bomb.damage);
  // Pushed away from the player (the Brute is to the right and below).
  expect(r.brute.vx).toBeGreaterThan(0);
  expect(r.brute.vy).toBeGreaterThan(0);
  expect(r.blast).toBe(true);
  expect(await events(page, 'powerup-collected')).toEqual([{ name: 'powerup-collected', id: 'bomb' }]);
});

test('Magnet pulls every gem in the arena to the player', async ({ page }) => {
  await page.evaluate(() => {
    const { xp, player } = window.__GAME__.scene.getScene('Game');
    xp.gems.drop(player.x + 400, player.y, 'small');
    xp.gems.drop(player.x - 400, player.y, 'small');
    xp.gems.drop(player.x, player.y + 230, 'small');
  });
  await collect(page, 'magnet');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').xp.gems.liveCount === 0, null, {
    timeout: 10000,
  });
  const total = await page.evaluate(() => window.__GAME__.scene.getScene('Game').xp.progression.totalXp);
  expect(total).toBe(3);
});

test('powerup timers and pickup lifetimes stop while LevelUp is open', async ({ page }) => {
  await collect(page, 'rapidfire');
  await dropAt(page, 200, 0, 'bomb');
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').xp.grantLevel());
  await page.waitForFunction(() => {
    const lu = window.__GAME__.scene.getScene('LevelUp');
    return window.__GAME__.scene.isActive('LevelUp') && lu.ready && !lu.chosen;
  });
  const before = { timer: (await active(page)).rapidfire, life: (await pickups(page))[0].msLeft };
  await waitGameMs(page, 1500);
  const after = { timer: (await active(page)).rapidfire, life: (await pickups(page))[0].msLeft };
  expect(after).toEqual(before);
  await page.keyboard.press('1');
  await page.waitForFunction(
    () => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isActive('LevelUp'),
  );
});

test('after death nothing is collected and timers stop', async ({ page }) => {
  await collect(page, 'spread');
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.combat.damagePlayer(scene.player.hp, { force: true });
    scene.powerups.pickups.drop(scene.player.x, scene.player.y, 'health');
    window.__left = scene.powerups.active.spread;
  });
  await waitGameMs(page, 300);
  const r = await page.evaluate(() => {
    const { powerups } = window.__GAME__.scene.getScene('Game');
    return { left: powerups.active.spread, pickups: powerups.pickups.liveCount };
  });
  expect(r).toEqual({ left: await page.evaluate(() => window.__left), pickups: 1 });
});

test('a new session starts with no active powerups and no pickups', async ({ page }) => {
  await collect(page, 'shield');
  await collect(page, 'rapidfire');
  await dropAt(page, 200, 0, 'bomb');
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.combat.damagePlayer(scene.player.hp, { force: true });
  });
  await page.waitForFunction(() => window.__GAME__.scene.isActive('GameOver'), null, { timeout: 10000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const g = window.__GAME__.scene.getScene('Game');
    return window.__GAME__.scene.isActive('Game') && g.powerups && !g.player.dead;
  });
  const r = await page.evaluate(() => {
    const { powerups, player } = window.__GAME__.scene.getScene('Game');
    return {
      active: powerups.active,
      pickups: powerups.pickups.liveCount,
      shielded: powerups.isShielded(),
      fireRate: player.boosts().fireRate,
    };
  });
  expect(r).toEqual({ active: {}, pickups: 0, shielded: false, fireRate: WEAPON.fireRate });
});

test('debug key P drops each of the six powerups in turn in front of the player', async ({ page }) => {
  for (let i = 1; i <= 6; i++) {
    await page.keyboard.press('KeyP');
    await page.waitForFunction((n) => window.__GAME__.scene.getScene('Game').powerups.pickups.liveCount >= n, i);
  }
  // Phaser can occasionally handle one keydown twice (it processes the key queue both on the DOM
  // event and in the next step), which drops an extra pickup; harmless for a dev key, so check the
  // cycle covers all six rather than an exact count.
  const ps = await pickups(page);
  expect(new Set(ps.map((p) => p.id))).toEqual(new Set(Object.keys(T)));
  expect(ps.slice(0, 6).map((p) => p.id)).toEqual(['rapidfire', 'spread', 'shield', 'health', 'bomb', 'magnet']);
  expect(await events(page, 'powerup-collected')).toEqual([]);
});
