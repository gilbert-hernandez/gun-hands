import { describe, expect, it } from 'vitest';
import { ENEMIES, PLAYER, XP } from '../src/config/index.js';
import { asset } from '../src/assets/manifest.js';

describe('XP config', () => {
  it('orders tier values small < medium < large', () => {
    const { small, medium, large } = XP.tiers;
    expect(small.value).toBeGreaterThan(0);
    expect(medium.value).toBeGreaterThan(small.value);
    expect(large.value).toBeGreaterThan(medium.value);
  });

  it('maps every enemy type to an existing tier', () => {
    expect(Object.keys(XP.drops).sort()).toEqual(Object.keys(ENEMIES.types).sort());
    for (const tier of Object.values(XP.drops)) expect(XP.tiers).toHaveProperty(tier);
  });

  it('uses 16x16 gem sheets from the manifest', () => {
    for (const tier of Object.values(XP.tiers)) {
      const entry = asset(tier.sheet);
      expect(entry.frameWidth).toBe(16);
      expect(entry.frameHeight).toBe(16);
    }
  });

  it('lets homing gems outrun the player', () => {
    expect(XP.magnet.maxSpeed).toBeGreaterThan(PLAYER.speed);
    expect(XP.magnet.startSpeed).toBeGreaterThan(0);
    expect(XP.magnet.maxSpeed).toBeGreaterThanOrEqual(XP.magnet.startSpeed);
    expect(XP.magnet.accel).toBeGreaterThan(0);
  });

  it('has a positive pickup radius, collect distance and pool size', () => {
    expect(PLAYER.pickupRadius).toBeGreaterThan(XP.collectDistance);
    expect(XP.collectDistance).toBeGreaterThan(0);
    expect(Number.isInteger(XP.poolSize) && XP.poolSize > 0).toBe(true);
  });
});
