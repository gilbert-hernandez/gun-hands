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
await page.waitForFunction(() => window.__GAME__?.scene.isActive('Game'));

// Scripted route through the GH-4 arena while the guns auto-fire (GH-3). Each step: keys to hold,
// duration in ms, and the aim: 'circle' sweeps the mouse round the player, a number is a fixed angle
// in degrees, null leaves the mouse untouched. The spawn is at the map center; the nearest wall to
// the right is a vertical run about 450 px away.
const route = [
  [[], 1500, null], // idle, mouse untouched: guns fire right and the bullets stop at the wall run
  [['KeyD'], 2800, 0], // walk into the wall run and stop flush, firing into it point blank
  [['KeyD', 'KeyW'], 1500, 'circle'], // slide up along it and round the end
  [['KeyA'], 2500, 'circle'],
  [['KeyS'], 1500, 'circle'],
  [['KeyW', 'KeyA'], 4000, 'circle'], // to the top-left corner: stops at the border walls
  [['KeyS', 'KeyD'], 1500, 'circle'], // back out
];
const SPREAD_MS = 7000; // then a 3-projectile spread for the rest
const RADIUS = 150; // game px
const TURN_MS = 3000; // one full mouse circle
const box = await page.locator('#game canvas').boundingBox();
const scale = box.width / size.width;
const end = Date.now() + seconds * 1000;
let angle = 0;

/** Hold `keys` for `ms`, aiming as described above around the player's current screen position. */
async function circle(keys, ms, aim = 'circle') {
  for (const k of keys) await page.keyboard.down(k);
  const stop = Math.min(Date.now() + ms, end);
  while (Date.now() < stop) {
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
  await circle(keys, ms, aim);
}

// Multishot preview: what the upgrade / Spread Shot powerup will do to the per-run stats.
await page.evaluate(() => {
  const { bullet } = window.__GAME__.scene.getScene('Game').player.weapon;
  bullet.count = 3;
  bullet.spreadDeg = 30;
});
await circle([], 2500);
await circle(['KeyD'], 2000);
await circle([], end - Date.now());

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
