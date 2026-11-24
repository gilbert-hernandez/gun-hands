// Pure weapon math (no Phaser), so it can be unit-tested.

/**
 * Angle in radians from `from` to `to` (0 = right, positive = clockwise on screen).
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @param {number} fallback returned when the points coincide
 * @returns {number}
 */
export function aimAngle(from, to, fallback) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return fallback;
  return Math.atan2(dy, dx);
}

/**
 * Angles for one shot: `count` bullets fanned evenly across `spreadDeg` (total width),
 * centered on `aim`. A single bullet goes straight along the aim.
 * @param {number} aim radians
 * @param {number} count
 * @param {number} spreadDeg
 * @returns {number[]}
 */
export function spreadAngles(aim, count, spreadDeg) {
  if (count <= 1) return [aim];
  const spread = (spreadDeg * Math.PI) / 180;
  const step = spread / (count - 1);
  const start = aim - spread / 2;
  return Array.from({ length: count }, (_, i) => start + step * i);
}

/**
 * Fire-rate timer as an accumulator. Adds `dtMs`, clamps to at most 2 shot intervals
 * (so a long frame gives at most one extra shot), and returns how many shots are due.
 * @param {number} acc ms carried over from the previous frame
 * @param {number} dtMs frame time
 * @param {number} fireRate shots per second
 * @returns {{shots: number, acc: number}}
 */
export function shotsDue(acc, dtMs, fireRate) {
  if (!(fireRate > 0)) return { shots: 0, acc: 0 };
  const interval = 1000 / fireRate;
  let total = Math.min(acc + dtMs, interval * 2);
  const shots = Math.floor(total / interval);
  total -= shots * interval;
  return { shots, acc: total };
}

/**
 * A bullet hits an enemy: use one pierce if any is left, otherwise the bullet is spent.
 * @param {number} pierceLeft
 * @returns {{pierceLeft: number, alive: boolean}}
 */
export function applyHit(pierceLeft) {
  if (pierceLeft > 0) return { pierceLeft: pierceLeft - 1, alive: true };
  return { pierceLeft: 0, alive: false };
}

/**
 * Mirror the guns vertically when aiming into the left half, so they aren't drawn upside down.
 * @param {number} angle radians in [-π, π]
 * @returns {boolean}
 */
export function gunsFlipY(angle) {
  return Math.abs(angle) > Math.PI / 2;
}
