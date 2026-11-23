import { describe, expect, it } from 'vitest';
import { velocityFrom, facingFrom } from '../src/player/movement.js';

const speed = 200;

describe('velocityFrom', () => {
  it('is zero with no keys', () => {
    expect(velocityFrom({}, speed)).toEqual({ x: 0, y: 0 });
  });

  it('moves along one axis at full speed', () => {
    expect(velocityFrom({ right: true }, speed)).toEqual({ x: 200, y: 0 });
    expect(velocityFrom({ left: true }, speed)).toEqual({ x: -200, y: 0 });
    expect(velocityFrom({ up: true }, speed)).toEqual({ x: 0, y: -200 });
    expect(velocityFrom({ down: true }, speed)).toEqual({ x: 0, y: 200 });
  });

  it('normalizes diagonals to the configured speed', () => {
    for (const keys of [
      { up: true, right: true },
      { up: true, left: true },
      { down: true, right: true },
      { down: true, left: true },
    ]) {
      const v = velocityFrom(keys, speed);
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(speed, 6);
      expect(Math.abs(v.x)).toBeCloseTo(Math.abs(v.y), 6);
    }
    const v = velocityFrom({ up: true, right: true }, speed);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0);
  });

  it('cancels opposite keys', () => {
    expect(velocityFrom({ left: true, right: true }, speed)).toEqual({ x: 0, y: 0 });
    expect(velocityFrom({ up: true, down: true }, speed)).toEqual({ x: 0, y: 0 });
    expect(velocityFrom({ left: true, right: true, up: true }, speed)).toEqual({ x: 0, y: -200 });
    expect(velocityFrom({ left: true, right: true, up: true, down: true }, speed)).toEqual({ x: 0, y: 0 });
  });
});

describe('facingFrom', () => {
  it('follows horizontal movement before the pointer is used', () => {
    expect(facingFrom({ vx: -200, current: 'right' })).toBe('left');
    expect(facingFrom({ vx: 200, current: 'left' })).toBe('right');
  });

  it('keeps facing when moving only vertically or standing still', () => {
    expect(facingFrom({ vx: 0, current: 'left' })).toBe('left');
    expect(facingFrom({ vx: 0, current: 'right' })).toBe('right');
  });

  it('ignores the pointer until it has been used', () => {
    expect(facingFrom({ vx: 200, aimX: 0, playerX: 100, pointerUsed: false, current: 'right' })).toBe('right');
  });

  it('faces the pointer side once the pointer is used, even against movement', () => {
    expect(facingFrom({ vx: 200, aimX: 50, playerX: 100, pointerUsed: true, current: 'right' })).toBe('left');
    expect(facingFrom({ vx: -200, aimX: 150, playerX: 100, pointerUsed: true, current: 'left' })).toBe('right');
    expect(facingFrom({ vx: 0, aimX: 50, playerX: 100, pointerUsed: true, current: 'right' })).toBe('left');
  });

  it('falls back to movement when the pointer is exactly above/below the player', () => {
    expect(facingFrom({ vx: -200, aimX: 100, playerX: 100, pointerUsed: true, current: 'right' })).toBe('left');
    expect(facingFrom({ vx: 0, aimX: 100, playerX: 100, pointerUsed: true, current: 'right' })).toBe('right');
  });
});
