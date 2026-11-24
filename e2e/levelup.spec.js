import { test, expect } from '@playwright/test';
import { DISPLAY } from '../src/config/display.js';
import { PLAYER } from '../src/config/player.js';
import { UPGRADES } from '../src/config/upgrades.js';
import { WEAPON } from '../src/config/weapon.js';
import { ignoreWindowBlur } from './support.js';

// The pick-1-of-3 LevelUp screen (GH-8): the card draw, choosing by key and click, the input
// delay, the no-way-out rule, queued level-ups, the upgrade-chosen event, and each upgrade's
// effect. Every test turns the wave director and auto-fire off. Where the cards matter, the test
// replaces `upgrades.draw` with a fixed list. Tests wait on game state, not wall-clock time
// (see the GH-4/GH-6 timing notes).

const step = Object.fromEntries(UPGRADES.list.map((u) => [u.id, u.step]));
const maxRank = Object.fromEntries(UPGRADES.list.map((u) => [u.id, u.maxRank]));

let errors;

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning' && m.text().includes('Cannot pause')) errors.push(m.text());
  });
  await ignoreWindowBlur(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.upgrades);
  await setup(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** No enemies, no auto-fire, and record upgrade events with the player's max HP at emit time. */
function setup(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enemies.director.enabled = false;
    for (const e of scene.enemies.group.getChildren()) if (e.active) e.despawn();
    scene.player.fire = () => {};
    window.__ev = [];
    scene.events.on('upgrade-chosen', (e) => window.__ev.push({ ...e, maxHp: scene.player.maxHp }));
    window.__draws = 0;
    const draw = scene.upgrades.draw.bind(scene.upgrades);
    scene.upgrades.draw = () => {
      window.__draws++;
      return window.__fixed ? [...window.__fixed] : draw();
    };
  });
}

/** Make every following draw return exactly these ids. */
function fixCards(page, ids) {
  return page.evaluate((x) => {
    window.__fixed = x;
  }, ids);
}

/** Queue `n` level-ups through the real path (the dev L key's XP grant). */
function levelUp(page, n = 1) {
  return page.evaluate((count) => {
    const { xp } = window.__GAME__.scene.getScene('Game');
    if (count === 1) xp.grantLevel();
    else {
      const p = xp.progression;
      let need = p.xpNeeded - p.xpInto;
      for (let l = p.level + 1; l < p.level + count; l++)
        need += Math.round(p.curve.base + p.curve.growth * (l - 1) ** p.curve.exponent);
      xp.collect(need);
    }
  }, n);
}

function waitReady(page) {
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

function luState(page) {
  return page.evaluate(() => {
    const game = window.__GAME__;
    const lu = game.scene.getScene('LevelUp');
    return {
      active: game.scene.isActive('LevelUp'),
      gamePaused: game.scene.isPaused('Game'),
      choices: lu.choices,
      cards: lu.cards?.map((c) => ({ x: c.x, y: c.y, scale: c.scaleX, id: c.getData('id') })),
      chosen: lu.chosen,
      pending: game.scene.getScene('Game').xp.progression.pending,
    };
  });
}

function playerStats(page) {
  return page.evaluate(() => {
    const p = window.__GAME__.scene.getScene('Game').player;
    return {
      hp: p.hp,
      maxHp: p.maxHp,
      speed: p.speed,
      pickupRadius: p.pickupRadius,
      weapon: structuredClone(p.weapon),
    };
  });
}

/** Page coordinates for game-screen point (x, y). */
async function toPage(page, x, y) {
  const box = await page.locator('#game canvas').boundingBox();
  const scale = box.width / DISPLAY.width;
  return { x: box.x + x * scale, y: box.y + y * scale };
}

/** Pick by key and wait for Game to run again. */
async function pickKey(page, key) {
  await waitReady(page);
  await page.keyboard.press(key);
  await waitGameRunning(page);
}

test('a level-up pauses Game and shows 3 different cards, each drawn from the pool', async ({ page }) => {
  await levelUp(page);
  await waitReady(page);
  const s = await luState(page);
  expect(s.gamePaused).toBe(true);
  expect(s.choices).toHaveLength(3);
  expect(new Set(s.choices).size).toBe(3);
  for (const id of s.choices) expect(Object.keys(step)).toContain(id);
  expect(s.cards.map((c) => c.id)).toEqual(s.choices);
  // Cards are laid out left to right, centered on the screen.
  expect(s.cards[0].x).toBeLessThan(s.cards[1].x);
  expect(s.cards[1].x).toBeLessThan(s.cards[2].x);
  expect(Math.abs(s.cards[1].x - DISPLAY.width / 2)).toBeLessThan(1);
});

test('input before the delay is ignored', async ({ page }) => {
  await levelUp(page);
  // Pick inside the same check that sees LevelUp open but not yet ready.
  const early = await page.waitForFunction(() => {
    const game = window.__GAME__;
    const lu = game.scene.getScene('LevelUp');
    if (!game.scene.isActive('LevelUp') || !lu.choices) return false;
    if (lu.ready) return 'missed';
    lu.pick(0);
    return lu.chosen ? 'picked' : 'ignored';
  });
  expect(await early.jsonValue()).toBe('ignored');
  await waitReady(page);
  expect(await luState(page)).toMatchObject({ active: true, chosen: false, pending: 1 });
  expect(await page.evaluate(() => window.__ev)).toEqual([]);
});

test('pressing 2 applies the middle card and resumes Game; upgrade-chosen fires after the change', async ({ page }) => {
  await fixCards(page, ['damage', 'maxhp', 'pierce']);
  await page.evaluate(() => (window.__GAME__.scene.getScene('Game').player.hp = 60));
  await levelUp(page);
  await pickKey(page, '2');
  const p = await playerStats(page);
  expect(p.maxHp).toBe(PLAYER.maxHp + step.maxhp);
  expect(p.hp).toBe(60 + step.maxhp);
  expect(p.weapon.bullet.damage).toBe(WEAPON.bullet.damage);
  expect(await page.evaluate(() => window.__ev)).toEqual([{ id: 'maxhp', rank: 1, maxHp: PLAYER.maxHp + step.maxhp }]);
  expect((await luState(page)).pending).toBe(0);
});

test('hovering highlights a card and clicking it applies it', async ({ page }) => {
  await fixCards(page, ['pierce', 'damage', 'pickup']);
  await levelUp(page);
  await waitReady(page);
  const { cards } = await luState(page);
  const left = await toPage(page, cards[0].x, cards[0].y);
  await page.mouse.move(left.x, left.y);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('LevelUp').cards[0].scaleX > 1);
  expect((await luState(page)).cards.map((c) => c.scale > 1)).toEqual([true, false, false]);
  await page.mouse.click(left.x, left.y);
  await waitGameRunning(page);
  expect((await playerStats(page)).weapon.bullet.pierce).toBe(WEAPON.bullet.pierce + 1);
  expect(await page.evaluate(() => window.__ev.map((e) => [e.id, e.rank]))).toEqual([['pierce', 1]]);
});

test('Enter, an off-card click, and a number with no card leave the screen open', async ({ page }) => {
  await fixCards(page, ['damage', 'pierce']);
  await levelUp(page);
  await waitReady(page);
  expect((await luState(page)).cards).toHaveLength(2);
  await page.keyboard.press('Enter');
  const off = await toPage(page, DISPLAY.width / 2, DISPLAY.height - 20);
  await page.mouse.click(off.x, off.y);
  await page.keyboard.press('3');
  // Let a few frames pass so any wrongly accepted input would have been handled.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  expect(await luState(page)).toMatchObject({ active: true, gamePaused: true, chosen: false, pending: 1 });
  expect(await page.evaluate(() => window.__ev)).toEqual([]);
  await pickKey(page, '2');
  expect((await playerStats(page)).weapon.bullet.pierce).toBe(WEAPON.bullet.pierce + 1);
});

test('two inputs in the same frame apply one upgrade and consume one level-up', async ({ page }) => {
  await fixCards(page, ['damage', 'pierce', 'pickup']);
  await levelUp(page, 2);
  await waitReady(page);
  await page.evaluate(() => {
    const lu = window.__GAME__.scene.getScene('LevelUp');
    lu.pick(0);
    lu.pick(1);
  });
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').xp.progression.pending === 1);
  await waitReady(page);
  const p = await playerStats(page);
  expect(p.weapon.bullet.damage).toBe(WEAPON.bullet.damage + step.damage);
  expect(p.weapon.bullet.pierce).toBe(WEAPON.bullet.pierce);
  expect(await page.evaluate(() => window.__ev.length)).toBe(1);
  await pickKey(page, '1');
});

test('two queued level-ups show two draws before Game resumes', async ({ page }) => {
  await levelUp(page, 2);
  await waitReady(page);
  expect((await luState(page)).pending).toBe(2);
  await page.keyboard.press('1');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').xp.progression.pending === 1);
  await waitReady(page);
  expect((await luState(page)).gamePaused).toBe(true);
  await page.keyboard.press('3');
  await waitGameRunning(page);
  expect(await page.evaluate(() => window.__draws)).toBe(2);
  expect(await page.evaluate(() => window.__ev.length)).toBe(2);
});

test('Damage raises the next bullet; a bullet already in flight keeps its damage', async ({ page }) => {
  await fixCards(page, ['damage', 'pierce', 'pickup']);
  await page.evaluate(() => {
    const { player, bullets, time } = window.__GAME__.scene.getScene('Game');
    window.__old = bullets.fire(player.x, player.y, 0, { ...player.weapon.bullet, lifetime: 60000 }, time.now);
  });
  await levelUp(page);
  await pickKey(page, '1');
  const r = await page.evaluate(() => {
    const { player, bullets, time } = window.__GAME__.scene.getScene('Game');
    const fresh = bullets.fire(player.x, player.y, Math.PI, player.weapon.bullet, time.now);
    return { old: window.__old.damage, fresh: fresh.damage };
  });
  expect(r).toEqual({ old: WEAPON.bullet.damage, fresh: WEAPON.bullet.damage + step.damage });
});

test('Multishot fires one more bullet per shot across a wider fan', async ({ page }) => {
  await fixCards(page, ['multishot', 'pierce', 'pickup']);
  await levelUp(page);
  await pickKey(page, '1');
  const r = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { player, bullets } = scene;
    const live = () => bullets.group.getChildren().filter((b) => b.active).length;
    const before = live();
    // One shot through the real fire path (the test stubbed it on the instance).
    Object.getPrototypeOf(player).fire.call(player, scene.time.now, 1000 / player.weapon.fireRate);
    return { fired: live() - before, w: player.weapon.bullet };
  });
  expect(r.fired).toBe(WEAPON.bullet.count + 1);
  expect(r.w.spreadDeg).toBe(WEAPON.bullet.spreadDeg + UPGRADES.spreadStepDeg);
});

test('Move Speed raises the player velocity holding D', async ({ page }) => {
  await fixCards(page, ['movespeed', 'pierce', 'pickup']);
  await levelUp(page);
  await pickKey(page, '1');
  await page.keyboard.down('d');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').player.body.velocity.x > 0);
  const vx = await page.evaluate(() => window.__GAME__.scene.getScene('Game').player.body.velocity.x);
  await page.keyboard.up('d');
  expect(vx).toBeCloseTo(PLAYER.speed + step.movespeed, 5);
});

test('Pickup Radius makes a gem 100 px away home in', async ({ page }) => {
  await fixCards(page, ['pickup', 'pierce', 'damage']);
  const radius = PLAYER.pickupRadius + step.pickup;
  expect(PLAYER.pickupRadius).toBeLessThan(100);
  expect(radius).toBeGreaterThan(100);
  await page.evaluate(() => {
    const { xp, player } = window.__GAME__.scene.getScene('Game');
    window.__gem = xp.gems.drop(player.x + 100, player.y, 'small');
  });
  await levelUp(page);
  await waitReady(page);
  expect(await page.evaluate(() => window.__gem.homing)).toBe(false);
  await page.keyboard.press('1');
  await waitGameRunning(page);
  expect((await playerStats(page)).pickupRadius).toBe(radius);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').xp.gems.liveCount === 0, null, {
    timeout: 10000,
  });
});

test('Fire Rate raises shots per second', async ({ page }) => {
  await fixCards(page, ['firerate', 'pierce', 'damage']);
  await levelUp(page);
  await pickKey(page, '1');
  expect((await playerStats(page)).weapon.fireRate).toBeCloseTo(WEAPON.fireRate + step.firerate, 5);
});

test('a maxed upgrade is never offered and two left shows two cards', async ({ page }) => {
  const others = Object.keys(step).filter((id) => id !== 'damage' && id !== 'pierce');
  await page.evaluate(
    ([ids, max]) => {
      const { upgrades } = window.__GAME__.scene.getScene('Game');
      for (const id of ids) upgrades.ranks[id] = max[id];
    },
    [others, maxRank],
  );
  await levelUp(page);
  await waitReady(page);
  expect((await luState(page)).choices.sort()).toEqual(['damage', 'pierce']);
  expect((await luState(page)).cards).toHaveLength(2);
  await pickKey(page, '1');
});

test('with every upgrade maxed, the only card is the filler, which heals', async ({ page }) => {
  await page.evaluate((max) => {
    const { upgrades, player } = window.__GAME__.scene.getScene('Game');
    for (const id of Object.keys(max)) upgrades.ranks[id] = max[id];
    player.hp = 50;
  }, maxRank);
  await levelUp(page);
  await waitReady(page);
  expect((await luState(page)).choices).toEqual(['patchup']);
  await pickKey(page, '1');
  expect((await playerStats(page)).hp).toBe(Math.min(PLAYER.maxHp, 50 + UPGRADES.filler.heal));
  expect(await page.evaluate(() => window.__ev.map((e) => [e.id, e.rank]))).toEqual([['patchup', 0]]);
});

test('a new session starts with every upgrade at rank 0 and config stats', async ({ page }) => {
  await fixCards(page, ['damage', 'movespeed', 'maxhp']);
  await levelUp(page, 3);
  for (const key of ['1', '2']) {
    await waitReady(page);
    await page.keyboard.press(key);
    await page.waitForFunction(() => window.__GAME__.scene.getScene('LevelUp').chosen === false);
  }
  await pickKey(page, '3');
  // Die through the real path, then Restart into a new session.
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.combat.damagePlayer(scene.player.hp, { force: true });
  });
  await page.waitForFunction(
    () => window.__GAME__.scene.isActive('GameOver') && window.__GAME__.scene.getScene('GameOver').ready,
    null,
    {
      timeout: 10000,
    },
  );
  // Restart goes straight into a new session (GH-11).
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const g = window.__GAME__.scene.getScene('Game');
    return window.__GAME__.scene.isActive('Game') && g.upgrades && !g.player.dead;
  });
  const r = await page.evaluate(() => window.__GAME__.scene.getScene('Game').upgrades.ranks);
  expect(Object.values(r).every((v) => v === 0)).toBe(true);
  const p = await playerStats(page);
  expect(p).toEqual({
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    pickupRadius: PLAYER.pickupRadius,
    weapon: WEAPON,
  });
});
