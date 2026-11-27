import { test, expect } from '@playwright/test';
import { JUICE } from '../src/config/juice.js';
import { ignoreWindowBlur } from './support.js';

// Game feel (GH-13): camera shake and the Brute hit-stop. Every test turns the wave director, the
// player's auto-fire, powerup drops and the XP magnet off. Camera shakes are recorded in the page
// (window.__shakes: [ms, intensity] per shake that actually started).

const S = JUICE.shake;
let errors;

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ reducedMotion?: 'reduce' | 'no-preference' }} [opts]
 */
async function startRun(page, { reducedMotion = 'no-preference' } = {}) {
  await page.emulateMedia({ reducedMotion });
  await ignoreWindowBlur(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.juice);
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { enemies, player, powerups } = scene;
    enemies.director.enabled = false;
    for (const e of enemies.group.getChildren()) if (e.active) e.despawn();
    player.fire = () => {};
    player.pickupRadius = 0;
    powerups.dropChance = { grunt: 0, runner: 0, brute: 0 };
    window.__shakes = [];
    const cam = scene.cameras.main;
    const shake = cam.shake;
    cam.shake = function (ms, intensity, ...rest) {
      window.__shakes.push([ms, intensity]);
      return shake.call(this, ms, intensity, ...rest);
    };
  });
}

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

const shakes = (page) => page.evaluate(() => window.__shakes);

test.describe('screen shake', () => {
  test.beforeEach(({ page }) => startRun(page));

  test('a player hit shakes in proportion to the damage', async ({ page }) => {
    await page.evaluate(() => window.__GAME__.scene.getScene('Game').combat.damagePlayer(10, { force: true }));
    const [[ms, intensity]] = await shakes(page);
    expect(ms).toBe(S.playerHit.ms);
    expect(intensity).toBeCloseTo(Math.min(S.playerHit.maxIntensity, 10 * S.playerHit.intensityPerDamage));
  });

  test('a Brute kill shakes', async ({ page }) => {
    await page.evaluate(() => {
      const { combat, enemies, player } = window.__GAME__.scene.getScene('Game');
      combat.killEnemy(enemies.spawnAt('brute', player.x + 200, player.y));
    });
    expect(await shakes(page)).toEqual([[S.bruteKill.ms, S.bruteKill.intensity]]);
  });

  test('a Bomb shakes once', async ({ page }) => {
    await page.evaluate(() => window.__GAME__.scene.getScene('Game').powerups.collect('bomb'));
    expect(await shakes(page)).toEqual([[S.bomb.ms, S.bomb.intensity]]);
  });

  test('Grunt hits and kills don’t shake', async ({ page }) => {
    await page.evaluate(() => {
      const { combat, enemies, player } = window.__GAME__.scene.getScene('Game');
      const g = enemies.spawnAt('grunt', player.x + 200, player.y);
      combat.damageEnemy(g, 1, 1, 0, 'bullet');
      combat.killEnemy(g);
    });
    expect(await shakes(page)).toEqual([]);
  });

  test('a weaker shake doesn’t cut a stronger one short', async ({ page }) => {
    await page.evaluate(() => {
      const { combat, powerups } = window.__GAME__.scene.getScene('Game');
      powerups.collect('bomb');
      combat.damagePlayer(4, { force: true });
    });
    expect(await shakes(page)).toEqual([[S.bomb.ms, S.bomb.intensity]]);
  });
});

test('reduced motion turns every shake off', async ({ page }) => {
  await startRun(page, { reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const { combat, enemies, player, powerups } = window.__GAME__.scene.getScene('Game');
    combat.damagePlayer(10, { force: true });
    combat.killEnemy(enemies.spawnAt('brute', player.x + 200, player.y));
    powerups.collect('bomb');
  });
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').juice.reducedMotion)).toBe(true);
  expect(await shakes(page)).toEqual([]);
});

test.describe('hit-stop', () => {
  test.beforeEach(({ page }) => startRun(page));

  test('a Brute kill freezes survival time and enemies, then both resume', async ({ page }) => {
    await page.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      const { combat, enemies, player, juice } = scene;
      // Long enough to span several frames under swiftshader.
      juice.settings.hitStop.ms = 400;
      const grunt = enemies.spawnAt('grunt', player.x + 250, player.y);
      window.__frozen = [];
      window.__after = null;
      scene.events.on('postupdate', () => {
        if (juice.stopped) window.__frozen.push({ s: scene.survivalMs, x: grunt.x });
        else if (window.__frozen.length && !window.__after) window.__after = { s: scene.survivalMs, x: grunt.x };
      });
      combat.killEnemy(enemies.spawnAt('brute', player.x - 200, player.y));
      window.__start = { s: scene.survivalMs, stopped: juice.stopped, physics: scene.physics.world.isPaused };
    });
    const start = await page.evaluate(() => window.__start);
    expect(start.stopped).toBe(true);
    expect(start.physics).toBe(true);
    await page.waitForFunction(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      return window.__after && scene.survivalMs > window.__after.s + 100;
    });
    const r = await page.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      return {
        frozen: window.__frozen,
        after: window.__after,
        nowS: scene.survivalMs,
        physics: scene.physics.world.isPaused,
        anims: scene.anims.paused,
        time: scene.time.paused,
        enemies: scene.enemies.group
          .getChildren()
          .filter((e) => e.active)
          .map((e) => e.x),
      };
    });
    expect(r.frozen.length).toBeGreaterThan(1);
    expect(new Set(r.frozen.map((f) => f.s))).toEqual(new Set([start.s]));
    expect(new Set(r.frozen.map((f) => f.x)).size).toBe(1);
    expect(r.nowS).toBeGreaterThan(start.s);
    // The Grunt chases the player (to its left) again.
    expect(r.enemies[0]).toBeLessThan(r.frozen[0].x);
    expect([r.physics, r.anims, r.time]).toEqual([false, false, false]);
  });

  test('a Bomb that kills three Brutes freezes once', async ({ page }) => {
    const r = await page.evaluate(() => {
      const { enemies, player, powerups, juice } = window.__GAME__.scene.getScene('Game');
      let started = 0;
      const hitStop = juice.hitStop;
      juice.hitStop = function () {
        const ok = hitStop.call(this);
        if (ok) started += 1;
        return ok;
      };
      for (const dx of [-120, 0, 120]) enemies.spawnAt('brute', player.x + dx, player.y + 100).hp = 1;
      powerups.collect('bomb');
      return { started, kills: window.__GAME__.scene.getScene('Game').combat.kills };
    });
    expect(r).toEqual({ started: 1, kills: 3 });
  });

  test('Grunt and Runner kills don’t freeze', async ({ page }) => {
    const stopped = await page.evaluate(() => {
      const { combat, enemies, player, juice } = window.__GAME__.scene.getScene('Game');
      combat.killEnemy(enemies.spawnAt('grunt', player.x + 200, player.y));
      combat.killEnemy(enemies.spawnAt('runner', player.x - 200, player.y));
      return juice.stopped;
    });
    expect(stopped).toBe(false);
  });

  test('pausing during a hit-stop keeps what is left of it, and resume finishes it', async ({ page }) => {
    await page.evaluate(() => {
      const { combat, enemies, player, juice } = window.__GAME__.scene.getScene('Game');
      juice.settings.hitStop.ms = 5000;
      combat.killEnemy(enemies.spawnAt('brute', player.x + 200, player.y));
    });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Pause')?.ready);
    const left = await page.evaluate(() => window.__GAME__.scene.getScene('Game').juice.hitStopMs);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').juice.hitStopMs)).toBe(left);
    await page.evaluate(() => (window.__GAME__.scene.getScene('Game').juice.hitStopMs = 100));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      return scene.sys.isActive() && !scene.juice.stopped && scene.survivalMs > 0;
    });
    const r = await page.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      return [scene.physics.world.isPaused, scene.anims.paused, scene.time.paused];
    });
    expect(r).toEqual([false, false, false]);
  });

  test('no hit-stop once the player is dead', async ({ page }) => {
    const stopped = await page.evaluate(() => {
      const { combat, enemies, player, juice } = window.__GAME__.scene.getScene('Game');
      combat.damagePlayer(player.hp, { force: true });
      combat.killEnemy(enemies.spawnAt('brute', player.x + 200, player.y));
      return juice.stopped;
    });
    expect(stopped).toBe(false);
  });
});
