import { describe, expect, it } from 'vitest';
import { ENEMIES, POWERUPS, UPGRADES, WEAPON } from '../src/config/index.js';
import { asset } from '../src/assets/manifest.js';

const IDS = ['bomb', 'health', 'magnet', 'rapidfire', 'shield', 'spread'];
const TIMED = ['rapidfire', 'shield', 'spread'];
const T = POWERUPS.types;

describe('Powerups config', () => {
  it('gives every enemy type a drop chance in [0, 1], the Brute the largest', () => {
    expect(Object.keys(POWERUPS.dropChance).sort()).toEqual(Object.keys(ENEMIES.types).sort());
    for (const p of Object.values(POWERUPS.dropChance)) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    const { brute, grunt, runner } = POWERUPS.dropChance;
    expect(brute).toBeGreaterThan(grunt);
    expect(brute).toBeGreaterThan(runner);
  });

  it('has exactly the 6 powerups, each with a positive weight', () => {
    expect(Object.keys(T).sort()).toEqual(IDS);
    expect(Object.keys(POWERUPS.weights).sort()).toEqual(IDS);
    for (const w of Object.values(POWERUPS.weights)) expect(w).toBeGreaterThan(0);
  });

  it('gives exactly the timed powerups a positive duration', () => {
    for (const id of IDS) {
      const d = T[id].durationMs;
      if (TIMED.includes(id)) expect(d).toBeGreaterThan(0);
      else expect(d).toBeUndefined();
    }
  });

  it('uses 24x24 pickup sheets from the manifest with distinct placeholder tints', () => {
    for (const t of Object.values(T)) {
      const entry = asset(t.sheet);
      expect(entry.frameWidth).toBe(24);
      expect(entry.frameHeight).toBe(24);
    }
    const tints = Object.values(T).map((t) => t.placeholderTint);
    expect(new Set(tints).size).toBe(tints.length);
  });

  it('has positive effect strengths', () => {
    expect(T.rapidfire.fireRateMult).toBeGreaterThan(1);
    expect(T.spread.extraCount).toBeGreaterThan(0);
    expect(T.spread.extraSpreadDeg).toBeGreaterThan(0);
    expect(T.health.heal).toBeGreaterThan(0);
  });

  it('makes the bomb kill Grunts and Runners outright', () => {
    expect(T.bomb.damage).toBeGreaterThanOrEqual(ENEMIES.types.grunt.hp);
    expect(T.bomb.damage).toBeGreaterThanOrEqual(ENEMIES.types.runner.hp);
  });

  it('warns before a pickup or the shield runs out, not for their whole time', () => {
    expect(POWERUPS.warnMs).toBeGreaterThan(0);
    expect(POWERUPS.warnMs).toBeLessThan(POWERUPS.lifetimeMs);
    expect(POWERUPS.shieldWarnMs).toBeGreaterThan(0);
    expect(POWERUPS.shieldWarnMs).toBeLessThan(T.shield.durationMs);
    expect(POWERUPS.blinkMs).toBeGreaterThan(0);
    expect(POWERUPS.collectRadius).toBeGreaterThan(0);
    expect(Number.isInteger(POWERUPS.poolSize) && POWERUPS.poolSize > 0).toBe(true);
  });

  it('fits maxed upgrades plus Rapid Fire and Spread Shot in the bullet pool', () => {
    const up = Object.fromEntries(UPGRADES.list.map((u) => [u.id, u]));
    const rate = (WEAPON.fireRate + up.firerate.step * up.firerate.maxRank) * T.rapidfire.fireRateMult;
    const count = WEAPON.bullet.count + up.multishot.step * up.multishot.maxRank + T.spread.extraCount;
    const inFlight = Math.ceil(rate * count * (WEAPON.bullet.lifetime / 1000));
    expect(inFlight).toBeLessThanOrEqual(WEAPON.poolSize);
  });
});
