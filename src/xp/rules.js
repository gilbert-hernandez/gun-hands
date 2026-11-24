// Pure XP rules (GH-7): no Phaser, so they can be unit-tested.

/** @typedef {{ base: number, growth: number, exponent: number }} XpCurve */
/** @typedef {{ startSpeed: number, accel: number, maxSpeed: number }} MagnetConfig */

/**
 * XP needed to go from `level` to `level + 1`: round(base + growth * (level - 1) ^ exponent),
 * at least 1.
 * @param {number} level current level (1 or more)
 * @param {XpCurve} curve
 */
export function xpToNext(level, { base, growth, exponent }) {
  return Math.max(1, Math.round(base + growth * Math.pow(level - 1, exponent)));
}

/**
 * Add `amount` XP to a level and the XP into it, carrying leftovers over as many levels as it covers.
 * @param {{ level: number, xpInto: number }} state
 * @param {number} amount
 * @param {XpCurve} curve
 * @returns {{ level: number, xpInto: number, gained: number }}
 */
export function addXp({ level, xpInto }, amount, curve) {
  let into = xpInto + amount;
  let lvl = level;
  for (let need = xpToNext(lvl, curve); into >= need; need = xpToNext(lvl, curve)) {
    into -= need;
    lvl += 1;
  }
  return { level: lvl, xpInto: into, gained: lvl - level };
}

/**
 * The highest tier whose value `value` reaches (the lowest tier when it reaches none).
 * @template {string} K
 * @param {number} value
 * @param {Record<K, { value: number }>} tiers
 * @returns {K}
 */
export function tierForValue(value, tiers) {
  const sorted = /** @type {K[]} */ (Object.keys(tiers)).sort((a, b) => tiers[a].value - tiers[b].value);
  let best = sorted[0];
  for (const id of sorted) if (value >= tiers[id].value) best = id;
  return best;
}

/**
 * One frame of a homing gem: accelerate up to the max speed and move straight at the target.
 * The gem is collected when it ends within `collectDistance` of the target, including when this
 * step would carry it past the target (so fast gems never overshoot and orbit).
 * @param {{ x: number, y: number, speed: number }} gem
 * @param {{ x: number, y: number }} target
 * @param {number} dtMs frame time in ms
 * @param {MagnetConfig} magnet
 * @param {number} collectDistance px
 * @returns {{ x: number, y: number, speed: number, collected: boolean }}
 */
export function homeStep(gem, target, dtMs, magnet, collectDistance) {
  const dt = dtMs / 1000;
  const speed = Math.min(magnet.maxSpeed, gem.speed + magnet.accel * dt);
  const dx = target.x - gem.x;
  const dy = target.y - gem.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist - step <= collectDistance) return { x: target.x, y: target.y, speed, collected: true };
  return { x: gem.x + (dx / dist) * step, y: gem.y + (dy / dist) * step, speed, collected: false };
}
