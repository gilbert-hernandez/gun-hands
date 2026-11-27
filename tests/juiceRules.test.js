import { describe, expect, it } from 'vitest';
import { canHitStop, shakeIntensity, shouldShake } from '../src/fx/rules.js';

describe('shakeIntensity', () => {
  const cfg = { intensityPerDamage: 0.001, maxIntensity: 0.008 };

  it('scales with damage', () => {
    expect(shakeIntensity(cfg, 5)).toBeCloseTo(0.005);
  });

  it('caps at the maximum', () => {
    expect(shakeIntensity(cfg, 20)).toBe(0.008);
  });

  it('is 0 for no damage', () => {
    expect(shakeIntensity(cfg, 0)).toBe(0);
    expect(shakeIntensity(cfg, -3)).toBe(0);
    expect(shakeIntensity(cfg, NaN)).toBe(0);
  });
});

describe('shouldShake', () => {
  it('starts when nothing is running', () => {
    expect(shouldShake(false, 0, 0.002)).toBe(true);
  });

  it('replaces a weaker or equal running shake', () => {
    expect(shouldShake(true, 0.004, 0.01)).toBe(true);
    expect(shouldShake(true, 0.004, 0.004)).toBe(true);
  });

  it('drops a weaker shake while a stronger one runs', () => {
    expect(shouldShake(true, 0.01, 0.004)).toBe(false);
  });

  it('never starts a zero shake', () => {
    expect(shouldShake(false, 0, 0)).toBe(false);
  });
});

describe('canHitStop', () => {
  const base = { nowMs: 1000, remainingMs: 0, lastEndMs: null, cooldownMs: 250, ms: 70 };

  it('allows the first hit-stop', () => {
    expect(canHitStop(base)).toBe(true);
  });

  it('refuses while one is running', () => {
    expect(canHitStop({ ...base, remainingMs: 30 })).toBe(false);
  });

  it('refuses inside the cooldown and allows after it', () => {
    expect(canHitStop({ ...base, lastEndMs: 900 })).toBe(false);
    expect(canHitStop({ ...base, lastEndMs: 750 })).toBe(true);
  });

  it('refuses a zero-length hit-stop (disabled)', () => {
    expect(canHitStop({ ...base, ms: 0 })).toBe(false);
  });
});
