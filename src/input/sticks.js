// Pure thumbstick math (no Phaser), so it can be unit-tested.

/** @typedef {{x: number, y: number}} Vec */

/**
 * Which stick a touch starts: the left half of the screen moves, the right half aims.
 * @param {number} x
 * @param {number} width
 * @returns {'move' | 'aim'}
 */
export function sideOf(x, width) {
  return x < width / 2 ? 'move' : 'aim';
}

/**
 * Unit vector from the stick's origin to the thumb, or null inside the dead zone.
 * @param {Vec} origin
 * @param {Vec} point
 * @param {number} deadZone px
 * @returns {Vec | null}
 */
export function stickVector(origin, point, deadZone) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length === 0 || length < deadZone) return null;
  return { x: dx / length, y: dy / length };
}

/**
 * The knob's offset from the origin: it follows the thumb but stays within `radius`.
 * @param {Vec} origin
 * @param {Vec} point
 * @param {number} radius px
 * @returns {Vec}
 */
export function knobOffset(origin, point, radius) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const length = Math.hypot(dx, dy);
  const scale = length > radius ? radius / length : 1;
  return { x: dx * scale, y: dy * scale };
}

/**
 * The nearest point on the canvas, for drawing a stick that started beside it (GH-26).
 * @param {Vec} point
 * @param {number} width
 * @param {number} height
 * @returns {Vec}
 */
export function clampToCanvas(point, width, height) {
  return { x: Math.min(Math.max(point.x, 0), width), y: Math.min(Math.max(point.y, 0), height) };
}
