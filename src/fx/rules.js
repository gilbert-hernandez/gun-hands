// Pure game-feel rules (GH-13), no Phaser, so they can be unit-tested.

/**
 * Camera shake intensity for the player taking `damage`: proportional, capped at the maximum.
 * @param {{ intensityPerDamage: number, maxIntensity: number }} cfg JUICE.shake.playerHit
 * @param {number} damage
 * @returns {number} 0 for no (or negative) damage
 */
export function shakeIntensity(cfg, damage) {
  if (!(damage > 0)) return 0;
  return Math.min(cfg.maxIntensity, damage * cfg.intensityPerDamage);
}

/**
 * Whether a new shake should start, given the one in progress. A stronger (or equal) shake replaces
 * the running one; a weaker one is dropped so it can't cut a stronger one short.
 * @param {boolean} running a shake is in progress
 * @param {number} currentIntensity intensity of the running shake
 * @param {number} intensity intensity of the new shake
 * @returns {boolean}
 */
export function shouldShake(running, currentIntensity, intensity) {
  if (!(intensity > 0)) return false;
  return !running || intensity >= currentIntensity;
}

/**
 * Whether a hit-stop may start now: none is running, the cooldown since the last one ended has
 * passed, and its length is positive.
 * @param {object} s
 * @param {number} s.nowMs current time (any monotonic clock)
 * @param {number} s.remainingMs ms left of the running hit-stop (0 = none)
 * @param {number | null} s.lastEndMs when the last hit-stop ended (null = never)
 * @param {number} s.cooldownMs
 * @param {number} s.ms length of the new hit-stop
 * @returns {boolean}
 */
export function canHitStop({ nowMs, remainingMs, lastEndMs, cooldownMs, ms }) {
  if (!(ms > 0) || remainingMs > 0) return false;
  return lastEndMs === null || nowMs - lastEndMs >= cooldownMs;
}
