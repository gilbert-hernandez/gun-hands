// Pure enemy steering math (no Phaser), so it can be unit-tested.

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Separation push for each position: the sum of unit vectors away from every other position
 * closer than `radius`, each weighted by (1 - dist / radius). Exactly coincident positions get
 * a deterministic, per-index direction so stacked enemies still come apart.
 * Uses a spatial hash with cell size `radius`, so the cost is about O(n).
 * @param {ArrayLike<number>} xs
 * @param {ArrayLike<number>} ys
 * @param {number} count how many of xs/ys to use
 * @param {number} radius
 * @param {Float64Array} [outX] reused output (length >= count)
 * @param {Float64Array} [outY]
 * @returns {{x: Float64Array, y: Float64Array}}
 */
export function separationPushes(xs, ys, count, radius, outX, outY) {
  const px = outX && outX.length >= count ? outX : new Float64Array(count);
  const py = outY && outY.length >= count ? outY : new Float64Array(count);
  px.fill(0, 0, count);
  py.fill(0, 0, count);

  /** @type {Map<number, number[]>} */
  const cells = new Map();
  const cellOf = (v) => Math.floor(v / radius);
  // Cell coords packed into one number; fine for maps under ~65k cells across.
  const keyOf = (cx, cy) => cx * 65536 + cy;
  for (let i = 0; i < count; i++) {
    const k = keyOf(cellOf(xs[i]), cellOf(ys[i]));
    const list = cells.get(k);
    if (list) list.push(i);
    else cells.set(k, [i]);
  }

  const r2 = radius * radius;
  for (let i = 0; i < count; i++) {
    const cx = cellOf(xs[i]);
    const cy = cellOf(ys[i]);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const list = cells.get(keyOf(cx + dx, cy + dy));
        if (!list) continue;
        for (const j of list) {
          if (j === i) continue;
          const ox = xs[i] - xs[j];
          const oy = ys[i] - ys[j];
          const d2 = ox * ox + oy * oy;
          if (d2 >= r2) continue;
          if (d2 === 0) {
            // Coincident: push along a direction unique to i (golden-angle spiral).
            const a = i * GOLDEN_ANGLE;
            px[i] += Math.cos(a);
            py[i] += Math.sin(a);
            continue;
          }
          const d = Math.sqrt(d2);
          const w = (1 - d / radius) / d;
          px[i] += ox * w;
          py[i] += oy * w;
        }
      }
    }
  }
  return { x: px, y: py };
}

/**
 * Velocity toward `target` blended with a separation push, scaled to exactly `speed`
 * (so it never exceeds it). Zero when already on the target with no push.
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} target
 * @param {number} speed px/s
 * @param {number} pushX
 * @param {number} pushY
 * @param {number} strength push weight relative to the unit chase direction
 * @returns {{x: number, y: number}}
 */
export function chaseVelocity(from, target, speed, pushX, pushY, strength) {
  let dx = target.x - from.x;
  let dy = target.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d > 0) {
    dx /= d;
    dy /= d;
  }
  const vx = dx + pushX * strength;
  const vy = dy + pushY * strength;
  const len = Math.hypot(vx, vy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: (vx / len) * speed, y: (vy / len) * speed };
}
