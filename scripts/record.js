// Record a gameplay video: `npm run record [-- out.webm] [seconds]`.
// Needs the dev server (`npm run dev`) running on :5173.
// Writes videos/<timestamp>.webm (and .mp4 if ffmpeg is installed).
import { chromium } from '@playwright/test';
import { mkdirSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.argv[2] ?? `videos/${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
const seconds = Number(process.argv[3] ?? 10);
const size = { width: 960, height: 540 };
mkdirSync('videos/.tmp', { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: size, recordVideo: { dir: 'videos/.tmp', size } });
const page = await context.newPage();
await page.goto(process.env.URL ?? 'http://localhost:5173');
await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'));
await page.waitForTimeout(1000);
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__GAME__?.scene.getScene('Game')?.player);
// Plenty of HP so crowd contact (GH-6) can't end the route before the scripted death scene.
await page.evaluate(() => {
  window.__GAME__.scene.getScene('Game').player.hp = 10000;
});

// Scripted route while the guns auto-fire (GH-3), enemies chase (GH-5), and bullets hit them: hit flash,
// knockback, and death puffs (GH-6). Kills drop XP gems in three tiers that fly to the player inside the
// pickup radius; each level-up pauses on the LevelUp cards (GH-7/GH-8): the most visible card is
// hovered for LEVELUP_MS, then picked by a click or its number key, alternating.
// The last DEATH_MS show the player hit, blinking, dying, and GameOver with the reached level. Each step: keys to hold,
// duration in ms, and the aim: 'circle' sweeps the mouse round the player, a number is a fixed angle
// in degrees, null leaves the mouse untouched. A step of ['spawn', {type: count}] adds enemies on the
// off-screen ring right away. The spawn is at the map center; a vertical wall run is ~500 px left.
const route = [
  [[], 3000, 'circle'], // the first Grunts walk in from off-screen
  ['spawn', { grunt: 6, runner: 4, brute: 2 }], // Runners (yellow) and Brutes (purple) join
  [[], 2000, 'circle'], // the crowd closes in and spreads out instead of stacking
  [['KeyA'], 2200, 'circle'], // run past the wall run: chasers behind it slide along it
  [['KeyW'], 1200, 'circle'],
  [['KeyD'], 2500, 'circle'], // kite back right; Runners keep up, Brutes fall behind
  [['KeyS'], 1500, 'circle'],
  [[], 1500, 'circle'],
];
const DEATH_MS = 7000; // the player takes hits, dies, and GameOver shows the stats
const SPREAD_MS = 9000 + DEATH_MS; // then two queued level-ups (Multishot first) until the death scene
const RADIUS = 150; // game px
const LEVELUP_MS = 1200; // how long a card is hovered before it is picked
const TURN_MS = 3000; // one full mouse circle
const box = await page.locator('#game canvas').boundingBox();
const scale = box.width / size.width;
const end = Date.now() + seconds * 1000;
let angle = 0;

// Cards worth showing on video, best first: their effect is visible right away.
const PREFERRED = ['multishot', 'movespeed', 'firerate', 'pierce', 'damage', 'pickup', 'maxhp', 'patchup'];
let picks = 0;

/**
 * If the LevelUp cards are up (GH-8): hover the most visible card for LEVELUP_MS, then pick it,
 * alternating a click and its number key. Handles queued level-ups until Game runs again.
 * @returns {Promise<boolean>} true if a LevelUp screen was handled
 */
async function handleLevelUp() {
  let handled = false;
  for (;;) {
    const lu = await page.evaluate(() => {
      const game = window.__GAME__;
      const scene = game.scene.getScene('LevelUp');
      if (!game.scene.isActive('LevelUp') || !scene.ready || scene.chosen) return null;
      return { choices: scene.choices, cards: scene.cards.map((c) => ({ x: c.x, y: c.y })) };
    });
    if (!lu) {
      if (!handled) return false;
      // Between two queued screens LevelUp restarts; wait until it is ready again or Game runs.
      const running = await page.evaluate(
        () => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isActive('LevelUp'),
      );
      if (running) return true;
      await page.waitForTimeout(50);
      continue;
    }
    handled = true;
    const i = lu.choices.indexOf(PREFERRED.find((id) => lu.choices.includes(id)));
    const card = { x: box.x + lu.cards[i].x * scale, y: box.y + lu.cards[i].y * scale };
    await page.mouse.move(card.x, card.y, { steps: 8 });
    await page.waitForTimeout(LEVELUP_MS);
    if (picks++ % 2 === 0) await page.mouse.click(card.x, card.y);
    else await page.keyboard.press(String(i + 1));
    await page.waitForTimeout(100);
  }
}

/** Hold `keys` for `ms`, aiming as described above around the player's current screen position. */
async function circle(keys, ms, aim = 'circle') {
  for (const k of keys) await page.keyboard.down(k);
  const stop = Math.min(Date.now() + ms, end);
  while (Date.now() < stop) {
    await handleLevelUp();
    if (aim !== null) {
      const p = await page.evaluate(() => {
        const scene = window.__GAME__.scene.getScene('Game');
        const cam = scene.cameras.main;
        return { x: scene.player.x - cam.scrollX, y: scene.player.y - cam.scrollY };
      });
      if (aim === 'circle') angle += (2 * Math.PI * 50) / TURN_MS;
      else angle = (aim * Math.PI) / 180;
      await page.mouse.move(
        box.x + (p.x + Math.cos(angle) * RADIUS) * scale,
        box.y + (p.y + Math.sin(angle) * RADIUS) * scale,
      );
    }
    await page.waitForTimeout(50);
  }
  for (const k of keys) await page.keyboard.up(k);
}

for (const [keys, ms, aim] of route) {
  if (Date.now() >= end - SPREAD_MS) break;
  if (keys === 'spawn') {
    await page.evaluate((counts) => {
      const { enemies } = window.__GAME__.scene.getScene('Game');
      for (const [type, n] of Object.entries(counts)) for (let i = 0; i < n; i++) enemies.spawnRing(type);
    }, ms);
    continue;
  }
  await circle(keys, ms, aim);
}

// Two queued level-ups in one pickup: the first draw is fixed so Multishot's fan shows on video,
// the second is a normal random draw.
await page.evaluate(() => {
  const { xp, upgrades } = window.__GAME__.scene.getScene('Game');
  const draw = upgrades.draw;
  upgrades.draw = () => {
    upgrades.draw = draw;
    return ['damage', 'multishot', 'pierce'];
  };
  const p = xp.progression;
  const next = Math.round(p.curve.base + p.curve.growth * p.level ** p.curve.exponent);
  xp.collect(p.xpNeeded - p.xpInto + next);
});
await circle([], 2500);
await circle(['KeyD'], 2000);
await circle([], end - DEATH_MS - Date.now());

// Death scene: a Brute and a Grunt reach a weakened player. The Brute's hit leaves 5 HP and starts
// the blink; when invulnerability ends the next contact kills, then GameOver shows the run stats.
await page.evaluate(() => {
  const scene = window.__GAME__.scene.getScene('Game');
  const { player, enemies } = scene;
  enemies.director.enabled = false;
  player.hp = 25;
  enemies.spawnAt('brute', player.x - 30, player.y);
  enemies.spawnAt('grunt', player.x, player.y + 30);
});
await circle([], end - Date.now(), null);

const video = page.video();
await context.close();
renameSync(await video.path(), out);
await browser.close();
console.log(`video: ${out}`);

try {
  const mp4 = out.replace(/\.webm$/, '.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mp4]);
  console.log(`video: ${mp4}`);
} catch {
  /* ffmpeg not available; webm only */
}
