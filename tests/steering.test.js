import { describe, expect, it } from 'vitest';
import { separationPushes, chaseVelocity } from '../src/enemy/steering.js';

const push = (pts, r = 28) =>
  separationPushes(
    pts.map((p) => p[0]),
    pts.map((p) => p[1]),
    pts.length,
    r,
  );

describe('separationPushes', () => {
  it('is zero for a lone enemy', () => {
    const p = push([[100, 100]]);
    expect([p.x[0], p.y[0]]).toEqual([0, 0]);
  });

  it('pushes two close enemies apart symmetrically', () => {
    const p = push([
      [100, 100],
      [110, 100],
    ]);
    expect(p.x[0]).toBeLessThan(0);
    expect(p.x[1]).toBeCloseTo(-p.x[0]);
    expect(p.y[0]).toBe(0);
  });

  it('ignores enemies beyond the radius, including across hash cells', () => {
    const p = push([
      [27, 0],
      [56, 0],
    ]);
    expect(p.x[0]).toBe(0);
    expect(p.x[1]).toBe(0);
  });

  it('finds neighbors in adjacent hash cells', () => {
    const p = push([
      [27, 27],
      [29, 29],
    ]);
    expect(p.x[0]).toBeLessThan(0);
    expect(p.x[1]).toBeGreaterThan(0);
  });

  it('gives coincident enemies non-zero, different pushes', () => {
    const p = push([
      [50, 50],
      [50, 50],
      [50, 50],
    ]);
    const dirs = [0, 1, 2].map((i) => Math.atan2(p.y[i], p.x[i]).toFixed(3));
    for (let i = 0; i < 3; i++) expect(Math.hypot(p.x[i], p.y[i])).toBeGreaterThan(0);
    expect(new Set(dirs).size).toBe(3);
  });

  it('reuses output buffers', () => {
    const ox = new Float64Array(4).fill(9);
    const oy = new Float64Array(4).fill(9);
    const p = separationPushes([0], [0], 1, 28, ox, oy);
    expect(p.x).toBe(ox);
    expect(ox[0]).toBe(0);
  });
});

describe('chaseVelocity', () => {
  it('heads straight at the target at full speed with no push', () => {
    const v = chaseVelocity({ x: 0, y: 0 }, { x: 10, y: 0 }, 70, 0, 0, 1);
    expect(v.x).toBeCloseTo(70);
    expect(v.y).toBeCloseTo(0);
  });

  it('never exceeds speed, even with a huge push', () => {
    const v = chaseVelocity({ x: 0, y: 0 }, { x: 10, y: 5 }, 70, 500, -300, 1.2);
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(70 + 1e-9);
  });

  it('is zero when on the target with no push', () => {
    expect(chaseVelocity({ x: 3, y: 3 }, { x: 3, y: 3 }, 70, 0, 0, 1)).toEqual({ x: 0, y: 0 });
  });
});
