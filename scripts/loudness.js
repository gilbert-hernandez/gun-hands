// SFX loudness (GH-13): `node scripts/loudness.js` prints each WAV's RMS and peak level (dBFS) and the
// config volume that brings it to its role's target loudness (design §9). Dev-only; nothing ships.
// Reads 16-bit PCM WAVs (the GH-28 pack). Gilbert's by-ear pass has the final say.
import { readdirSync, readFileSync } from 'node:fs';
import { AUDIO } from '../src/config/audio.js';

const DIR = 'src/assets/sfx';

/** Target RMS (dBFS) per role; slugs not listed are 'events'. */
const TARGETS = { frequent: -24, events: -18, big: -14 };
const ROLES = {
  frequent: ['shoot', 'enemy-hit', 'xp-pickup', 'bullet-wall', 'ui-hover'],
  big: ['level-up', 'bomb', 'player-die', 'game-over'],
};
/** @param {string} slug */
const roleOf = (slug) => (ROLES.frequent.includes(slug) ? 'frequent' : ROLES.big.includes(slug) ? 'big' : 'events');

/**
 * RMS and peak of a 16-bit PCM WAV, in dBFS (mixed down across channels).
 * @param {Buffer} buf
 */
export function measure(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV');
  let off = 12;
  let bits = 0;
  let data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      if (buf.readUInt16LE(off + 8) !== 1) throw new Error('not PCM');
      bits = buf.readUInt16LE(off + 22);
    } else if (id === 'data') {
      data = buf.subarray(off + 8, off + 8 + size);
    }
    off += 8 + size + (size % 2);
  }
  if (bits !== 16 || !data) throw new Error('need 16-bit PCM with a data chunk');
  let sum = 0;
  let peak = 0;
  const n = Math.floor(data.length / 2);
  for (let i = 0; i < n; i++) {
    const v = data.readInt16LE(i * 2) / 32768;
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return { rmsDb: db(Math.sqrt(sum / Math.max(1, n))), peakDb: db(peak) };
}

/**
 * Volume that moves `rmsDb` to `targetDb`, clamped to [0.2, 1] (two decimals).
 * @param {number} rmsDb
 * @param {number} targetDb
 */
export function volumeFor(rmsDb, targetDb) {
  const v = 10 ** ((targetDb - rmsDb) / 20);
  return Math.round(Math.min(1, Math.max(0.2, v)) * 100) / 100;
}

const rows = readdirSync(DIR)
  .filter((f) => f.endsWith('.wav'))
  .map((f) => {
    const slug = f.slice(0, -4);
    const { rmsDb, peakDb } = measure(readFileSync(`${DIR}/${f}`));
    const role = roleOf(slug);
    const current = AUDIO.sounds[/** @type {keyof typeof AUDIO.sounds} */ (slug)]?.volume ?? null;
    return { slug, role, rmsDb, peakDb, current, suggested: volumeFor(rmsDb, TARGETS[role]) };
  })
  .sort((a, b) => a.role.localeCompare(b.role) || a.slug.localeCompare(b.slug));

console.log('slug              role      rms dB  peak dB  volume  suggested');
for (const r of rows) {
  console.log(
    `${r.slug.padEnd(17)} ${r.role.padEnd(9)} ${r.rmsDb.toFixed(1).padStart(6)}  ${r.peakDb.toFixed(1).padStart(7)}  ` +
      `${String(r.current).padStart(6)}  ${String(r.suggested).padStart(9)}`,
  );
}
