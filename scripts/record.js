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

// Scripted route (GH-2 movement). Each step: keys to hold, duration in ms.
const route = [
  [[], 1000], // idle
  [['KeyD'], 900], [['KeyS'], 900], [['KeyA'], 900], [['KeyW'], 900], // four directions
  [['KeyW', 'KeyD'], 700], [['KeyS', 'KeyD'], 700], [['KeyS', 'KeyA'], 700], [['KeyW', 'KeyA'], 700], // diagonals
  [[], 500],
  [['KeyW', 'KeyA'], 9000], // into the top-left corner: camera clamps, player off-center
  [[], 800],
  [['KeyS', 'KeyD'], 1500], // back out of the corner
  [[], 500],
];
const end = Date.now() + seconds * 1000;
for (const [keys, ms] of route) {
  if (Date.now() >= end) break;
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
}

// Aim facing: sweep the mouse back and forth across the player.
const box = await page.locator('#game canvas').boundingBox();
const player = await page.evaluate(() => {
  const scene = window.__GAME__.scene.getScene('Game');
  const cam = scene.cameras.main;
  return { x: scene.player.x - cam.scrollX, y: scene.player.y - cam.scrollY };
});
const scale = box.width / size.width;
const px = box.x + player.x * scale;
const py = box.y + player.y * scale;
for (let i = 0; Date.now() < end; i++) {
  const dx = i % 2 === 0 ? -200 : 200;
  await page.mouse.move(px + dx, py + (i % 3 - 1) * 80, { steps: 20 });
  await page.waitForTimeout(500);
}

const video = page.video();
await context.close();
renameSync(await video.path(), out);
await browser.close();
console.log(`video: ${out}`);

try {
  const mp4 = out.replace(/\.webm$/, '.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mp4]);
  console.log(`video: ${mp4}`);
} catch { /* ffmpeg not available; webm only */ }
