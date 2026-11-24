import { test, expect } from '@playwright/test';
import { ENEMIES } from '../src/config/enemies.js';
import { PLAYER } from '../src/config/player.js';
import { XP } from '../src/config/xp.js';
import { ignoreWindowBlur } from './support.js';

// XP gems and levelling (GH-7): drops, the pickup-radius magnet, collection, the gem pool merge,
// levels, and the queued LevelUp flow. Every test turns the wave director and the player's
// auto-fire off and drops gems or kills enemies by hand. XP events are recorded in the page
// (window.__ev). Tests wait on game state, not wall-clock time (see the GH-4/GH-6 timing notes).

const { small, medium, large } = XP.tiers;

let errors;

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    // Opening LevelUp twice in one frame used to pause Game twice.
    if (m.type() === 'warning' && m.text().includes('Cannot pause')) errors.push(m.text());
  });
  await ignoreWindowBlur(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.xp);
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { enemies } = scene;
    enemies.director.enabled = false;
    for (const e of enemies.group.getChildren()) if (e.active) e.despawn();
    scene.player.fire = () => {};
    window.__ev = [];
    for (const name of ['xp-changed', 'player-leveled']) {
      scene.events.on(name, (data) => window.__ev.push({ name, ...data }));
    }
    window.__resumes = 0;
    scene.events.on('resume', () => window.__resumes++);
  });
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** Active gems as plain data, with their index in the pool. */
function gems(page) {
  return page.evaluate(() =>
    window.__GAME__.scene
      .getScene('Game')
      .xp.gems.group.getChildren()
      .map((g, index) => ({
        index,
        active: g.active,
        x: g.x,
        y: g.y,
        value: g.value,
        tier: g.tier,
        homing: g.homing,
        tint: g.tintTopLeft,
      }))
      .filter((g) => g.active),
  );
}

/** Drop a gem at an offset from the player; returns its pool index. */
function drop(page, dx, dy, tier) {
  return page.evaluate(
    ([x, y, t]) => {
      const { xp, player } = window.__GAME__.scene.getScene('Game');
      const g = xp.gems.drop(player.x + x, player.y + y, t);
      return xp.gems.group.getChildren().indexOf(g);
    },
    [dx, dy, tier],
  );
}

function progress(page) {
  return page.evaluate(() => {
    const p = window.__GAME__.scene.getScene('Game').xp.progression;
    return { level: p.level, xpInto: p.xpInto, totalXp: p.totalXp, pending: p.pending };
  });
}

function events(page, name) {
  return page.evaluate((n) => window.__ev.filter((e) => !n || e.name === n), name);
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

function waitNoGems(page) {
  return page.waitForFunction(() => window.__GAME__.scene.getScene('Game').xp.gems.liveCount === 0, null, {
    timeout: 10000,
  });
}

/** Wait until LevelUp is open and ready for input (it restarts itself while level-ups are queued). */
function waitLevelUpReady(page) {
  return page.waitForFunction(() => {
    const lu = window.__GAME__.scene.getScene('LevelUp');
    return window.__GAME__.scene.isActive('LevelUp') && lu.ready && !lu.chosen;
  });
}

function waitGameRunning(page) {
  return page.waitForFunction(
    () => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isActive('LevelUp'),
  );
}

/** Close `count` LevelUp screens by picking the first card (key 1), then wait for Game to run again. */
async function closeLevelUps(page, count) {
  for (let i = 0; i < count; i++) {
    await waitLevelUpReady(page);
    await page.keyboard.press('1');
  }
  await waitGameRunning(page);
}

test('killed Grunts, Runners and Brutes drop small, medium and large gems where they die', async ({ page }) => {
  const spots = { grunt: [300, 0], runner: [0, 250], brute: [-300, 0] };
  const at = await page.evaluate((s) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const out = {};
    for (const [type, [dx, dy]] of Object.entries(s)) {
      const x = scene.player.x + dx;
      const y = scene.player.y + dy;
      scene.combat.killEnemy(scene.enemies.spawnAt(type, x, y));
      out[type] = { x, y };
    }
    return out;
  }, spots);
  const g = await gems(page);
  expect(g).toHaveLength(3);
  const byTier = Object.fromEntries(g.map((x) => [x.tier, x]));
  expect(byTier.small).toMatchObject({ value: small.value, x: at.grunt.x, y: at.grunt.y, homing: false });
  expect(byTier.medium).toMatchObject({ value: medium.value, x: at.runner.x, y: at.runner.y });
  expect(byTier.large).toMatchObject({ value: large.value, x: at.brute.x, y: at.brute.y });
  // Placeholder gems are tinted per tier.
  expect(new Set(g.map((x) => x.tint)).size).toBe(3);
  expect(byTier.small.tint).toBe(small.placeholderTint);
});

test('a recycled enemy drops no gem', async ({ page }) => {
  await page.evaluate((dist) => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enemies.spawnAt('grunt', scene.player.x - dist - 50, scene.player.y);
  }, ENEMIES.recycleDistance);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').enemies.liveCount === 0);
  await waitGameMs(page, 100);
  expect(await gems(page)).toHaveLength(0);
});

test('a gem inside the pickup radius flies to the player and adds its XP', async ({ page }) => {
  await drop(page, 40, 0, 'medium');
  await waitNoGems(page);
  expect(await progress(page)).toMatchObject({ level: 1, xpInto: medium.value, totalXp: medium.value });
  const changed = await events(page, 'xp-changed');
  expect(changed).toHaveLength(1);
  expect(changed[0]).toMatchObject({ totalXp: medium.value, level: 1, xpInto: medium.value });
});

test('a gem outside the pickup radius stays put; a larger radius pulls it in', async ({ page }) => {
  const i = await drop(page, 200, 0, 'small');
  const before = (await gems(page))[0];
  await waitGameMs(page, 500);
  const after = (await gems(page))[0];
  expect(after).toMatchObject({ index: i, x: before.x, y: before.y, homing: false });

  await page.evaluate(() => {
    window.__GAME__.scene.getScene('Game').player.pickupRadius = 250;
  });
  await waitNoGems(page);
  expect((await progress(page)).totalXp).toBe(small.value);
});

test('a homing gem catches a player running away at full speed', async ({ page }) => {
  await drop(page, PLAYER.pickupRadius - 10, 0, 'small');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').xp.gems.group.getChildren()[0].homing);
  const startX = await page.evaluate(() => window.__GAME__.scene.getScene('Game').player.x);
  await page.keyboard.down('KeyA');
  try {
    await waitNoGems(page);
  } finally {
    await page.keyboard.up('KeyA');
  }
  const endX = await page.evaluate(() => window.__GAME__.scene.getScene('Game').player.x);
  expect(endX).toBeLessThan(startX);
  expect((await progress(page)).totalXp).toBe(small.value);
});

test('a dead player collects nothing', async ({ page }) => {
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.combat.damagePlayer(scene.player.hp, { force: true });
  });
  await drop(page, 40, 0, 'large');
  await waitGameMs(page, 300);
  const g = await gems(page);
  expect(g).toHaveLength(1);
  expect(g[0].homing).toBe(false);
  expect((await progress(page)).totalXp).toBe(0);
  expect(await events(page, 'xp-changed')).toHaveLength(0);
});

test('with the pool full, a drop merges into the nearest gem without losing XP', async ({ page }) => {
  const r = await page.evaluate(
    ([poolSize]) => {
      const scene = window.__GAME__.scene.getScene('Game');
      const { gems } = scene.xp;
      const { x: px, y: py } = scene.player;
      // Fill the pool with small gems in a grid well outside the pickup radius.
      for (let i = 0; i < poolSize; i++)
        gems.drop(px + 200 + (i % 20) * 20, py - 200 + Math.floor(i / 20) * 20, 'small');
      const total = () => gems.group.getChildren().reduce((s, g) => s + (g.active ? g.value : 0), 0);
      const before = { live: gems.liveCount, total: total() };
      // Kill a Brute 3 px from the first gem.
      const target = gems.group.getChildren()[0];
      scene.combat.killEnemy(scene.enemies.spawnAt('brute', target.x + 3, target.y));
      return {
        before,
        after: { live: gems.liveCount, total: total() },
        target: { value: target.value, tier: target.tier },
      };
    },
    [XP.poolSize],
  );
  expect(r.before).toEqual({ live: XP.poolSize, total: XP.poolSize * small.value });
  expect(r.after).toEqual({ live: XP.poolSize, total: XP.poolSize * small.value + large.value });
  expect(r.target).toEqual({ value: small.value + large.value, tier: 'large' });
});

test('crossing level 1 emits player-leveled then xp-changed, pauses Game and opens LevelUp', async ({ page }) => {
  // One gem worth level 1's XP + 1.
  await page.evaluate(() => {
    const { xp, player } = window.__GAME__.scene.getScene('Game');
    const g = xp.gems.drop(player.x + 30, player.y, 'large');
    g.value = xp.progression.xpNeeded + 1;
  });
  await waitLevelUpReady(page);
  expect(await page.evaluate(() => window.__GAME__.scene.isPaused('Game'))).toBe(true);
  const ev = await events(page);
  expect(ev.map((e) => e.name)).toEqual(['player-leveled', 'xp-changed']);
  expect(ev[0]).toEqual({ name: 'player-leveled', level: 2 });
  expect(ev[1]).toMatchObject({ level: 2, xpInto: 1 });
  expect(await progress(page)).toMatchObject({ level: 2, xpInto: 1, pending: 1 });

  await closeLevelUps(page, 1);
  expect(await progress(page)).toMatchObject({ pending: 0 });
  expect(await page.evaluate(() => window.__resumes)).toBe(1);
});

test('a pickup worth two levels opens LevelUp twice before Game resumes', async ({ page }) => {
  await page.evaluate(() => {
    const { xp } = window.__GAME__.scene.getScene('Game');
    const p = xp.progression;
    const need = p.xpNeeded + (p.curve.base + p.curve.growth); // levels 1 and 2
    xp.collect(need);
  });
  expect(await progress(page)).toMatchObject({ level: 3, xpInto: 0, pending: 2 });
  expect((await events(page, 'player-leveled')).map((e) => e.level)).toEqual([2, 3]);

  await waitLevelUpReady(page);
  await page.keyboard.press('1');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').xp.progression.pending === 1);
  await waitLevelUpReady(page);
  // Still paused between the two screens.
  expect(await page.evaluate(() => [window.__GAME__.scene.isPaused('Game'), window.__resumes])).toEqual([true, 0]);
  await page.keyboard.press('1');
  await waitGameRunning(page);
  expect(await page.evaluate(() => window.__resumes)).toBe(1);
  expect((await progress(page)).pending).toBe(0);
});

test('survival time and gems do not move while LevelUp is open', async ({ page }) => {
  await drop(page, 200, 0, 'small');
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.player.pickupRadius = 250; // the gem starts homing...
  });
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').xp.gems.group.getChildren()[0].homing);
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').xp.grantLevel()); // ...and LevelUp opens
  await waitLevelUpReady(page);
  const snap = () =>
    page.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      const g = scene.xp.gems.group.getChildren()[0];
      return { survival: scene.survivalMs, x: g.x, y: g.y, active: g.active };
    });
  const before = await snap();
  expect(before.active).toBe(true);
  await waitGameMs(page, 2000);
  expect(await snap()).toEqual(before);
  await closeLevelUps(page, 1);
});

test('the dev L key at level 3 reaches level 4 with 0 XP and opens LevelUp', async ({ page }) => {
  await page.evaluate(() => {
    const { xp } = window.__GAME__.scene.getScene('Game');
    xp.grantLevel();
    xp.grantLevel();
  });
  await closeLevelUps(page, 2);
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').xp.collect(2)); // some XP into level 3
  expect(await progress(page)).toMatchObject({ level: 3, xpInto: 2 });
  await page.evaluate(() => (window.__ev = []));

  await page.keyboard.press('KeyL');
  await waitLevelUpReady(page);
  expect(await progress(page)).toMatchObject({ level: 4, xpInto: 0, pending: 1 });
  expect(await events(page, 'player-leveled')).toEqual([{ name: 'player-leveled', level: 4 }]);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').player.level)).toBe(4);
  await closeLevelUps(page, 1);
});
