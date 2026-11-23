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

// Scripted input: walk in a square. Replace with real gameplay as it lands.
const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
const end = Date.now() + seconds * 1000;
for (let i = 0; Date.now() < end; i++) {
  const k = keys[i % keys.length];
  await page.keyboard.down(k);
  await page.waitForTimeout(600);
  await page.keyboard.up(k);
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
