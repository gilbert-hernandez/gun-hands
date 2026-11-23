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
  if (dx === 0 && dy === 0) return { x: 0, y: 0 };
  const scale = speed / Math.hypot(dx, dy);
  // `+ 0` turns -0 into 0 so callers can compare with ===.
  return { x: dx * scale + 0, y: dy * scale + 0 };
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
