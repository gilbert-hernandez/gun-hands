// Pure movement math (no Phaser), so it can be unit-tested.

/**
 * Velocity for the held direction keys. Opposite keys cancel; diagonals are
 * normalized so total speed always equals `speed`.
 * @param {{up?: boolean, down?: boolean, left?: boolean, right?: boolean}} keys
 * @param {number} speed px/s
 * @returns {{x: number, y: number}}
 */
export function velocityFrom({ up = false, down = false, left = false, right = false }, speed) {
  const dx = (right ? 1 : 0) - (left ? 1 : 0);
  const dy = (down ? 1 : 0) - (up ? 1 : 0);
  return velocityFromVector({ x: dx, y: dy }, speed);
}

/**
 * Velocity along a direction at full `speed`, whatever the vector's length; zero stays zero.
 * @param {{x: number, y: number}} v
 * @param {number} speed px/s
 * @returns {{x: number, y: number}}
 */
export function velocityFromVector(v, speed) {
  const length = Math.hypot(v.x, v.y);
  if (length === 0) return { x: 0, y: 0 };
  // `+ 0` turns -0 into 0 so callers can compare with ===.
  return { x: (v.x / length) * speed + 0, y: (v.y / length) * speed + 0 };
}

/**
 * Which way the body faces.
 * - Once the pointer has been used, it faces the side the pointer is on (aim wins).
 * - Otherwise it faces the last horizontal movement direction.
 * - Vertical-only movement (or standing still) keeps the current facing.
 * @param {{vx: number, aimX?: number, playerX?: number, pointerUsed?: boolean, current: 'left'|'right'}} s
 * @returns {'left'|'right'}
 */
export function facingFrom({ vx, aimX, playerX, pointerUsed = false, current }) {
  if (pointerUsed && aimX != null && playerX != null && aimX !== playerX) {
    return aimX < playerX ? 'left' : 'right';
  }
  if (vx < 0) return 'left';
  if (vx > 0) return 'right';
  return current;
}
