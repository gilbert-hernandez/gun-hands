import { describe, expect, it } from 'vitest';
import { PLAYER, UPGRADES, WEAPON, XP } from '../src/config/index.js';
import { asset } from '../src/assets/manifest.js';

const byId = Object.fromEntries(UPGRADES.list.map((u) => [u.id, u]));

describe('Upgrades config', () => {
  it('has exactly the 7 upgrades', () => {
    expect(UPGRADES.list.map((u) => u.id).sort()).toEqual(
      ['damage', 'firerate', 'maxhp', 'movespeed', 'multishot', 'pickup', 'pierce'].sort(),
    );
  });

  it('gives every upgrade a positive integer max rank, a positive step, a name and a description', () => {
    for (const u of UPGRADES.list) {
      expect(Number.isInteger(u.maxRank)).toBe(true);
      expect(u.maxRank).toBeGreaterThanOrEqual(1);
      expect(u.step).toBeGreaterThan(0);
      expect(u.name.length).toBeGreaterThan(0);
      expect(u.describe(u.step).length).toBeGreaterThan(0);
    }
  });

  it('uses 32x32 icon keys from the manifest, the filler included', () => {
    for (const u of [...UPGRADES.list, UPGRADES.filler]) {
      const entry = asset(u.icon);
      expect(entry.frameWidth).toBe(32);
      expect(entry.frameHeight).toBe(32);
    }
  });

  it('gives each card a distinct placeholder icon color', () => {
    const tints = [...UPGRADES.list, UPGRADES.filler].map((u) => u.placeholderTint);
    expect(new Set(tints).size).toBe(tints.length);
  });

  it('keeps the maxed-out player slower than the XP magnet', () => {
    const { step, maxRank } = byId.movespeed;
    expect(PLAYER.speed + step * maxRank).toBeLessThan(XP.magnet.maxSpeed);
  });

  it('fits the worst-case bullets in flight in the bullet pool', () => {
    const rate = WEAPON.fireRate + byId.firerate.step * byId.firerate.maxRank;
    const count = WEAPON.bullet.count + byId.multishot.step * byId.multishot.maxRank;
    const inFlight = Math.ceil(rate * count * (WEAPON.bullet.lifetime / 1000));
    expect(inFlight).toBeLessThanOrEqual(WEAPON.poolSize);
  });

  it('has a positive input delay, spread step and filler heal', () => {
    expect(UPGRADES.inputDelayMs).toBeGreaterThan(0);
    expect(UPGRADES.spreadStepDeg).toBeGreaterThan(0);
    expect(UPGRADES.filler.heal).toBeGreaterThan(0);
  });
});
