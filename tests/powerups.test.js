import { describe, expect, it } from 'vitest';
import { POWERUPS, WEAPON } from '../src/config/index.js';
import { effectiveWeapon, isTimed, pickWeighted, pickupVisible, rollDrop, tickTimers } from '../src/powerups/rules.js';
import { seeded } from './rng.js';

const T = POWERUPS.types;

describe('rollDrop', () => {
  it('matches each type drop chance over 10,000 seeded rolls', () => {
    for (const [typeId, chance] of Object.entries(POWERUPS.dropChance)) {
      const rng = seeded(7);
      let hits = 0;
      for (let i = 0; i < 10000; i++) if (rollDrop(typeId, POWERUPS.dropChance, rng)) hits++;
      expect(Math.abs(hits / 10000 - chance)).toBeLessThan(0.01);
    }
  });

  it('never drops at 0, always at 1, never for unknown types', () => {
    const rng = seeded(3);
    for (let i = 0; i < 1000; i++) {
      expect(rollDrop('grunt', { grunt: 0 }, rng)).toBe(false);
      expect(rollDrop('grunt', { grunt: 1 }, rng)).toBe(true);
      expect(rollDrop('ghost', { grunt: 1 }, rng)).toBe(false);
    }
  });
});

describe('pickWeighted', () => {
  it("matches each weight's share over 12,000 seeded picks", () => {
    const rng = seeded(11);
    /** @type {Record<string, number>} */
    const counts = {};
    for (let i = 0; i < 12000; i++) {
      const id = pickWeighted(POWERUPS.weights, rng);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    const total = Object.values(POWERUPS.weights).reduce((a, b) => a + b, 0);
    for (const [id, w] of Object.entries(POWERUPS.weights)) {
      expect(Math.abs((counts[id] ?? 0) / 12000 - w / total)).toBeLessThan(0.02);
    }
  });

  it('handles the edges of the random range', () => {
    expect(pickWeighted({ a: 1, b: 1 }, () => 0)).toBe('a');
    expect(pickWeighted({ a: 1, b: 1 }, () => 0.999999)).toBe('b');
  });
});

describe('isTimed', () => {
  it('splits timed from instant by duration', () => {
    expect(['rapidfire', 'spread', 'shield'].every((id) => isTimed(id, T))).toBe(true);
    expect(['health', 'bomb', 'magnet', 'nope'].some((id) => isTimed(id, T))).toBe(false);
  });
});

describe('effectiveWeapon', () => {
  const base = () => structuredClone(WEAPON);

  it('returns the same object when no weapon boost is active', () => {
    const w = base();
    expect(effectiveWeapon(w, {}, T)).toBe(w);
    expect(effectiveWeapon(w, { shield: 5000 }, T)).toBe(w);
  });

  it('Rapid Fire multiplies the fire rate', () => {
    const w = base();
    expect(effectiveWeapon(w, { rapidfire: 1 }, T).fireRate).toBe(WEAPON.fireRate * T.rapidfire.fireRateMult);
  });

  it('Spread Shot adds projectiles and widens the fan', () => {
    const e = effectiveWeapon(base(), { spread: 1 }, T);
    expect(e.bullet.count).toBe(WEAPON.bullet.count + T.spread.extraCount);
    expect(e.bullet.spreadDeg).toBe(WEAPON.bullet.spreadDeg + T.spread.extraSpreadDeg);
    expect(e.fireRate).toBe(WEAPON.fireRate);
  });

  it('combines both and never changes the input, passing other stats through', () => {
    const w = base();
    w.bullet.count = 3;
    w.bullet.damage = 17;
    const before = structuredClone(w);
    const e = effectiveWeapon(w, { rapidfire: 1, spread: 1 }, T);
    expect(e.fireRate).toBe(WEAPON.fireRate * 2);
    expect(e.bullet.count).toBe(5);
    expect(e.bullet).toMatchObject({
      damage: 17,
      speed: WEAPON.bullet.speed,
      pierce: WEAPON.bullet.pierce,
      lifetime: WEAPON.bullet.lifetime,
    });
    expect(e.muzzleOffset).toBe(WEAPON.muzzleOffset);
    expect(w).toEqual(before);
  });

  it('ignores timers at 0', () => {
    const w = base();
    expect(effectiveWeapon(w, { rapidfire: 0, spread: 0 }, T)).toBe(w);
  });
});

describe('tickTimers', () => {
  it('counts down, floors at 0, and reports each expiry once', () => {
    let r = tickTimers({ rapidfire: 100, shield: 500 }, 60);
    expect(r).toEqual({ active: { rapidfire: 40, shield: 440 }, expired: [] });
    r = tickTimers(r.active, 60);
    expect(r).toEqual({ active: { shield: 380 }, expired: ['rapidfire'] });
    r = tickTimers(r.active, 1000);
    expect(r).toEqual({ active: {}, expired: ['shield'] });
    expect(tickTimers(r.active, 16).expired).toEqual([]);
  });

  it('does not change its input', () => {
    const a = { spread: 50 };
    tickTimers(a, 100);
    expect(a).toEqual({ spread: 50 });
  });
});

describe('pickupVisible', () => {
  it('is steady above the warning time and alternates inside it', () => {
    expect(pickupVisible(5000, 3000, 120)).toBe(true);
    expect(pickupVisible(3001, 3000, 120)).toBe(true);
    const seen = new Set();
    for (let ms = 3000; ms > 0; ms -= 60) seen.add(pickupVisible(ms, 3000, 120));
    expect(seen).toEqual(new Set([true, false]));
    expect(pickupVisible(130, 3000, 120)).toBe(true);
    expect(pickupVisible(100, 3000, 120)).toBe(false);
  });
});
