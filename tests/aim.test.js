import { describe, expect, it } from 'vitest';
import { aimAngle, spreadAngles, shotsDue, applyHit, gunsFlipY, pathBlocked } from '../src/weapon/aim.js';

const deg = (d) => (d * Math.PI) / 180;
const origin = { x: 100, y: 100 };

describe('aimAngle', () => {
  it('points into all four quadrants (screen y grows downward)', () => {
    expect(aimAngle(origin, { x: 200, y: 0 }, 0)).toBeCloseTo(deg(-45), 10); // up-right
    expect(aimAngle(origin, { x: 0, y: 0 }, 0)).toBeCloseTo(deg(-135), 10); // up-left
    expect(aimAngle(origin, { x: 0, y: 200 }, 0)).toBeCloseTo(deg(135), 10); // down-left
    expect(aimAngle(origin, { x: 200, y: 200 }, 0)).toBeCloseTo(deg(45), 10); // down-right
  });

  it('handles the axes', () => {
    expect(aimAngle(origin, { x: 150, y: 100 }, 1)).toBe(0);
    expect(aimAngle(origin, { x: 100, y: 150 }, 1)).toBeCloseTo(deg(90), 10);
    expect(Math.abs(aimAngle(origin, { x: 50, y: 100 }, 1))).toBeCloseTo(Math.PI, 10);
  });

  it('returns the fallback when the points coincide', () => {
    expect(aimAngle(origin, { x: 100, y: 100 }, Math.PI)).toBe(Math.PI);
    expect(aimAngle(origin, { ...origin }, 0)).toBe(0);
  });
});

describe('spreadAngles', () => {
  it('count 1 goes straight along the aim and ignores the spread', () => {
    expect(spreadAngles(0.7, 1, 90)).toEqual([0.7]);
    expect(spreadAngles(0.7, 0, 90)).toEqual([0.7]);
  });

  it('count 3 over 30° gives -15°, 0, +15° around the aim', () => {
    const aim = deg(40);
    const a = spreadAngles(aim, 3, 30);
    expect(a).toHaveLength(3);
    expect(a[0]).toBeCloseTo(aim - deg(15), 10);
    expect(a[1]).toBeCloseTo(aim, 10);
    expect(a[2]).toBeCloseTo(aim + deg(15), 10);
  });

  it('fans evenly for larger counts', () => {
    const a = spreadAngles(0, 5, 40);
    expect(a.map((x) => (x * 180) / Math.PI)).toEqual([-20, -10, 0, 10, 20].map((d) => expect.closeTo(d, 8)));
  });
});

describe('shotsDue', () => {
  it('4 shots/s over 1000 ms of 16 ms frames gives 4 shots', () => {
    let acc = 0;
    let shots = 0;
    // ceil(1000 / 16) = 63 frames = 1008 ms, the first frame boundary at or past 1 s.
    for (let i = 0; i < Math.ceil(1000 / 16); i++) {
      const r = shotsDue(acc, 16, 4);
      acc = r.acc;
      shots += r.shots;
    }
    expect(shots).toBe(4);
  });

  it('a 5000 ms frame gives at most 2 shots (no burst)', () => {
    const r = shotsDue(0, 5000, 4);
    expect(r.shots).toBeLessThanOrEqual(2);
    expect(r.acc).toBeGreaterThanOrEqual(0);
    expect(r.acc).toBeLessThan(250);
  });

  it('carries the remainder between frames', () => {
    expect(shotsDue(0, 100, 4)).toEqual({ shots: 0, acc: 100 });
    expect(shotsDue(200, 100, 4)).toEqual({ shots: 1, acc: 50 });
  });

  it('fires nothing at a zero fire rate', () => {
    expect(shotsDue(100, 1000, 0)).toEqual({ shots: 0, acc: 0 });
  });
});

describe('applyHit', () => {
  it('pierce 1 survives one hit, then dies', () => {
    const first = applyHit(1);
    expect(first).toEqual({ pierceLeft: 0, alive: true });
    expect(applyHit(first.pierceLeft)).toEqual({ pierceLeft: 0, alive: false });
  });

  it('pierce 0 dies on the first hit', () => {
    expect(applyHit(0)).toEqual({ pierceLeft: 0, alive: false });
  });
});

describe('gunsFlipY', () => {
  it('flips only beyond ±90°', () => {
    expect(gunsFlipY(0)).toBe(false);
    expect(gunsFlipY(deg(89))).toBe(false);
    expect(gunsFlipY(deg(-89))).toBe(false);
    expect(gunsFlipY(Math.PI / 2)).toBe(false);
    expect(gunsFlipY(-Math.PI / 2)).toBe(false);
    expect(gunsFlipY(deg(91))).toBe(true);
    expect(gunsFlipY(deg(-91))).toBe(true);
    expect(gunsFlipY(Math.PI)).toBe(true);
    expect(gunsFlipY(-Math.PI)).toBe(true);
  });
});

describe('pathBlocked', () => {
  // A wall occupying x 448..480 (one 32 px tile column).
  const wall = (/** @type {number} */ x) => x >= 448 && x < 480;
  const solid = (/** @type {number} */ x, /** @type {number} */ _y) => wall(x);

  it('is true when the gun tip is inside the wall (player flush against it)', () => {
    // Player center 8 px from the face, tip 14 px + 3 px bullet radius along the aim.
    expect(pathBlocked(488, 640, Math.PI, 17, solid)).toBe(true);
  });

  it('is true when only the bullet radius would reach the wall', () => {
    expect(pathBlocked(496, 640, Math.PI, 17, solid)).toBe(true);
  });

  it('is false when aiming away from the wall or standing clear of it', () => {
    expect(pathBlocked(488, 640, 0, 17, solid)).toBe(false);
    expect(pathBlocked(520, 640, Math.PI, 17, solid)).toBe(false);
  });

  it('catches a wall thinner than the path between samples', () => {
    const thin = (/** @type {number} */ x) => x >= 470 && x < 472;
    expect(pathBlocked(488, 640, Math.PI, 17, (x) => thin(x), 2)).toBe(true);
  });
});
