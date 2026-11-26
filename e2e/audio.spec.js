import { test, expect } from '@playwright/test';
import arenaMap from '../src/assets/maps/gh_arena.json' with { type: 'json' };
import { DISPLAY } from '../src/config/display.js';
import { ignoreWindowBlur } from './support.js';

// Sound effects (GH-29). Headless audio may stay locked or fail to decode, so these tests never
// check real playback: they record every `sfx.play` request in the page (window.__snd) with its
// result, and assert which sounds were requested. Throttling, volume, unlock and mute gates are
// unit-tested (tests/sfx.test.js, tests/gameAudio.test.js). The three audio events added for
// GH-29 (xp-collected, bullet-wall, shield-blocked) are checked here because Phaser can't load
// under Vitest.

const T = arenaMap.tilewidth;
const WALL_RUN_RIGHT = 15 * T;
const WALL_RUN_Y = 20 * T;

let errors;

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await ignoreWindowBlur(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title') && window.__GAME__.registry.get('sfx'));
  await recordSounds(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** Wrap sfx.play so every request lands in window.__snd as { slug, result, semitones }. */
function recordSounds(page) {
  return page.evaluate(() => {
    const sfx = window.__GAME__.registry.get('sfx');
    const play = sfx.play.bind(sfx);
    window.__snd = [];
    sfx.play = (slug, opts) => {
      const result = play(slug, opts);
      window.__snd.push({ slug, result, semitones: opts?.semitones ?? 0 });
      return result;
    };
  });
}

/** Requested slugs (optionally only these). */
function sounds(page, only) {
  return page.evaluate((o) => window.__snd.map((s) => s.slug).filter((s) => !o || o.includes(s)), only);
}

function waitSound(page, slug, count = 1) {
  return page.waitForFunction(([s, c]) => window.__snd.filter((e) => e.slug === s).length >= c, [slug, count], {
    timeout: 10000,
  });
}

function waitEvent(page, name, count = 1) {
  return page.waitForFunction(([n, c]) => window.__ev.filter((e) => e.name === n).length >= c, [name, count], {
    timeout: 10000,
  });
}

function events(page, name) {
  return page.evaluate((n) => window.__ev.filter((e) => e.name === n), name);
}

/** Page coordinates for game-screen point (x, y). */
async function toPage(page, x, y) {
  const box = await page.locator('#game canvas').boundingBox();
  const scale = box.width / DISPLAY.width;
  return { x: box.x + x * scale, y: box.y + y * scale };
}

/**
 * Start with Enter and quiet the run: director off, no enemies, auto-fire and magnet off, no
 * powerup drops. Clears the sound log and records game events in window.__ev, in one evaluate
 * (GH-27: change state and start recording together).
 */
async function startQuietRun(page) {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.powerups);
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enemies.director.enabled = false;
    for (const e of scene.enemies.group.getChildren()) if (e.active) e.despawn();
    scene.player.fire = () => {};
    scene.player.pickupRadius = 0;
    scene.powerups.dropChance = { grunt: 0, runner: 0, brute: 0 };
    window.__snd.length = 0;
    window.__ev = [];
    for (const name of ['xp-collected', 'bullet-wall', 'shield-blocked', 'player-hit']) {
      scene.events.on(name, (data) => window.__ev.push({ name, ...data }));
    }
  });
}

/** Fire one bullet by hand. */
function fire(page, x, y, angle, stats = {}) {
  return page.evaluate(
    ([px, py, a, s]) => {
      const scene = window.__GAME__.scene.getScene('Game');
      return !!scene.bullets.fire(px, py, a, { ...scene.player.weapon.bullet, ...s }, scene.time.now);
    },
    [x, y, angle, stats],
  );
}

// ---------------------------------------------------------------- loading and menus

test('every configured sound is loaded', async ({ page }) => {
  const missing = await page.evaluate(() => window.__GAME__.registry.get('sfx').missing());
  expect(missing).toEqual([]);
});

test('hovering and clicking Start plays ui-hover, ui-click and game-start once', async ({ page }) => {
  const b = await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Title').startButton;
    return { x: s.x, y: s.y };
  });
  const p = await toPage(page, b.x, b.y);
  await page.mouse.move(p.x, p.y);
  await waitSound(page, 'ui-hover');
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Game'));
  expect(await sounds(page)).toEqual(['ui-hover', 'ui-click', 'game-start']);
  for (const s of await page.evaluate(() => window.__snd)) expect(['played', 'locked']).toContain(s.result);
});

test('Enter on the title plays game-start without ui-click', async ({ page }) => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Game'));
  expect(await sounds(page, ['ui-click', 'game-start'])).toEqual(['game-start']);
});

// ---------------------------------------------------------------- game moments

test('auto-fire plays shoot', async ({ page }) => {
  await startQuietRun(page);
  await page.evaluate(() => {
    delete window.__GAME__.scene.getScene('Game').player.fire;
  });
  await waitSound(page, 'shoot', 2);
});

test('a bullet hitting a wall emits bullet-wall and plays its sound', async ({ page }) => {
  await startQuietRun(page);
  await fire(page, WALL_RUN_RIGHT + 150, WALL_RUN_Y, Math.PI);
  await waitEvent(page, 'bullet-wall');
  await waitSound(page, 'bullet-wall');
});

test('a killing hit plays only the death sound, with brute-die for Brutes', async ({ page }) => {
  await startQuietRun(page);
  // Fire from just left of the Grunt, read in the same evaluate, so it can't move in between.
  const shootGrunt = (damage) =>
    page.evaluate((d) => {
      const scene = window.__GAME__.scene.getScene('Game');
      window.__grunt ??= scene.enemies.spawnAt('grunt', scene.player.x + 150, scene.player.y);
      const g = window.__grunt;
      scene.bullets.fire(g.x - 30, g.y, 0, { ...scene.player.weapon.bullet, damage: d }, scene.time.now);
    }, damage);
  // A weak hit first (survives), then a killing one.
  await shootGrunt(1);
  await waitSound(page, 'enemy-hit');
  await shootGrunt(1000);
  await waitSound(page, 'enemy-die');
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.combat.killEnemy(scene.enemies.spawnAt('brute', scene.player.x + 300, scene.player.y));
  });
  await waitSound(page, 'brute-die');
  expect(await sounds(page, ['enemy-hit', 'enemy-die', 'brute-die'])).toEqual(['enemy-hit', 'enemy-die', 'brute-die']);
});

test('the shield absorbing contact emits shield-blocked and plays shield-block, not player-hurt', async ({ page }) => {
  await startQuietRun(page);
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.powerups.collect('shield');
    scene.enemies.spawnAt('grunt', scene.player.x, scene.player.y);
  });
  await waitEvent(page, 'shield-blocked', 3);
  await waitSound(page, 'shield-block');
  expect(await events(page, 'player-hit')).toEqual([]);
  expect(await sounds(page, ['shield-up', 'player-hurt'])).toEqual(['shield-up']);
});

test('collecting gems emits xp-collected and plays xp-pickup; grantLevel does not', async ({ page }) => {
  await startQuietRun(page);
  await page.evaluate(() => {
    const { xp } = window.__GAME__.scene.getScene('Game');
    xp.grantLevel();
  });
  await waitSound(page, 'level-up');
  // Pick a card so Game runs again, then collect a gem through the magnet.
  await page.waitForFunction(() => {
    const lu = window.__GAME__.scene.getScene('LevelUp');
    return window.__GAME__.scene.isActive('LevelUp') && lu.ready && !lu.chosen;
  });
  await page.keyboard.press('1');
  await waitSound(page, 'card-pick');
  await page.waitForFunction(() => !window.__GAME__.scene.isPaused('Game'));
  expect(await events(page, 'xp-collected')).toEqual([]);
  await page.evaluate(() => {
    const { xp, player } = window.__GAME__.scene.getScene('Game');
    player.pickupRadius = 200;
    xp.gems.drop(player.x + 40, player.y, 'small');
  });
  await waitEvent(page, 'xp-collected');
  await waitSound(page, 'xp-pickup');
});

test('powerups play their own pickup sounds', async ({ page }) => {
  await startQuietRun(page);
  await page.evaluate(() => {
    const { powerups } = window.__GAME__.scene.getScene('Game');
    for (const id of ['spread', 'health', 'bomb']) powerups.collect(id);
  });
  await waitSound(page, 'bomb');
  expect(await sounds(page, ['powerup-pickup', 'heal', 'shield-up', 'bomb'])).toEqual([
    'powerup-pickup',
    'heal',
    'bomb',
  ]);
});

test('dying plays player-die, then game-over on the GameOver screen', async ({ page }) => {
  await startQuietRun(page);
  await page.evaluate(() => {
    const { combat, player } = window.__GAME__.scene.getScene('Game');
    combat.damagePlayer(player.hp, { force: true });
  });
  await waitSound(page, 'game-over');
  expect(await sounds(page, ['player-hurt', 'player-die', 'game-over'])).toEqual(['player-die', 'game-over']);
});

// ---------------------------------------------------------------- mute

function muteState(page, sceneKey) {
  return page.evaluate((k) => {
    const g = window.__GAME__;
    const toggle = k ? g.scene.getScene(k).soundToggle : null;
    return { muted: g.registry.get('sfx').muted, label: toggle ? toggle.text : null };
  }, sceneKey);
}

test('M mutes and unmutes during a run', async ({ page }) => {
  await startQuietRun(page);
  await page.keyboard.press('m');
  await page.waitForFunction(() => window.__GAME__.registry.get('sfx').muted);
  await page.evaluate(() => {
    window.__snd.length = 0;
    delete window.__GAME__.scene.getScene('Game').player.fire;
  });
  await waitSound(page, 'shoot');
  expect(await page.evaluate(() => window.__snd.find((s) => s.slug === 'shoot').result)).toBe('muted');
  await page.keyboard.press('m');
  await page.waitForFunction(() => !window.__GAME__.registry.get('sfx').muted);
});

test('the title toggle flips mute, and the setting survives a reload', async ({ page }) => {
  expect(await muteState(page, 'Title')).toEqual({ muted: false, label: 'SOUND ON' });
  const b = await page.evaluate(() => {
    const t = window.__GAME__.scene.getScene('Title').soundToggle.getBounds();
    return { x: t.centerX, y: t.centerY };
  });
  const p = await toPage(page, b.x, b.y);
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__GAME__.registry.get('sfx').muted);
  expect(await muteState(page, 'Title')).toEqual({ muted: true, label: 'SOUND OFF' });
  // The click didn't start a session.
  expect(await page.evaluate(() => window.__GAME__.scene.isActive('Game'))).toBe(false);

  await page.reload();
  await page.waitForFunction(
    () => window.__GAME__?.scene.isActive('Title') && window.__GAME__.scene.getScene('Title').soundToggle,
  );
  expect(await muteState(page, 'Title')).toEqual({ muted: true, label: 'SOUND OFF' });
});

test('M on the pause menu updates its toggle', async ({ page }) => {
  await startQuietRun(page);
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').openPause());
  await page.waitForFunction(() => {
    const p = window.__GAME__.scene.getScene('Pause');
    return window.__GAME__.scene.isActive('Pause') && p.soundToggle;
  });
  expect(await muteState(page, 'Pause')).toEqual({ muted: false, label: 'SOUND ON' });
  await page.keyboard.press('m');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Pause').soundToggle.text === 'SOUND OFF');
  expect((await muteState(page, 'Pause')).muted).toBe(true);
});
