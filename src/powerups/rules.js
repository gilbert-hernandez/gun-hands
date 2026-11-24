// Pure powerup rules (GH-9): no Phaser, so they can be unit-tested.

/** @typedef {import('../config/powerups.js').PowerupId} PowerupId */
/** @typedef {import('../config/powerups.js').TimedPowerupId} TimedPowerupId */
/** @typedef {import('../config/powerups.js').PowerupType} PowerupType */
/** @typedef {Partial<Record<TimedPowerupId, number>>} ActiveTimers timed powerup id -> ms left */

/**
 * The weapon fields a shot reads. The Player's per-run `weapon` has all of these.
 * @typedef {{ fireRate: number, muzzleOffset: number, bullet: { count: number, spreadDeg: number } & Record<string, number> }} WeaponStats
 */

/**
 * Whether a killed enemy drops a powerup.
 * @param {string} typeId enemy type
 * @param {Record<string, number>} dropChance enemy type -> chance in [0, 1]
 * @param {() => number} rng returns [0, 1)
 */
export function rollDrop(typeId, dropChance, rng) {
  return rng() < (dropChance[typeId] ?? 0);
}

/**
 * Pick an id with probability proportional to its weight.
 * @template {string} K
 * @param {Record<K, number>} weights
 * @param {() => number} rng returns [0, 1)
 * @returns {K}
 */
export function pickWeighted(weights, rng) {
  const ids = /** @type {K[]} */ (Object.keys(weights));
  const total = ids.reduce((sum, id) => sum + weights[id], 0);
  let r = rng() * total;
  for (const id of ids) {
    r -= weights[id];
    if (r < 0) return id;
  }
  return ids[ids.length - 1];
}

/**
 * Whether powerup `id` is timed (has a duration) rather than instant.
 * @param {string} id
 * @param {Record<string, PowerupType>} types
 * @returns {id is TimedPowerupId}
 */
export function isTimed(id, types) {
  return (types[id]?.durationMs ?? 0) > 0;
}

/**
 * The weapon a shot uses: the per-run `weapon` plus the boosts of the active timed powerups.
 * Never changes `weapon`; returns `weapon` itself when no weapon boost is active.
 * @template {WeaponStats} W
 * @param {W} weapon
 * @param {ActiveTimers} active
 * @param {Record<string, PowerupType>} types
 * @returns {W}
 */
export function effectiveWeapon(weapon, active, types) {
  const rapid = (active.rapidfire ?? 0) > 0;
  const spread = (active.spread ?? 0) > 0;
  if (!rapid && !spread) return weapon;
  const bullet = { ...weapon.bullet };
  if (spread) {
    bullet.count += types.spread.extraCount ?? 0;
    bullet.spreadDeg += types.spread.extraSpreadDeg ?? 0;
  }
  const fireRate = rapid ? weapon.fireRate * (types.rapidfire.fireRateMult ?? 1) : weapon.fireRate;
  return { ...weapon, fireRate, bullet };
}

/**
 * Count every active timer down by `delta` (never below 0). Timers that reach 0 are removed and
 * listed in `expired`.
 * @param {ActiveTimers} active
 * @param {number} delta ms
 * @returns {{ active: ActiveTimers, expired: TimedPowerupId[] }}
 */
export function tickTimers(active, delta) {
  /** @type {ActiveTimers} */
  const next = {};
  /** @type {TimedPowerupId[]} */
  const expired = [];
  for (const id of /** @type {TimedPowerupId[]} */ (Object.keys(active))) {
    const left = Math.max(0, active[id] - delta);
    if (left > 0) next[id] = left;
    else expired.push(id);
  }
  return { active: next, expired };
}

/**
 * Whether something that blinks near its end is visible with `msLeft` remaining: always above
 * `warnMs`, then alternating every `blinkMs`.
 * @param {number} msLeft
 * @param {number} warnMs
 * @param {number} blinkMs
 */
export function pickupVisible(msLeft, warnMs, blinkMs) {
  if (msLeft > warnMs) return true;
  return Math.floor(msLeft / blinkMs) % 2 === 1;
}
