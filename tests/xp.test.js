import { describe, expect, it } from 'vitest';
import { addXp, homeStep, tierForValue, xpToNext } from '../src/xp/rules.js';
import Progression from '../src/xp/Progression.js';
import { PLAYER_LEVELED, XP_CHANGED } from '../src/xp/events.js';
import { XP } from '../src/config/index.js';

const curve = { base: 5, growth: 4, exponent: 1.3 };

describe('xpToNext', () => {
  it('needs base XP at level 1', () => {
    expect(xpToNext(1, curve)).toBe(5);
    expect(xpToNext(1, XP.curve)).toBe(XP.curve.base);
  });

  it('gives positive integers that never decrease (configured curve, levels 1-50)', () => {
    let prev = 0;
    for (let level = 1; level <= 50; level++) {
      const need = xpToNext(level, XP.curve);
      expect(Number.isInteger(need)).toBe(true);
      expect(need).toBeGreaterThan(0);
      expect(need).toBeGreaterThanOrEqual(prev);
      prev = need;
    }
  });

  it('is at least 1 even for a zero curve', () => {
    expect(xpToNext(1, { base: 0, growth: 0, exponent: 1 })).toBe(1);
  });
});

describe('addXp', () => {
  it('keeps the level below the threshold', () => {
    expect(addXp({ level: 1, xpInto: 0 }, 4, curve)).toEqual({ level: 1, xpInto: 4, gained: 0 });
  });

  it('carries leftover XP into the next level', () => {
    expect(addXp({ level: 1, xpInto: 4 }, 3, curve)).toEqual({ level: 2, xpInto: 2, gained: 1 });
  });

  it('levels up on exactly the needed XP', () => {
    expect(addXp({ level: 1, xpInto: 0 }, 5, curve)).toEqual({ level: 2, xpInto: 0, gained: 1 });
  });

  it('gains several levels from one big add', () => {
    // Level 1 needs 5, level 2 needs 9: 14 covers both.
    expect(addXp({ level: 1, xpInto: 0 }, 15, curve)).toEqual({ level: 3, xpInto: 1, gained: 2 });
  });
});

describe('Progression', () => {
  it('starts at level 1 with 0 XP and nothing pending', () => {
    const p = new Progression(curve);
    expect([p.level, p.xpInto, p.totalXp, p.pending, p.xpNeeded]).toEqual([1, 0, 0, 0, 5]);
  });

  it('queues one level-up per level gained', () => {
    const p = new Progression(curve);
    expect(p.add(15)).toBe(2);
    expect([p.level, p.xpInto, p.totalXp, p.pending]).toEqual([3, 1, 15, 2]);
    p.consume();
    expect(p.pending).toBe(1);
    p.consume();
    p.consume();
    expect(p.pending).toBe(0);
  });
});

describe('tierForValue', () => {
  it('picks the highest tier the value reaches', () => {
    expect(tierForValue(1, XP.tiers)).toBe('small');
    expect(tierForValue(2, XP.tiers)).toBe('small');
    expect(tierForValue(3, XP.tiers)).toBe('medium');
    expect(tierForValue(12, XP.tiers)).toBe('large');
  });

  it('falls back to the lowest tier', () => {
    expect(tierForValue(0, XP.tiers)).toBe('small');
  });
});

describe('homeStep', () => {
  const magnet = { startSpeed: 100, accel: 1000, maxSpeed: 300 };

  it('moves toward the target and accelerates', () => {
    const r = homeStep({ x: 0, y: 0, speed: 100 }, { x: 200, y: 0 }, 100, magnet, 10);
    expect(r.speed).toBe(200);
    expect(r.x).toBeCloseTo(20);
    expect(r.y).toBeCloseTo(0);
    expect(r.collected).toBe(false);
  });

  it('never exceeds the max speed', () => {
    const r = homeStep({ x: 0, y: 0, speed: 290 }, { x: 0, y: 1000 }, 100, magnet, 10);
    expect(r.speed).toBe(300);
    expect(r.y).toBeCloseTo(30);
  });

  it('collects inside the collect distance', () => {
    const r = homeStep({ x: 0, y: 0, speed: 100 }, { x: 5, y: 0 }, 1, magnet, 10);
    expect(r.collected).toBe(true);
  });

  it('collects instead of overshooting on a large step', () => {
    const r = homeStep({ x: 0, y: 0, speed: 300 }, { x: 40, y: 0 }, 500, magnet, 10);
    expect(r).toEqual({ x: 40, y: 0, speed: 300, collected: true });
  });
});

describe('XP events', () => {
  it('exports the event names', () => {
    expect(XP_CHANGED).toBe('xp-changed');
    expect(PLAYER_LEVELED).toBe('player-leveled');
  });
});
