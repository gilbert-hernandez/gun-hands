// Pure spawn-point math (no Phaser), so it can be unit-tested.

/**
 * Radius of the spawn ring around the view center: far enough that a sprite of half size
 * `maxHalfSprite` placed anywhere on it lies completely outside the view, plus `margin`.
 * @param {{width: number, height: number}} view visible area in px
 * @param {number} margin extra px beyond the view
 * @param {number} maxHalfSprite half of the largest sprite's size (px)
 */
export function ringRadius(view, margin, maxHalfSprite) {
  return Math.hypot(view.width / 2, view.height / 2) + maxHalfSprite + margin;
}

/**
 * Pick a random point on the ring where the whole hurtbox is on open floor inside the map
 * (see `boxIsClear`). Tries `attempts` random angles and returns null if none fits.
 * @param {object} o
 * @param {{x: number, y: number}} o.center ring center (the camera view center)
 * @param {number} o.radius ring radius
 * @param {{width: number, height: number, offsetY?: number}} o.box hurtbox size; `offsetY` moves its center relative to the spawn point
 * @param {(x: number, y: number) => boolean} o.isSolid true on walls (and outside the map)
 * @param {number} o.worldW
 * @param {number} o.worldH
 * @param {number} o.attempts
 * @param {() => number} [o.rand] returns [0, 1)
 * @returns {{x: number, y: number, angle: number} | null}
 */
export function findSpawnPoint({ center, radius, box, isSolid, worldW, worldH, attempts, rand = Math.random }) {
  for (let i = 0; i < attempts; i++) {
    const angle = rand() * Math.PI * 2;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    if (boxIsClear(x, y + (box.offsetY ?? 0), box.width, box.height, isSolid, worldW, worldH)) {
      return { x, y, angle };
    }
  }
  return null;
}

/**
 * True if a box centered at (cx, cy) is inside the map and none of it is solid. Samples a grid
 * over the box (edges inset by 1 px) with points at most `step` px apart, so with `step` at or
 * below half a tile no wall tile can sit between samples.
 * @param {number} cx
 * @param {number} cy
 * @param {number} w
 * @param {number} h
 * @param {(x: number, y: number) => boolean} isSolid
 * @param {number} worldW
 * @param {number} worldH
 * @param {number} [step] max px between samples
 */
export function boxIsClear(cx, cy, w, h, isSolid, worldW, worldH, step = 16) {
  const left = cx - w / 2;
  const top = cy - h / 2;
  if (left < 0 || top < 0 || left + w > worldW || top + h > worldH) return false;
  const nx = Math.max(1, Math.ceil((w - 2) / step));
  const ny = Math.max(1, Math.ceil((h - 2) / step));
  for (let i = 0; i <= nx; i++) {
    const x = left + 1 + ((w - 2) * i) / nx;
    for (let j = 0; j <= ny; j++) {
      if (isSolid(x, top + 1 + ((h - 2) * j) / ny)) return false;
    }
  }
  return true;
}
