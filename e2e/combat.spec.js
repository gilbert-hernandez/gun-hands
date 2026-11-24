import { test, expect } from '@playwright/test';
import arenaMap from '../src/assets/maps/gh_arena.json' with { type: 'json' };
import { ENEMIES } from '../src/config/enemies.js';
import { PLAYER } from '../src/config/player.js';
import { COMBAT } from '../src/config/combat.js';

// Combat (GH-6): bullet hits on enemies, contact damage, invulnerability, death into GameOver,
// and the combat events. Every test turns the wave director and the player's auto-fire off,
// places enemies itself, and fires bullets by hand. Combat events are recorded in the page
// (window.__ev) as plain data. Positions refer to the shipped map: a vertical wall run in
// column 14, rows 17-22 (x 448-480, y 544-736), and the player spawn at the center of tile (30, 20).

const T = arenaMap.tilewidth;
const SPAWN = arenaMap.layers.find((l) => l.name === 'spawns').objects.find((o) => o.name === 'player');
const WALL_RUN_RIGHT = 15 * T;
const WALL_RUN_Y = 20 * T;

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
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.combat);
  await setup(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** Director off, enemies cleared, auto-fire off, and combat events recorded in window.__ev. */
function setup(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { enemies } = scene;
    enemies.director.enabled = false;
    for (const e of enemies.group.getChildren()) if (e.active) e.despawn();
    for (const b of scene.bullets.group.getChildren()) if (b.active) b.despawn();
    scene.player.fire = () => {};
    window.__ev = [];
    const t = () => scene.game.loop.time;
    scene.events.on('enemy-hit', ({ enemy, ...rest }) =>
      window.__ev.push({ name: 'enemy-hit', at: t(), index: enemies.group.getChildren().indexOf(enemy), ...rest }),
    );
    for (const name of ['enemy-killed', 'player-hit', 'player-died']) {
      scene.events.on(name, (data) => window.__ev.push({ name, at: t(), ...data }));
    }
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

/**
 * Fire one bullet by hand and keep a reference to it in window.__bullet.
 * @param {import('@playwright/test').Page} page
 * @param {number} x
 * @param {number} y
 * @param {number} angle radians
 * @param {object} [stats] overrides for the default bullet stats
 */
function fire(page, x, y, angle, stats = {}) {
  return page.evaluate(
    ([px, py, a, s]) => {
      const scene = window.__GAME__.scene.getScene('Game');
      const b = scene.bullets.fire(px, py, a, { ...scene.player.weapon.bullet, ...s }, scene.time.now);
      window.__bullet = b;
      return !!b;
    },
    [x, y, angle, stats],
  );
}

function events(page, name) {
  return page.evaluate((n) => window.__ev.filter((e) => !n || e.name === n), name);
}

function waitEvents(page, name, count = 1) {
  return page.waitForFunction(([n, c]) => window.__ev.filter((e) => e.name === n).length >= c, [name, count], {
    timeout: 10000,
  });
}

/** Wait until `ms` of game loop time has passed (keeps running after the player dies). */
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

function enemy(page, index) {
  return page.evaluate((i) => {
    const e = window.__GAME__.scene.getScene('Game').enemies.group.getChildren()[i];
    return {
      active: e.active,
      hp: e.hp,
      x: e.x,
      y: e.y,
      vx: e.body.velocity.x,
      tintMode: e.tintMode,
      tint: e.tintTopLeft,
    };
  }, index);
}

function player(page) {
  return page.evaluate(() => {
    const p = window.__GAME__.scene.getScene('Game').player;
    return { hp: p.hp, dead: p.dead, inv: p.invulnerableMs, visible: p.visible, gunsVisible: p.guns.visible };
  });
}

// ---------------------------------------------------------------- bullets vs enemies

test('a 10-damage bullet takes 10 HP off a Grunt and despawns', async ({ page }) => {
  const [i] = await spawnAt(page, 'grunt', [[SPAWN.x + 150, SPAWN.y]]);
  await fire(page, SPAWN.x + 40, SPAWN.y, 0, { damage: 10, pierce: 0 });
  await waitEvents(page, 'enemy-hit');
  expect((await enemy(page, i)).hp).toBe(ENEMIES.types.grunt.hp - 10);
  expect(await page.evaluate(() => window.__bullet.active)).toBe(false);
  const [hit] = await events(page, 'enemy-hit');
  expect(hit).toMatchObject({ index: i, typeId: 'grunt', damage: 10, hpLeft: ENEMIES.types.grunt.hp - 10 });
});

test('a pierce-1 bullet damages a Brute and then a Grunt once each, and despawns on the second', async ({ page }) => {
  const [brute] = await spawnAt(page, 'brute', [[SPAWN.x + 130, SPAWN.y]]);
  const [grunt] = await spawnAt(page, 'grunt', [[SPAWN.x + 230, SPAWN.y]]);
  await fire(page, SPAWN.x + 40, SPAWN.y, 0, { damage: 10, pierce: 1, lifetime: 5000 });
  await page.waitForFunction(() => !window.__bullet.active, null, { timeout: 10000 });
  await waitGameMs(page, 200);
  const hits = await events(page, 'enemy-hit');
  expect(hits.map((h) => h.index)).toEqual([brute, grunt]);
  expect((await enemy(page, brute)).hp).toBe(ENEMIES.types.brute.hp - 10);
  expect((await enemy(page, grunt)).hp).toBe(ENEMIES.types.grunt.hp - 10);
});

test('a pierce-0 bullet into two stacked enemies damages exactly one', async ({ page }) => {
  const [a, b] = await spawnAt(page, 'grunt', [
    [SPAWN.x + 150, SPAWN.y],
    [SPAWN.x + 150, SPAWN.y],
  ]);
  await fire(page, SPAWN.x + 40, SPAWN.y, 0, { damage: 10, pierce: 0 });
  await waitEvents(page, 'enemy-hit');
  await waitGameMs(page, 300);
  expect(await events(page, 'enemy-hit')).toHaveLength(1);
  const hp = (await enemy(page, a)).hp + (await enemy(page, b)).hp;
  expect(hp).toBe(2 * ENEMIES.types.grunt.hp - 10);
});

test('a hit Runner flashes solid white, then gets its placeholder tint back', async ({ page }) => {
  const [i] = await spawnAt(page, 'runner', [[SPAWN.x + 150, SPAWN.y]]);
  // Capture the look in the same frame as the hit.
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.events.once('enemy-hit', ({ enemy }) => {
      window.__look = { mode: enemy.tintMode, tint: enemy.tintTopLeft };
    });
  });
  await fire(page, SPAWN.x + 40, SPAWN.y, 0, { damage: 10 });
  await waitEvents(page, 'enemy-hit');
  const FILL = 1;
  expect(await page.evaluate(() => window.__look)).toEqual({ mode: FILL, tint: 0xffffff });
  // Wait on the flash timer itself: it runs on capped frame deltas, so stalled headless frames
  // stretch it past the same amount of loop time.
  await page.waitForFunction(
    (idx) => window.__GAME__.scene.getScene('Game').enemies.group.getChildren()[idx].flashMs === 0,
    i,
    {
      timeout: 5000,
    },
  );
  const s = await enemy(page, i);
  expect(s.tintMode).toBe(0); // MULTIPLY
  expect(s.tint).toBe(ENEMIES.types.runner.placeholderTint);
});

test('a Grunt hit by a bullet travelling right is pushed right, then chases again', async ({ page }) => {
  const [i] = await spawnAt(page, 'grunt', [[SPAWN.x + 150, SPAWN.y]]);
  // Sample the Grunt every frame from the hit until well after the knockback.
  await page.evaluate((idx) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const e = scene.enemies.group.getChildren()[idx];
    window.__kb = { during: [], after: [] };
    scene.events.once('enemy-hit', () => {
      const x0 = e.x;
      const onFrame = () => {
        const s = { dx: e.x - x0, vx: e.body.velocity.x };
        (e.knockMs > 0 ? window.__kb.during : window.__kb.after).push(s);
        if (window.__kb.after.length >= 10) scene.events.off('postupdate', onFrame);
      };
      scene.events.on('postupdate', onFrame);
    });
  }, i);
  await fire(page, SPAWN.x + 40, SPAWN.y, 0, { damage: 10 });
  await page.waitForFunction(() => window.__kb.after.length >= 10, null, { timeout: 10000 });
  const kb = await page.evaluate(() => window.__kb);
  expect(kb.during.length).toBeGreaterThan(0);
  for (const s of kb.during) expect(s.vx).toBeCloseTo(ENEMIES.types.grunt.knockback, 0);
  expect(Math.max(...kb.during.map((s) => s.dx), ...kb.after.map((s) => s.dx))).toBeGreaterThan(5);
  // Chasing the player (to its left) again.
  expect(kb.after.at(-1).vx).toBeLessThan(0);
});

test('a Runner knocked back into a wall never overlaps a wall tile', async ({ page }) => {
  const half = ENEMIES.types.runner.hurtbox.width / 2;
  const [i] = await spawnAt(page, 'runner', [[WALL_RUN_RIGHT + half + 2, WALL_RUN_Y]]);
  await page.evaluate((idx) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const e = scene.enemies.group.getChildren()[idx];
    window.__overlap = { max: 0, frames: 0 };
    scene.events.on('postupdate', () => {
      if (!e.active) return;
      const b = e.body;
      const n = scene.arena.walls.getTilesWithinWorldXY(b.left + 0.5, b.top + 0.5, b.width - 1, b.height - 1, {
        isNotEmpty: true,
      }).length;
      window.__overlap.max = Math.max(window.__overlap.max, n);
      window.__overlap.frames++;
    });
  }, i);
  // A bullet travelling left, from the open floor to the Runner's right.
  await fire(page, WALL_RUN_RIGHT + 150, WALL_RUN_Y, Math.PI, { damage: 1 });
  await waitEvents(page, 'enemy-hit');
  await waitGameMs(page, COMBAT.knockbackMs + 300);
  const o = await page.evaluate(() => window.__overlap);
  expect(o.frames).toBeGreaterThan(5);
  expect(o.max).toBe(0);
  expect((await enemy(page, i)).active).toBe(true);
});

test('a killing hit removes the enemy that frame, plays a puff, and emits enemy-hit then enemy-killed', async ({
  page,
}) => {
  const [i] = await spawnAt(page, 'grunt', [[SPAWN.x + 150, SPAWN.y]]);
  await page.evaluate((idx) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const e = scene.enemies.group.getChildren()[idx];
    e.hp = 10;
    const live0 = scene.enemies.liveCount;
    scene.events.once('enemy-killed', () => {
      window.__kill = {
        active: e.active,
        liveDrop: live0 - scene.enemies.liveCount,
        puffs: scene.combat.puffs.playing,
      };
    });
  }, i);
  await fire(page, SPAWN.x + 40, SPAWN.y, 0, { damage: 10 });
  await waitEvents(page, 'enemy-killed');
  expect(await page.evaluate(() => window.__kill)).toEqual({ active: false, liveDrop: 1, puffs: 1 });
  const ev = await events(page);
  expect(ev.map((e) => e.name)).toEqual(['enemy-hit', 'enemy-killed']);
  expect(ev[0].hpLeft).toBeLessThanOrEqual(0);
  expect(ev[1]).toMatchObject({ typeId: 'grunt', kills: 1 });
  // Killed where it stood when the bullet arrived.
  expect(ev[1].x).toBeCloseTo(ev[0].x, 5);
  expect(ev[1].y).toBeCloseTo(ev[0].y, 5);
  // The puff hides itself when it finishes.
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').combat.puffs.playing === 0, null, {
    timeout: 5000,
  });
});

test('a recycled enemy is not a kill', async ({ page }) => {
  const [killed, far] = await spawnAt(page, 'grunt', [
    [SPAWN.x + 150, SPAWN.y],
    [SPAWN.x - 300, SPAWN.y],
  ]);
  await page.evaluate(
    ([k, f, dist]) => {
      const scene = window.__GAME__.scene.getScene('Game');
      const kids = scene.enemies.group.getChildren();
      kids[k].hp = 10;
      kids[f].body.reset(scene.player.x - dist - 50, scene.player.y);
    },
    [killed, far, ENEMIES.recycleDistance],
  );
  await fire(page, SPAWN.x + 40, SPAWN.y, 0, { damage: 10 });
  await waitEvents(page, 'enemy-killed');
  await waitGameMs(page, 200);
  expect((await enemy(page, far)).active).toBe(false);
  expect(await events(page, 'enemy-killed')).toHaveLength(1);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').combat.kills)).toBe(1);
});

test('more deaths at once than pooled puffs are all counted, without errors', async ({ page }) => {
  const n = COMBAT.puffPoolSize + 8;
  const r = await page.evaluate((count) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const list = [];
    for (let k = 0; k < count; k++) list.push(scene.enemies.spawnAt('grunt', scene.player.x + 200, scene.player.y));
    for (const e of list) scene.combat.killEnemy(e);
    return { kills: scene.combat.kills, live: scene.enemies.liveCount, puffs: scene.combat.puffs.playing };
  }, n);
  expect(r).toEqual({ kills: n, live: 0, puffs: COMBAT.puffPoolSize });
  expect(await events(page, 'enemy-killed')).toHaveLength(n);
});

// ---------------------------------------------------------------- enemies vs player

test('a Grunt touching the player deals its contact damage, emits player-hit, and starts blinking', async ({
  page,
}) => {
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    window.__vis = new Set();
    scene.events.on('postupdate', () => {
      if (scene.player.invulnerableMs > 0) window.__vis.add(scene.player.visible);
    });
  });
  await spawnAt(page, 'grunt', [[SPAWN.x, SPAWN.y]]);
  await waitEvents(page, 'player-hit');
  const dmg = ENEMIES.types.grunt.contactDamage;
  expect((await events(page, 'player-hit'))[0]).toMatchObject({
    damage: dmg,
    hp: PLAYER.maxHp - dmg,
    maxHp: PLAYER.maxHp,
  });
  const p = await player(page);
  expect(p.hp).toBe(PLAYER.maxHp - dmg);
  expect(p.inv).toBeGreaterThan(0);
  await waitGameMs(page, 400);
  expect(await page.evaluate(() => [...window.__vis].sort())).toEqual([false, true]);
});

test('continued contact does not hurt again until invulnerability ends', async ({ page }) => {
  await spawnAt(page, 'grunt', [[SPAWN.x, SPAWN.y]]);
  await waitEvents(page, 'player-hit', 3);
  const hits = await events(page, 'player-hit');
  for (let k = 1; k < hits.length; k++) {
    // Invulnerability is counted on scene time, so allow one frame of rounding.
    expect(hits[k].at - hits[k - 1].at).toBeGreaterThanOrEqual(PLAYER.invulnerableMs - 20);
  }
  expect(hits[2].hp).toBe(PLAYER.maxHp - 3 * ENEMIES.types.grunt.contactDamage);
});

test('five enemies touching the player at once deal exactly one hit', async ({ page }) => {
  await spawnAt(
    page,
    'grunt',
    Array.from({ length: 5 }, () => [SPAWN.x, SPAWN.y]),
  );
  await waitEvents(page, 'player-hit');
  await waitGameMs(page, PLAYER.invulnerableMs / 2);
  expect(await events(page, 'player-hit')).toHaveLength(1);
  expect((await player(page)).hp).toBe(PLAYER.maxHp - ENEMIES.types.grunt.contactDamage);
});

test('the player and guns are visible when invulnerability ends', async ({ page }) => {
  await spawnAt(page, 'grunt', [[SPAWN.x, SPAWN.y]]);
  await waitEvents(page, 'player-hit');
  await page.evaluate(() => {
    for (const e of window.__GAME__.scene.getScene('Game').enemies.group.getChildren()) if (e.active) e.despawn();
  });
  // Wait on the timer itself (capped frame deltas stretch it past the same loop time).
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').player.invulnerableMs === 0, null, {
    timeout: 10000,
  });
  const p = await player(page);
  expect(p.inv).toBe(0);
  expect(p.visible).toBe(true);
  expect(p.gunsVisible).toBe(true);
});

test('pausing the Game scene pauses invulnerability', async ({ page }) => {
  await spawnAt(page, 'grunt', [[SPAWN.x, SPAWN.y]]);
  await waitEvents(page, 'player-hit');
  const before = await page.evaluate(() => {
    const game = window.__GAME__;
    game.scene.pause('Game');
    return game.scene.getScene('Game').player.invulnerableMs;
  });
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => {
    const game = window.__GAME__;
    const inv = game.scene.getScene('Game').player.invulnerableMs;
    game.scene.resume('Game');
    return inv;
  });
  expect(before).toBeGreaterThan(0);
  expect(after).toBe(before);
});

test('at 0 HP everything stops, player-died fires once, and GameOver shows the run stats', async ({ page }) => {
  // 7 kills, then a nearly dead player meets a Grunt (plus a Runner that keeps overlapping).
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    for (let k = 0; k < 7; k++)
      scene.combat.killEnemy(scene.enemies.spawnAt('grunt', scene.player.x + 300, scene.player.y));
    scene.player.hp = 5;
    window.__after = { fired: 0, moving: 0, survival: [] };
    let fired = 0;
    scene.events.on('player-fired', () => fired++);
    scene.events.once('player-died', () => {
      // Restore real firing to prove the dead player doesn't fire.
      delete scene.player.fire;
      fired = 0;
      scene.events.on('postupdate', () => {
        window.__after.fired = fired;
        for (const e of scene.enemies.group.getChildren()) {
          if (e.active && (e.body.velocity.x !== 0 || e.body.velocity.y !== 0)) window.__after.moving++;
        }
        window.__after.survival.push(scene.survivalMs);
      });
    });
  });
  await spawnAt(page, 'grunt', [[SPAWN.x, SPAWN.y]]);
  await spawnAt(page, 'runner', [[SPAWN.x + 4, SPAWN.y]]);
  await waitEvents(page, 'player-died');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('GameOver'), null, { timeout: 10000 });

  const died = await events(page, 'player-died');
  expect(died).toHaveLength(1);
  expect(died[0]).toMatchObject({ kills: 7, level: 1 });
  expect(died[0].timeMs).toBeGreaterThan(0);
  expect((await events(page, 'player-hit')).at(-1).hp).toBe(0);

  const after = await page.evaluate(() => window.__after);
  expect(after.fired).toBe(0);
  expect(after.moving).toBe(0);
  expect(new Set(after.survival)).toEqual(new Set([died[0].timeMs]));

  const go = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('GameOver');
    return { stats: scene.stats, text: scene.statsText?.text, ui: window.__GAME__.scene.isActive('UI') };
  });
  expect(go.stats).toEqual({ timeMs: died[0].timeMs, kills: 7, level: 1 });
  const secs = Math.floor(died[0].timeMs / 1000);
  expect(go.text).toContain(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
  expect(go.text).toContain('Kills  7');
  expect(go.text).toContain('Level  1');
  expect(go.ui).toBe(false);

  // A new session starts at full HP.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const g = window.__GAME__.scene.getScene('Game');
    return window.__GAME__.scene.isActive('Game') && g?.player?.body && g.combat;
  });
  const fresh = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return { hp: scene.player.hp, dead: scene.player.dead, kills: scene.combat.kills };
  });
  expect(fresh).toEqual({ hp: PLAYER.maxHp, dead: false, kills: 0 });
});

test('the dev G key kills the player through the death sequence', async ({ page }) => {
  await page.keyboard.press('KeyG');
  await waitEvents(page, 'player-died');
  expect((await player(page)).dead).toBe(true);
  await page.waitForFunction(() => window.__GAME__.scene.isActive('GameOver'), null, { timeout: 10000 });
  expect(await events(page, 'player-died')).toHaveLength(1);
});
