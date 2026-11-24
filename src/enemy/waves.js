// Pure wave-director math (no Phaser), so it can be unit-tested.

/**
 * @typedef {{at: number, interval: number, cap: number, weights: Record<string, number>}} Keyframe
 * @typedef {{interval: number, cap: number, weights: Record<string, number>}} Wave
 */

/**
 * Wave values at `seconds` of survival time: linear interpolation between the surrounding
 * keyframes, holding the first before it and the last after it. The cap is floored.
 * @param {number} seconds
 * @param {Keyframe[]} keyframes sorted by `at`
 * @returns {Wave}
 */
export function waveAt(seconds, keyframes) {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (seconds <= first.at) return snapshot(first);
  if (seconds >= last.at) return snapshot(last);

  let i = 0;
  while (keyframes[i + 1].at <= seconds) i++;
  const a = keyframes[i];
  const b = keyframes[i + 1];
  const t = (seconds - a.at) / (b.at - a.at);
  const lerp = (x, y) => x + (y - x) * t;

  /** @type {Record<string, number>} */
  const weights = {};
  for (const k of new Set([...Object.keys(a.weights), ...Object.keys(b.weights)])) {
    weights[k] = lerp(a.weights[k] ?? 0, b.weights[k] ?? 0);
  }
  return { interval: lerp(a.interval, b.interval), cap: Math.floor(lerp(a.cap, b.cap)), weights };
}

/** @param {Keyframe} k */
function snapshot(k) {
  return { interval: k.interval, cap: Math.floor(k.cap), weights: { ...k.weights } };
}

/**
 * Pick a key at random by weight. Zero (or negative) weights are never picked.
 * @param {Record<string, number>} weights relative, need not sum to 1
 * @param {() => number} [rand] returns [0, 1)
 * @returns {string | null} null if no weight is positive
 */
export function pickType(weights, rand = Math.random) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;
  let roll = rand() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

/**
 * Spawn timer as an accumulator. Adds `dtMs` and returns how many spawns are due, never
 * letting the live count pass `cap`. At the cap the carry is clamped to one interval, so
 * there's no burst when the count drops.
 * @param {number} acc ms carried over
 * @param {number} dtMs frame time
 * @param {number} interval ms between spawns
 * @param {number} live enemies currently alive
 * @param {number} cap max enemies alive
 * @returns {{spawns: number, acc: number}}
 */
export function spawnsDue(acc, dtMs, interval, live, cap) {
  let a = acc + dtMs;
  let spawns = 0;
  while (a >= interval && live + spawns < cap) {
    a -= interval;
    spawns++;
  }
  if (live + spawns >= cap) a = Math.min(a, interval);
  return { spawns, acc: a };
}
