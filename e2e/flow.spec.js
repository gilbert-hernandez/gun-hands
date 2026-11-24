import { test, expect } from '@playwright/test';
import { DISPLAY } from '../src/config/display.js';
import { FLOW } from '../src/config/flow.js';
import { PLAYER } from '../src/config/player.js';
import { WEAPON } from '../src/config/weapon.js';
import { ignoreWindowBlur } from './support.js';

// Game flow (GH-11): the title screen and its Start button, menu button frames, the Esc / focus-loss
// pause menu with Resume and Quit to Title, the GameOver screen with Restart and Title, and the
// clean-session guarantee. Real window blur is ignored (see support.js); the focus-loss test emits
// Phaser's own `blur` game event instead. Tests wait on game state, not wall-clock time.

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
  await waitTitle(page);
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------- helpers

function waitTitle(page) {
  return page.waitForFunction(() => {
    const g = window.__GAME__;
    return g?.scene.isActive('Title') && g.scene.getScene('Title').startButton && !g.scene.isActive('Game');
  });
}

/** A running session with the HUD up. */
function waitSession(page) {
  return page.waitForFunction(() => {
    const g = window.__GAME__;
    const game = g.scene.getScene('Game');
    return g.scene.isActive('Game') && g.scene.isActive('UI') && game.powerups && !game.player.dead;
  });
}

/** Start from the title with Enter and wait for the session. */
async function startSession(page) {
  await waitTitle(page);
  await page.keyboard.press('Enter');
  await waitSession(page);
}

/** No spawning and no firing, so the test controls everything in the session. */
function quiet(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enemies.director.enabled = false;
    for (const e of scene.enemies.group.getChildren()) if (e.active) e.despawn();
    scene.player.fire = () => {};
    scene.powerups.dropChance = 0;
  });
}

/** Run `code` with `g` = the Game scene. */
function inGame(page, code) {
  return page.evaluate((c) => {
    return new Function('g', c)(window.__GAME__.scene.getScene('Game'));
  }, code);
}

/** Wait until `ms` of game-loop time has passed (keeps running while Game is paused). */
function waitLoopMs(page, ms) {
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

function waitPauseReady(page) {
  return page.waitForFunction(() => {
    const g = window.__GAME__;
    return g.scene.isActive('Pause') && g.scene.getScene('Pause').ready && g.scene.isPaused('Game');
  });
}

function waitGameRunning(page) {
  return page.waitForFunction(() => {
    const g = window.__GAME__;
    return g.scene.isActive('Game') && !g.scene.isActive('Pause') && !g.scene.isActive('LevelUp');
  });
}

/** Die through the real path and wait for GameOver to accept input. */
async function dieToGameOver(page) {
  await inGame(page, 'g.combat.damagePlayer(g.player.hp, { force: true });');
  await page.waitForFunction(
    () => window.__GAME__.scene.isActive('GameOver') && window.__GAME__.scene.getScene('GameOver').ready,
    null,
    { timeout: 10000 },
  );
}

/** Page coordinates for game-screen point (x, y). */
async function toPage(page, x, y) {
  const box = await page.locator('#game canvas').boundingBox();
  const scale = box.width / DISPLAY.width;
  return { x: box.x + x * scale, y: box.y + y * scale };
}

/** Page coordinates of a button (`scene.<name>`). */
async function buttonAt(page, sceneKey, name) {
  const { x, y } = await page.evaluate(
    ([k, n]) => {
      const b = window.__GAME__.scene.getScene(k)[n];
      return { x: b.x, y: b.y };
    },
    [sceneKey, name],
  );
  return toPage(page, x, y);
}

async function clickButton(page, sceneKey, name) {
  const p = await buttonAt(page, sceneKey, name);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.up();
}

function buttonLook(page, sceneKey, name) {
  return page.evaluate(
    ([k, n]) => {
      const b = window.__GAME__.scene.getScene(k)[n];
      return { state: b.buttonState, frame: b.image.frame.name };
    },
    [sceneKey, name],
  );
}

/** Count how often Title's create runs from now on (window.__titleCreates). */
function countTitleCreates(page) {
  return page.evaluate(() => {
    window.__titleCreates = 0;
    window.__GAME__.scene.getScene('Title').events.on('create', () => window.__titleCreates++);
  });
}

/** Level up once through the real path and pick card 1. */
async function levelUpAndPick(page) {
  await inGame(page, 'g.xp.grantLevel();');
  await page.waitForFunction(() => {
    const lu = window.__GAME__.scene.getScene('LevelUp');
    return window.__GAME__.scene.isActive('LevelUp') && lu.ready && !lu.chosen;
  });
  await page.keyboard.press('1');
  await waitGameRunning(page);
}

// ---------------------------------------------------------------- title

test('clicking Start starts a session with the HUD', async ({ page }) => {
  await clickButton(page, 'Title', 'startButton');
  await waitSession(page);
});

for (const key of ['Enter', 'Space']) {
  test(`${key} on the title starts a session`, async ({ page }) => {
    await page.keyboard.press(key);
    await waitSession(page);
  });
}

test('a click away from Start does not start a session', async ({ page }) => {
  const p = await toPage(page, 100, 100);
  await page.mouse.click(p.x, p.y);
  await waitLoopMs(page, 500);
  const s = await page.evaluate(() => ({
    title: window.__GAME__.scene.isActive('Title'),
    game: window.__GAME__.scene.isActive('Game'),
  }));
  expect(s).toEqual({ title: true, game: false });
});

test('while the logo is a placeholder the title shows GUN HANDS as text', async ({ page }) => {
  const t = await page.evaluate(() => {
    const title = window.__GAME__.scene.getScene('Title');
    const placeholders = window.__GAME__.registry.get('placeholders');
    return { placeholder: placeholders.includes('ui_logo'), type: title.logo.type, text: title.logo.text };
  });
  expect(t).toEqual({ placeholder: true, type: 'Text', text: 'GUN HANDS' });
});

// ---------------------------------------------------------------- buttons

test('a button shows hover, pressed and normal frames as the pointer moves over, presses and leaves', async ({
  page,
}) => {
  expect(await buttonLook(page, 'Title', 'startButton')).toEqual({ state: 'normal', frame: 0 });
  const p = await buttonAt(page, 'Title', 'startButton');
  await page.mouse.move(p.x, p.y);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Title').startButton.buttonState === 'hover');
  expect(await buttonLook(page, 'Title', 'startButton')).toEqual({ state: 'hover', frame: 1 });
  await page.mouse.down();
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Title').startButton.buttonState === 'pressed');
  expect(await buttonLook(page, 'Title', 'startButton')).toEqual({ state: 'pressed', frame: 2 });
  const off = await toPage(page, 100, 100);
  await page.mouse.move(off.x, off.y);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Title').startButton.buttonState === 'normal');
  expect(await buttonLook(page, 'Title', 'startButton')).toEqual({ state: 'normal', frame: 0 });
  await page.mouse.up();
  await page.mouse.move(p.x, p.y);
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Title').startButton.buttonState === 'hover');
});

test('pressing a button and releasing it elsewhere does nothing', async ({ page }) => {
  const p = await buttonAt(page, 'Title', 'startButton');
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  const off = await toPage(page, 100, 100);
  await page.mouse.move(off.x, off.y);
  await page.mouse.up();
  // Coming back over the button after the release must not act either.
  await page.mouse.move(p.x, p.y);
  await waitLoopMs(page, 500);
  expect(await page.evaluate(() => window.__GAME__.scene.isActive('Game'))).toBe(false);
  expect((await buttonLook(page, 'Title', 'startButton')).state).toBe('hover');
});

// ---------------------------------------------------------------- pause

test('Esc pauses everything under the PAUSED overlay, and Esc again resumes', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await inGame(page, "g.powerups.collect('rapidfire');");
  await waitLoopMs(page, 300);
  await page.keyboard.press('Escape');
  await waitPauseReady(page);
  const before = await inGame(
    page,
    'return { t: g.survivalMs, rapid: g.powerups.active.rapidfire, x: g.player.x, inv: g.player.invulnerableMs };',
  );
  await waitLoopMs(page, 1500);
  const during = await inGame(
    page,
    'return { t: g.survivalMs, rapid: g.powerups.active.rapidfire, x: g.player.x, inv: g.player.invulnerableMs };',
  );
  expect(during).toEqual(before);
  const view = await page.evaluate(() => {
    const m = window.__GAME__.scene;
    return {
      ui: m.isActive('UI') && m.isVisible('UI'),
      aboveHud: m.getIndex('Pause') > m.getIndex('UI'),
      hasTitle: m.getScene('Pause').children.list.some((o) => /** @type {any} */ (o).text === 'PAUSED'),
    };
  });
  expect(view).toEqual({ ui: true, aboveHud: true, hasTitle: true });

  await page.keyboard.press('Escape');
  await waitGameRunning(page);
  expect(await inGame(page, 'return g.pauseOpen;')).toBe(false);
  await waitLoopMs(page, 500);
  const after = await inGame(page, 'return { t: g.survivalMs, rapid: g.powerups.active.rapidfire };');
  expect(after.t).toBeGreaterThan(before.t);
  expect(after.rapid).toBeLessThan(before.rapid);
});

test('the Resume button closes the overlay and resumes Game', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await page.keyboard.press('Escape');
  await waitPauseReady(page);
  await clickButton(page, 'Pause', 'resumeButton');
  await waitGameRunning(page);
  const t = await inGame(page, 'return g.survivalMs;');
  await waitLoopMs(page, 300);
  expect(await inGame(page, 'return g.survivalMs;')).toBeGreaterThan(t);
});

test('Esc while LevelUp is open does not open the pause menu', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await inGame(page, 'g.xp.grantLevel();');
  await page.waitForFunction(() => {
    const lu = window.__GAME__.scene.getScene('LevelUp');
    return window.__GAME__.scene.isActive('LevelUp') && lu.ready;
  });
  await page.keyboard.press('Escape');
  await waitLoopMs(page, 500);
  const s = await page.evaluate(() => ({
    pause: window.__GAME__.scene.isActive('Pause'),
    levelUp: window.__GAME__.scene.isActive('LevelUp'),
    pauseOpen: window.__GAME__.scene.getScene('Game').pauseOpen,
  }));
  expect(s).toEqual({ pause: false, levelUp: true, pauseOpen: false });
});

test('Esc in the same frame a level-up is queued does not open the pause menu', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  // LevelUp's launch is queued until the next step; the flag must still block the pause.
  await inGame(page, 'g.xp.grantLevel(); g.openPause();');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('LevelUp'));
  await waitLoopMs(page, 300);
  expect(await page.evaluate(() => window.__GAME__.scene.isActive('Pause'))).toBe(false);
});

test('Esc after death does not pause, and GameOver follows', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await inGame(page, 'g.combat.damagePlayer(g.player.hp, { force: true });');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').player.dead);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('GameOver'), null, { timeout: 10000 });
  expect(await page.evaluate(() => window.__GAME__.scene.isActive('Pause'))).toBe(false);
});

test('losing focus opens the pause menu and the game stays paused', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await page.evaluate(() => window.__GAME__.events.emit('blur'));
  await waitPauseReady(page);
  const t = await inGame(page, 'return g.survivalMs;');
  await waitLoopMs(page, 1000);
  expect(await inGame(page, 'return g.survivalMs;')).toBe(t);
  // A second blur while paused changes nothing.
  await page.evaluate(() => window.__GAME__.events.emit('blur'));
  await waitLoopMs(page, 200);
  expect(await page.evaluate(() => window.__GAME__.scene.getScenes(true).map((s) => s.scene.key))).toEqual([
    'UI',
    'Pause',
  ]);
});

// ---------------------------------------------------------------- quit

test('Quit to Title mid-run ends the session, and the next start is clean', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await levelUpAndPick(page);
  await levelUpAndPick(page);
  await inGame(page, 'g.combat.kills = 20;');
  expect(await inGame(page, 'return g.player.level;')).toBe(3);
  await page.keyboard.press('Escape');
  await waitPauseReady(page);
  await clickButton(page, 'Pause', 'quitButton');
  await waitTitle(page);
  const s = await page.evaluate(() => window.__GAME__.scene.getScenes(true).map((x) => x.scene.key));
  expect(s).toEqual(['Title']);
  await page.keyboard.press('Enter');
  await waitSession(page);
  expect(
    await inGame(page, 'return { level: g.player.level, kills: g.combat.kills, pauseOpen: g.pauseOpen };'),
  ).toEqual({ level: 1, kills: 0, pauseOpen: false });
});

// ---------------------------------------------------------------- game over

test('GameOver shows the time, kills and level of the run', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await inGame(page, 'g.survivalMs = 127000; g.combat.kills = 57; g.player.level = 6;');
  await dieToGameOver(page);
  const go = await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('GameOver');
    return { text: s.statsText.text, ui: window.__GAME__.scene.isActive('UI') };
  });
  expect(go.text).toContain('Time   2:07');
  expect(go.text).toContain('Kills  57');
  expect(go.text).toContain('Level  6');
  expect(go.ui).toBe(false);
});

for (const how of ['button', 'Enter']) {
  test(`Restart (${how}) starts a new session without passing the title`, async ({ page }) => {
    await startSession(page);
    await quiet(page);
    await dieToGameOver(page);
    await countTitleCreates(page);
    if (how === 'button') await clickButton(page, 'GameOver', 'restartButton');
    else await page.keyboard.press('Enter');
    await waitSession(page);
    expect(await page.evaluate(() => window.__titleCreates)).toBe(0);
    expect(await page.evaluate(() => window.__GAME__.scene.isActive('GameOver'))).toBe(false);
  });
}

for (const how of ['button', 'Escape']) {
  test(`Title (${how}) on GameOver shows the title screen`, async ({ page }) => {
    await startSession(page);
    await quiet(page);
    await dieToGameOver(page);
    if (how === 'button') await clickButton(page, 'GameOver', 'titleButton');
    else await page.keyboard.press('Escape');
    await waitTitle(page);
    expect(await page.evaluate(() => window.__GAME__.scene.getScenes(true).map((x) => x.scene.key))).toEqual(['Title']);
  });
}

test('GameOver ignores Enter and Restart until the input delay has passed', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await inGame(page, 'g.combat.damagePlayer(g.player.hp, { force: true });');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('GameOver'), null, { timeout: 10000 });
  // Act in the page in the same tick we confirm the delay is still running.
  const early = await page.evaluate(() => {
    const go = window.__GAME__.scene.getScene('GameOver');
    const ready = go.ready;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13 }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13 }));
    go.restart();
    go.toTitle();
    return { ready, left: go.left };
  });
  expect(early).toEqual({ ready: false, left: false });
  await page.waitForFunction(() => window.__GAME__.scene.getScene('GameOver').ready);
  const s = await page.evaluate(() => ({
    gameOver: window.__GAME__.scene.isActive('GameOver'),
    left: window.__GAME__.scene.getScene('GameOver').left,
  }));
  expect(s).toEqual({ gameOver: true, left: false });
  expect(FLOW.gameOver.inputDelayMs).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- clean sessions

test('Restart after an upgraded run with an active powerup starts completely fresh', async ({ page }) => {
  await startSession(page);
  await quiet(page);
  await levelUpAndPick(page);
  await levelUpAndPick(page);
  await levelUpAndPick(page);
  await inGame(
    page,
    `g.powerups.collect('rapidfire');
     g.combat.kills = 30;
     g.xp.collect(1);
     g.xp.gems.drop(g.player.x + 200, g.player.y, 'small');
     g.powerups.pickups.drop(g.player.x - 200, g.player.y, 'shield');
     g.enemies.director.enabled = true;
     delete g.player.fire;`,
  );
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').bullets.group.countActive(true) > 0);
  expect(await inGame(page, 'return g.player.level;')).toBe(4);

  await dieToGameOver(page);
  // Snapshot the new session the moment its create() finishes.
  await page.evaluate(() => {
    const g = window.__GAME__.scene.getScene('Game');
    g.events.once('create', () => {
      window.__fresh = {
        level: g.player.level,
        xpLevel: g.xp.progression.level,
        xpInto: g.xp.progression.xpInto,
        pending: g.xp.progression.pending,
        kills: g.combat.kills,
        survivalMs: g.survivalMs,
        hp: g.player.hp,
        maxHp: g.player.maxHp,
        speed: g.player.speed,
        pickupRadius: g.player.pickupRadius,
        weapon: structuredClone(g.player.weapon),
        effectiveRate: g.player.boosts().fireRate,
        atSpawn: g.player.x === g.arena.spawn.x && g.player.y === g.arena.spawn.y,
        ranks: Object.values(g.upgrades.ranks).every((r) => r === 0),
        active: { ...g.powerups.active },
        enemies: g.enemies.liveCount,
        bullets: g.bullets.group.countActive(true),
        gems: g.xp.gems.liveCount,
        pickups: g.powerups.pickups.liveCount,
        pauseOpen: g.pauseOpen,
        levelUpOpen: g.xp.levelUpOpen,
      };
    });
  });
  await page.keyboard.press('Enter');
  await waitSession(page);
  expect(await page.evaluate(() => window.__fresh)).toEqual({
    level: 1,
    xpLevel: 1,
    xpInto: 0,
    pending: 0,
    kills: 0,
    survivalMs: 0,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    pickupRadius: PLAYER.pickupRadius,
    weapon: WEAPON,
    effectiveRate: WEAPON.fireRate,
    atSpawn: true,
    ranks: true,
    active: {},
    enemies: 0,
    bullets: 0,
    gems: 0,
    pickups: 0,
    pauseOpen: false,
    levelUpOpen: false,
  });
  // The HUD starts fresh too.
  await inGame(page, 'g.survivalMs = 0;');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('UI').timerText.text === '00:00');
  const hud = await page.evaluate(() => {
    const ui = window.__GAME__.scene.getScene('UI');
    return { level: ui.levelText.text, kills: ui.killsText.text, slots: ui.slots.filter((s) => s.id).length };
  });
  expect(hud).toEqual({ level: 'LV 1', kills: 'KILLS 0', slots: 0 });
});

test('three sessions in a row do not build up listeners or colliders', async ({ page }) => {
  /** Listener and collider counts for the running session, after it has played a moment. */
  const counts = async () => {
    await waitLoopMs(page, 800);
    return page.evaluate(() => {
      const game = window.__GAME__;
      const g = game.scene.getScene('Game');
      const sum = (emitter) => emitter.eventNames().reduce((n, e) => n + emitter.listenerCount(e), 0);
      return {
        gameEvents: sum(game.events),
        sceneEvents: sum(g.events),
        uiEvents: sum(game.scene.getScene('UI').events),
        input: sum(g.input),
        keyboard: sum(g.input.keyboard),
        colliders: g.physics.world.colliders.length,
      };
    });
  };

  // Session 1: from the title, played with the real wave director and auto-fire.
  await startSession(page);
  const first = await counts();
  // Session 2: die and Restart.
  await dieToGameOver(page);
  await page.keyboard.press('Enter');
  await waitSession(page);
  const second = await counts();
  // Session 3: pause, Quit to Title, start again.
  await page.keyboard.press('Escape');
  await waitPauseReady(page);
  await clickButton(page, 'Pause', 'quitButton');
  await startSession(page);
  const third = await counts();

  expect(second).toEqual(first);
  expect(third).toEqual(first);
});
