import { describe, expect, it } from 'vitest';
import { scaledStats, spawnMultipliers } from '../src/enemy/scaling.js';

const cfg = {
  perLevel: { hp: 0.05, speed: 0.01, damage: 0.02 },
  maxLevelBonus: { hp: 1, speed: 0.15, damage: 0.1 },
  overtime: { startS: 600, perMinute: { hp: 0.15, speed: 0.12, damage: 0.2 } },
};

describe('spawnMultipliers', () => {
  it('is 1 at level 1 before overtime', () => {
    expect(spawnMultipliers(1, 0, cfg)).toEqual({ hp: 1, speed: 1, damage: 1 });
    expect(spawnMultipliers(1, 599, cfg)).toEqual({ hp: 1, speed: 1, damage: 1 });
  });

  it('grows per level above 1', () => {
    const m = spawnMultipliers(9, 0, cfg);
    expect(m.hp).toBeCloseTo(1.4);
    expect(m.speed).toBeCloseTo(1.08);
    expect(m.damage).toBeCloseTo(1.1); // 8 × 0.02 = 0.16, capped at 0.1
  });

  it('caps each level bonus', () => {
    const m = spawnMultipliers(100, 0, cfg);
    expect(m).toEqual({ hp: 2, speed: 1.15, damage: 1.1 });
  });

  it('adds nothing at exactly the overtime start', () => {
    expect(spawnMultipliers(1, 600, cfg)).toEqual({ hp: 1, speed: 1, damage: 1 });
  });

  it('adds overtime per minute, continuously and without a cap', () => {
    const at12 = spawnMultipliers(1, 720, cfg);
    expect(at12.speed).toBeCloseTo(1.24);
    expect(at12.hp).toBeCloseTo(1.3);
    expect(at12.damage).toBeCloseTo(1.4);
    expect(spawnMultipliers(1, 630, cfg).speed).toBeCloseTo(1.06);
    expect(spawnMultipliers(1, 1800, cfg).damage).toBeCloseTo(5);
  });

  it('multiplies the level and overtime factors', () => {
    const m = spawnMultipliers(9, 720, cfg);
    expect(m.speed).toBeCloseTo(1.08 * 1.24);
    expect(m.hp).toBeCloseTo(1.4 * 1.3);
  });

  it('treats levels below 1 as level 1', () => {
    expect(spawnMultipliers(0, 0, cfg)).toEqual({ hp: 1, speed: 1, damage: 1 });
  });
});

describe('scaledStats', () => {
  it('rounds HP and damage and keeps speed exact', () => {
    expect(scaledStats({ hp: 30, speed: 70, contactDamage: 10 }, { hp: 1.33, speed: 1.07, damage: 1.25 })).toEqual({
      hp: 40,
      speed: 70 * 1.07,
      contactDamage: 13,
    });
  });

  it('never rounds down to 0', () => {
    expect(scaledStats({ hp: 1, speed: 10, contactDamage: 1 }, { hp: 0.1, speed: 1, damage: 0.1 })).toMatchObject({
      hp: 1,
      contactDamage: 1,
    });
  });
});
