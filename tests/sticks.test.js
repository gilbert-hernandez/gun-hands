import { describe, expect, it } from 'vitest';
import { clampToCanvas, knobOffset, sideOf, stickVector } from '../src/input/sticks.js';
import { velocityFromVector } from '../src/player/movement.js';

const origin = { x: 100, y: 200 };
const at = (deg, r) => ({
  x: origin.x + Math.cos((deg * Math.PI) / 180) * r,
  y: origin.y + Math.sin((deg * Math.PI) / 180) * r,
});

describe('sideOf', () => {
  it('splits the screen down the middle', () => {
    expect(sideOf(0, 960)).toBe('move');
    expect(sideOf(479, 960)).toBe('move');
    expect(sideOf(480, 960)).toBe('aim');
    expect(sideOf(959, 960)).toBe('aim');
  });
});

describe('stickVector', () => {
  it('is null inside the dead zone and at the origin', () => {
    expect(stickVector(origin, { x: 111, y: 200 }, 12)).toBeNull();
    expect(stickVector(origin, origin, 12)).toBeNull();
    expect(stickVector(origin, origin, 0)).toBeNull();
  });

  it('starts at the edge of the dead zone', () => {
    expect(stickVector(origin, { x: 112, y: 200 }, 12)).toEqual({ x: 1, y: 0 });
  });

  it('is a unit vector in every direction, however far the thumb is', () => {
    for (let deg = 0; deg < 360; deg += 15) {
      for (const r of [20, 60, 400]) {
        const v = stickVector(origin, at(deg, r), 12);
        expect(v.x).toBeCloseTo(Math.cos((deg * Math.PI) / 180), 6);
        expect(v.y).toBeCloseTo(Math.sin((deg * Math.PI) / 180), 6);
      }
    }
  });
});

describe('knobOffset', () => {
  it('follows the thumb inside the radius', () => {
    expect(knobOffset(origin, { x: 130, y: 180 }, 60)).toEqual({ x: 30, y: -20 });
    expect(knobOffset(origin, origin, 60)).toEqual({ x: 0, y: 0 });
  });

  it('stays on the edge beyond it, in the same direction', () => {
    const k = knobOffset(origin, at(30, 300), 60);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(60, 6);
    expect(Math.atan2(k.y, k.x)).toBeCloseTo(Math.PI / 6, 6);
  });
});

describe('velocityFromVector', () => {
  it('moves at full speed for any non-zero vector', () => {
    expect(velocityFromVector({ x: 0.3, y: 0 }, 200)).toEqual({ x: 200, y: 0 });
    const v = velocityFromVector({ x: -1, y: 1 }, 200);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(200, 6);
  });

  it('stands still for a zero vector', () => {
    expect(velocityFromVector({ x: 0, y: 0 }, 200)).toEqual({ x: 0, y: 0 });
  });
});

describe('clampToCanvas', () => {
  it('leaves points on the canvas alone and moves others to the nearest edge', () => {
    expect(clampToCanvas({ x: 10, y: 20 }, 960, 540)).toEqual({ x: 10, y: 20 });
    expect(clampToCanvas({ x: -80, y: 20 }, 960, 540)).toEqual({ x: 0, y: 20 });
    expect(clampToCanvas({ x: 1000, y: 600 }, 960, 540)).toEqual({ x: 960, y: 540 });
  });
});
