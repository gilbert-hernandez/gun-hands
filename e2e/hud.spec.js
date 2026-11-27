import { test, expect } from '@playwright/test';
import { HUD } from '../src/config/hud.js';
import { PLAYER } from '../src/config/player.js';
import { POWERUPS } from '../src/config/powerups.js';
import { ignoreWindowBlur } from './support.js';

// HUD (GH-10): the UI scene's HP bar, XP bar and level, mm:ss timer, kill count, and active
// powerup icons, checked through the fields the UI scene exposes. Every test turns the wave
// director, auto-fire, powerup drops and the XP magnet off. Tests wait on state fields, not
// wall-clock time (see the GH-4/GH-6 timing notes).

let errors;

async function startSession(page) {
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const g = window.__GAME__.scene.getScene('Game');
    const ui = window.__GAME__.scene.getScene('UI');
    return window.__GAME__.scene.isActive('UI') && g?.powerups && ui?.hpText && ui.timerText.text !== '';
  });
  await page.evaluate(() => {
    const { enemies, player, powerups } = window.__GAME__.scene.getScene('Game');
    enemies.director.enabled = false;
    for (const e of enemies.group.getChildren()) if (e.active) e.despawn();
    player.fire = () => {};
    player.pickupRadius = 0;
    powerups.dropChance = { grunt: 0, runner: 0, brute: 0 };
  });
}

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await ignoreWindowBlur(page);
  await page.goto('/');
  await startSession(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** What the HUD currently shows. */
function hud(page) {
  return page.evaluate(() => {
    const u = window.__GAME__.scene.getScene('UI');
    const objs = [u.hpFrame, u.hpFill, u.xpFrame, u.xpFill, u.hpText, u.levelText, u.timerText, u.killsText];
    for (const s of u.slots) objs.push(s.icon, s.text);
    return {
      hp: u.hpText.text,
      hpW: u.hpFillWidth,
      xp: u.xpFillWidth,
      full: u.fullFill,
      level: u.levelText.text,
      levelScale: u.levelText.scaleX,
      timer: u.timerText.text,
      kills: u.killsText.text,
      slots: u.slots.filter((s) => s.id).map((s) => ({ id: s.id, text: s.text.text, tint: s.icon.tintTopLeft })),
      positions: objs.map((o) => [o.x, o.y]),
      scroll: [u.cameras.main.scrollX, u.cameras.main.scrollY],
    };
  });
}

/** Run `fn(gameScene)` in the page, then wait one UI frame so the HUD has redrawn. */
async function inGame(page, fn, arg) {
  await page.evaluate(
    ([src, a]) => {
      const g = window.__GAME__.scene.getScene('Game');
      new Function('g', 'a', src)(g, a);
    },
    [fn, arg],
  );
  await nextUiFrame(page);
}

function nextUiFrame(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const ui = window.__GAME__.scene.getScene('UI');
        ui.events.once('postupdate', () => resolve(undefined));
      }),
  );
}

/** Wait until `ms` of game loop time has passed (runs while Game is paused, too). */
function waitGameMs(page, ms) {
  return page.evaluate(
    (d) =>
      new Promise((resolve) => {
        const loop = window.__GAME__.loop;
        const end = loop.time + d;
        const tick = () => (loop.time >= end ? resolve(undefined) : requestAnimationFrame(tick));
        tick();
      }),
    ms,
  );
}

function expectWholePixels(h) {
  for (const [x, y] of h.positions) {
    expect(Number.isInteger(x)).toBe(true);
    expect(Number.isInteger(y)).toBe(true);
  }
  expect(Number.isInteger(h.hpW)).toBe(true);
  expect(Number.isInteger(h.xp)).toBe(true);
}

test('a new session starts with full HP, LV 1, 00:00, no kills and no powerups', async ({ page }) => {
  await inGame(page, 'g.survivalMs = 0;');
  const h = await hud(page);
  expect(h.hp).toBe(`${PLAYER.maxHp}/${PLAYER.maxHp}`);
  expect(h.hpW).toBe(h.full);
  expect(h.xp).toBe(0);
  expect(h.level).toBe('LV 1');
  expect(h.timer).toBe('00:00');
  expect(h.kills).toBe('KILLS 0');
  expect(h.slots).toEqual([]);
  expectWholePixels(h);
});

test('the HUD stays put while the camera follows the player', async ({ page }) => {
  const before = await hud(page);
  await inGame(
    page,
    'g.player.setPosition(g.player.x + 400, g.player.y + 300); g.cameras.main.centerOn(g.player.x, g.player.y);',
  );
  await nextUiFrame(page);
  const camMoved = await page.evaluate(() => window.__GAME__.scene.getScene('Game').cameras.main.scrollX);
  const after = await hud(page);
  expect(camMoved).not.toBe(0);
  expect(after.positions).toEqual(before.positions);
  expect(after.scroll).toEqual([0, 0]);
});

test('HP follows damage (with a flash), heals, a Max HP upgrade and death, on whole pixels', async ({ page }) => {
  // The 120 ms flash can end between two polls under parallel load, so record in the page whether
  // each flashHp call started the flash (same pattern as the level pop below).
  await page.evaluate(() => {
    const ui = window.__GAME__.scene.getScene('UI');
    const flash = ui.flashHp;
    window.__flashes = [];
    ui.flashHp = function () {
      flash.apply(this);
      window.__flashes.push(this.flashMs > 0);
    };
  });
  await inGame(page, 'g.combat.damagePlayer(25, { force: true });');
  let h = await hud(page);
  expect(h.hp).toBe('75/100');
  expect(h.hpW).toBe(Math.round(0.75 * h.full));
  expect(await page.evaluate(() => window.__flashes)).toEqual([true]);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('UI').flashMs <= 0);

  await inGame(page, "g.player.hp = 50; g.powerups.collect('health');");
  h = await hud(page);
  expect(h.hp).toBe(`${50 + POWERUPS.types.health.heal}/100`);
  expect(h.hpW).toBe(Math.round(0.8 * h.full));
  expectWholePixels(h);

  await inGame(page, "g.upgrades.choose('maxhp');");
  const p = await page.evaluate(() => {
    const { player } = window.__GAME__.scene.getScene('Game');
    return { hp: player.hp, maxHp: player.maxHp };
  });
  expect(p.maxHp).toBeGreaterThan(100);
  h = await hud(page);
  expect(h.hp).toBe(`${p.hp}/${p.maxHp}`);
  expect(h.hpW).toBe(Math.round((p.hp / p.maxHp) * h.full));

  await inGame(page, 'g.combat.damagePlayer(g.player.hp, { force: true });');
  h = await hud(page);
  expect(h.hp).toBe(`0/${p.maxHp}`);
  expect(h.hpW).toBe(0);
});

test('the XP bar fills, and a level-up updates the label with a pop', async ({ page }) => {
  const need = await page.evaluate(() => window.__GAME__.scene.getScene('Game').xp.progression.xpNeeded);
  expect(need % 2).toBe(1); // 5 XP for level 2: use 2 of 5 and check the rounded fraction
  await inGame(page, 'g.xp.collect(a);', 2);
  let h = await hud(page);
  expect(h.xp).toBe(Math.round((2 / need) * h.full));
  expect(h.level).toBe('LV 1');

  // Cross into level 2 with 1 XP carried over.
  // The pop lasts 250 ms, which can pass between two polls under parallel load, so record it in the
  // page: each call and whether it started a scale tween on the label.
  await page.evaluate(() => {
    const ui = window.__GAME__.scene.getScene('UI');
    const pop = ui.popLevel;
    window.__pops = [];
    ui.popLevel = function () {
      pop.apply(this);
      window.__pops.push(this.tweens.getTweensOf(this.levelText).length);
    };
  });
  await inGame(page, 'g.xp.collect(a);', need - 2 + 1);
  expect(await page.evaluate(() => window.__pops)).toEqual([1]);
  await page.waitForFunction(() => {
    const lu = window.__GAME__.scene.getScene('LevelUp');
    return window.__GAME__.scene.isActive('LevelUp') && lu.ready && !lu.chosen;
  });
  await page.keyboard.press('1');
  await page.waitForFunction(
    () => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isActive('LevelUp'),
  );
  await page.waitForFunction(() => window.__GAME__.scene.getScene('UI').levelText.scaleX === 1);
  h = await hud(page);
  const need2 = await page.evaluate(() => window.__GAME__.scene.getScene('Game').xp.progression.xpNeeded);
  expect(h.level).toBe('LV 2');
  expect(h.xp).toBe(Math.round((1 / need2) * h.full));
  expect(h.levelScale).toBe(1);
});

test('the timer shows mm:ss and freezes while LevelUp is open', async ({ page }) => {
  await inGame(page, 'g.survivalMs = 127000;');
  expect((await hud(page)).timer).toBe('02:07');

  await inGame(page, 'g.xp.grantLevel();');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('LevelUp'));
  const before = (await hud(page)).timer;
  await waitGameMs(page, 1500);
  expect((await hud(page)).timer).toBe(before);
});

test('the timer stops at death and matches the GameOver time', async ({ page }) => {
  await inGame(page, 'g.survivalMs = 65400; g.combat.damagePlayer(g.player.hp, { force: true });');
  const atDeath = (await hud(page)).timer;
  await waitGameMs(page, 500);
  expect((await hud(page)).timer).toBe(atDeath);
  await page.waitForFunction(() => window.__GAME__.scene.isActive('GameOver'), null, { timeout: 10000 });
  const go = await page.evaluate(() => ({
    timeMs: window.__GAME__.scene.getScene('GameOver').stats.timeMs,
    ui: window.__GAME__.scene.isActive('UI'),
  }));
  const secs = Math.floor(go.timeMs / 1000);
  expect(atDeath).toBe(`${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`);
  expect(go.ui).toBe(false);
});

test('kills count every kill, including Bomb kills', async ({ page }) => {
  await inGame(
    page,
    `const { x, y } = g.player;
     const a1 = g.enemies.spawnAt('grunt', x + 80, y);
     const a2 = g.enemies.spawnAt('grunt', x - 80, y);
     g.combat.damageEnemy(a1, 999, 1, 0);
     g.combat.damageEnemy(a2, 999, -1, 0);
     g.enemies.spawnAt('grunt', x, y + 80);
     g.powerups.collect('bomb');`,
  );
  expect((await hud(page)).kills).toBe('KILLS 3');
});

test('placeholder powerup icons are tinted with their pickup color', async ({ page }) => {
  // All GH-21 art is delivered now, so mark the icons as placeholders the way Preload would.
  await page.evaluate(() => {
    window.__GAME__.scene.getScene('UI').placeholders = new Set(['ui_icon_rapidfire', 'ui_icon_shield']);
  });
  await inGame(page, "g.powerups.collect('shield'); g.powerups.collect('rapidfire');");
  const h = await hud(page);
  expect(h.slots[0].tint).toBe(POWERUPS.types.rapidfire.placeholderTint);
  expect(h.slots[1].tint).toBe(POWERUPS.types.shield.placeholderTint);
});

test('active powerups show in a fixed order, with real icons and ceil seconds', async ({ page }) => {
  await inGame(page, "g.powerups.collect('shield'); g.powerups.collect('rapidfire');");
  let h = await hud(page);
  expect(h.slots.map((s) => s.id)).toEqual(['rapidfire', 'shield']);
  expect(h.slots[0].text).toBe(`${POWERUPS.types.rapidfire.durationMs / 1000}s`);
  expect(h.slots[1].text).toBe(`${POWERUPS.types.shield.durationMs / 1000}s`);
  // Real GH-21 icons are drawn untinted.
  expect([h.slots[0].tint, h.slots[1].tint]).toEqual([0xffffff, 0xffffff]);
  expectWholePixels(h);

  // Instant powerups add no icon.
  await inGame(page, "g.powerups.collect('magnet');");
  expect((await hud(page)).slots.map((s) => s.id)).toEqual(['rapidfire', 'shield']);
});

test('an icon counts down in whole seconds, blinks near the end, then disappears', async ({ page }) => {
  await inGame(page, 'g.powerups.active.spread = 1200;');
  expect((await hud(page)).slots).toMatchObject([{ id: 'spread', text: '2s' }]);
  expect(1200).toBeLessThan(HUD.powerupWarnMs);
  // Blinking: the icon is seen both hidden and shown while it runs out.
  const seen = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const ui = window.__GAME__.scene.getScene('UI');
        const states = new Set();
        const tick = () => {
          const slot = ui.slots.find((s) => s.id === 'spread');
          if (!slot) return resolve([...states]);
          states.add(slot.icon.visible);
          ui.events.once('postupdate', tick);
        };
        tick();
      }),
  );
  expect(new Set(seen)).toEqual(new Set([true, false]));
  expect((await hud(page)).slots).toEqual([]);
});

test('refreshing a powerup resets its countdown without a second icon', async ({ page }) => {
  await inGame(page, "g.powerups.collect('rapidfire'); g.powerups.active.rapidfire = 3000;");
  expect((await hud(page)).slots).toMatchObject([{ id: 'rapidfire', text: '3s' }]);
  await inGame(page, "g.powerups.collect('rapidfire');");
  const h = await hud(page);
  expect(h.slots).toHaveLength(1);
  expect(h.slots[0].text).toBe(`${POWERUPS.types.rapidfire.durationMs / 1000}s`);
});

test('powerup countdowns freeze while LevelUp is open', async ({ page }) => {
  await inGame(page, "g.powerups.collect('shield'); g.xp.grantLevel();");
  await page.waitForFunction(() => window.__GAME__.scene.isActive('LevelUp'));
  const before = await page.evaluate(() => window.__GAME__.scene.getScene('Game').powerups.active.shield);
  const text = (await hud(page)).slots[0].text;
  await waitGameMs(page, 1500);
  expect(await page.evaluate(() => window.__GAME__.scene.getScene('Game').powerups.active.shield)).toBe(before);
  expect((await hud(page)).slots[0].text).toBe(text);
});

test('after death, title and a new start the HUD is fresh', async ({ page }) => {
  await inGame(
    page,
    "g.combat.kills = 12; g.survivalMs = 90000; g.powerups.collect('spread'); g.xp.collect(3); g.combat.damagePlayer(g.player.hp, { force: true });",
  );
  await page.waitForFunction(
    () => window.__GAME__.scene.isActive('GameOver') && window.__GAME__.scene.getScene('GameOver').ready,
    null,
    {
      timeout: 10000,
    },
  );
  // Esc on GameOver goes to the title (GH-11).
  await page.keyboard.press('Escape');
  await startSession(page);
  await inGame(page, 'g.survivalMs = 0;');
  const h = await hud(page);
  expect(h.hp).toBe(`${PLAYER.maxHp}/${PLAYER.maxHp}`);
  expect(h.xp).toBe(0);
  expect(h.level).toBe('LV 1');
  expect(h.timer).toBe('00:00');
  expect(h.kills).toBe('KILLS 0');
  expect(h.slots).toEqual([]);
});
