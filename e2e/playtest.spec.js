import { test, expect } from '@playwright/test';
import { DEBUG } from '../src/config/display.js';
import { JUICE } from '../src/config/juice.js';
import { ignoreWindowBlur } from './support.js';

// Playtest tools (GH-13): the dev run log at GameOver and the K stress key. Dev builds only (the
// e2e server is `npm run dev`).

let errors;
let runLines;

test.beforeEach(async ({ page }) => {
  errors = [];
  runLines = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.text().startsWith('[run]')) runLines.push(m.text());
  });
  await ignoreWindowBlur(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

async function startRun(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.juice);
}

test('a run that ends logs one summary and keeps it in the run log', async ({ page }) => {
  await startRun(page);
  await page.evaluate(() => {
    const { enemies, combat, player, powerups } = window.__GAME__.scene.getScene('Game');
    enemies.director.enabled = false;
    powerups.dropChance = { grunt: 0, runner: 0, brute: 0 };
    combat.killEnemy(enemies.spawnAt('runner', player.x + 200, player.y));
    powerups.collect('magnet');
    const g = enemies.spawnAt('grunt', player.x + 300, player.y);
    combat.onContact(g);
  });
  await page.keyboard.press('KeyG');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('GameOver')?.ready);
  const r = await page.evaluate((key) => {
    const go = window.__GAME__.scene.getScene('GameOver');
    return { summary: go.summary, stored: JSON.parse(localStorage.getItem(key)) };
  }, DEBUG.runLog.storageKey);
  expect(r.summary).toMatchObject({
    kills: 1,
    level: 1,
    killsByType: { grunt: 0, runner: 1, brute: 0 },
    powerups: { magnet: 1 },
    upgrades: { damage: 0 },
  });
  expect(r.summary.damageTaken.grunt).toBeGreaterThan(0);
  expect(typeof r.summary.version).toBe('string');
  expect(r.stored).toHaveLength(1);
  expect(r.stored[0]).toEqual(r.summary);
  expect(runLines).toHaveLength(1);
});

test('K fills the arena to the stress count with no contact damage, and K again restores the wave cap', async ({
  page,
}) => {
  await startRun(page);
  const cap = await page.evaluate(() => window.__GAME__.scene.getScene('Game').enemies.cap);
  await page.keyboard.press('KeyK');
  await page.waitForFunction(
    (n) => window.__GAME__.scene.getScene('Game').enemies.liveCount >= n,
    JUICE.debug.stressCount - 10,
    { timeout: 20000 },
  );
  const on = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return {
      cap: scene.enemies.cap,
      live: scene.enemies.liveCount,
      hp: scene.player.hp,
      maxHp: scene.player.maxHp,
      readout: scene.debugText.text,
    };
  });
  expect(on.cap).toBe(JUICE.debug.stressCount);
  expect(on.live).toBeGreaterThanOrEqual(200);
  expect(on.hp).toBe(on.maxHp);
  expect(on.readout).toMatch(/^fps \d+ {2}fx \d+ {2}nums \d+ {2}STRESS/);
  await page.keyboard.press('KeyK');
  const off = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return { cap: scene.enemies.cap, stress: scene.stress, god: scene.combat.godMode };
  });
  expect(off).toEqual({ cap, stress: false, god: false });
});
