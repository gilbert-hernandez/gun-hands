// Pure combat rules (GH-6): no Phaser, so they can be unit-tested.

/**
 * Apply `damage` to `hp`.
 * @param {number} hp
 * @param {number} damage
 * @param {boolean} [clamp] floor the result at 0 (the player); enemies keep the raw value
 * @returns {{ hp: number, dead: boolean }}
 */
export function applyDamage(hp, damage, clamp = false) {
  const left = hp - damage;
  return { hp: clamp ? Math.max(0, left) : left, dead: left <= 0 };
}

/**
 * Knockback velocity along a bullet's direction of travel.
 * @param {number} vx bullet velocity x
 * @param {number} vy bullet velocity y
 * @param {number} speed push speed in px/s
 * @returns {{ x: number, y: number }} zero when the bullet isn't moving
 */
export function knockbackVelocity(vx, vy, speed) {
  const len = Math.hypot(vx, vy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: (vx / len) * speed, y: (vy / len) * speed };
}

/**
 * Count a timer down by `delta`, never below 0.
 * @param {number} msLeft
 * @param {number} delta
 */
export function tickTimer(msLeft, delta) {
  return Math.max(0, msLeft - delta);
}

/**
 * Whether a blinking sprite is visible with `msLeft` of invulnerability remaining.
 * Alternates every `period` ms, and is always visible once the time is up.
 * @param {number} msLeft
 * @param {number} period
 */
export function blinkVisible(msLeft, period) {
  if (msLeft <= 0) return true;
  return Math.floor(msLeft / period) % 2 === 1;
}
