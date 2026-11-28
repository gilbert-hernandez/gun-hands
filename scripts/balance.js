// Balance runs (GH-13): `npm run balance [-- <runs>]` plays that many full runs (default 3) with the
// autoplay bot, one after another, and prints the median / min / max survival time and level.
// Needs a running dev build (dev keys and the run summary): URL=http://localhost:5175 by default,
// e.g. `npx vite --port 5175` in another terminal. Each run's summary goes to balance/<stamp>-<n>.json.
// Don't edit src/ while it runs: Vite reloads the page and the run in progress is lost.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { BRAIN, CARD_PRIORITY, playRun } from './bot.js';

const runs = Number(process.argv[2] ?? 3);
const url = process.env.URL ?? 'http://localhost:5175';
// A run that reaches the cap fails the round's "15:00 is effectively impossible" check (GH-13).
const maxMinutes = Number(process.env.MAX_MINUTES ?? 16);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('balance', { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
console.log(`Balance: ${runs} run(s) against ${url}, cap ${maxMinutes} min`);
console.log(`Brain ${JSON.stringify(BRAIN)}  cards ${CARD_PRIORITY.join(' > ')}`);

/** @type {Array<{ timeMs: number, level: number, kills: number, capped?: boolean }>} */
const results = [];
for (let n = 1; n <= runs; n++) {
  // A fresh page per run, so nothing carries over between runs.
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  // A focus change must not open the pause menu mid-run (GH-11).
  await page.addInitScript(() => window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true));
  page.on('pageerror', (e) => console.error(`  page error: ${e.message}`));
  await page.goto(url);
  console.log(`Run ${n}/${runs}`);
  const summary = await playRun(page, { maxMinutes, log: (m) => console.log(m) });
  await page.close();
  writeFileSync(`balance/${stamp}-${n}.json`, JSON.stringify({ brain: BRAIN, ...summary }, null, 2));
  results.push(summary);
  console.log(
    `  ${fmt(summary.timeMs)}  level ${summary.level}  kills ${summary.kills}${summary.capped ? '  (capped)' : ''}`,
  );
  console.log(`  damage taken ${JSON.stringify(summary.damageTaken)}  upgrades ${JSON.stringify(summary.upgrades)}`);
}
await browser.close();

/** @param {number} ms */
function fmt(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** @param {number[]} xs */
function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const times = results.map((r) => r.timeMs);
const levels = results.map((r) => r.level);
console.log('');
console.log('         median   min    max');
console.log(`time     ${fmt(median(times)).padEnd(8)} ${fmt(Math.min(...times)).padEnd(6)} ${fmt(Math.max(...times))}`);
console.log(
  `level    ${String(median(levels)).padEnd(8)} ${String(Math.min(...levels)).padEnd(6)} ${Math.max(...levels)}`,
);
const past12 = results.filter((r) => r.timeMs > 12 * 60000).length;
const at15 = results.filter((r) => r.capped || r.timeMs >= 15 * 60000).length;
console.log(`past 12:00  ${past12}/${results.length}`);
console.log(`at 15:00    ${at15}/${results.length}`);
console.log(`Target: median 10:00–12:00, at most 10% past 12:00, none at 15:00, median level >= 10.`);
