import { describe, expect, it } from 'vitest';
import { jitter, rateFor, throttle, xpChainSemitones } from '../src/audio/rules.js';
import { seeded } from './rng.js';

describe('throttle', () => {
  const cfg = { minIntervalMs: 60, maxVoices: 2 };

  it('accepts the first request', () => {
    expect(throttle({ lastMs: null, voices: 0 }, 0, cfg)).toBe(true);
  });

  it('drops a request inside the minimum interval and accepts one at it', () => {
    expect(throttle({ lastMs: 1000, voices: 0 }, 1059, cfg)).toBe(false);
    expect(throttle({ lastMs: 1000, voices: 0 }, 1060, cfg)).toBe(true);
  });

  it('drops a request while the voice cap is reached', () => {
    expect(throttle({ lastMs: 0, voices: 2 }, 10000, cfg)).toBe(false);
    expect(throttle({ lastMs: 0, voices: 1 }, 10000, cfg)).toBe(true);
  });

  it('never drops on interval when it is 0', () => {
    expect(throttle({ lastMs: 5, voices: 0 }, 5, { minIntervalMs: 0, maxVoices: 2 })).toBe(true);
  });
});

describe('xpChainSemitones', () => {
  const cfg = { step: 1, max: 3, gapMs: 350 };

  it('starts at the base pitch and steps up on quick pickups, up to the cap', () => {
    let chain = { lastMs: null, semitones: 0 };
    const got = [];
    for (const t of [0, 100, 200, 300, 400, 500]) {
      const r = xpChainSemitones(chain, t, cfg);
      got.push(r.semitones);
      chain = r.chain;
    }
    expect(got).toEqual([0, 1, 2, 3, 3, 3]);
  });

  it('continues at exactly the gap and resets after a longer pause', () => {
    const at = xpChainSemitones({ lastMs: 0, semitones: 2 }, 350, cfg);
    expect(at.semitones).toBe(3);
    const after = xpChainSemitones({ lastMs: 0, semitones: 2 }, 351, cfg);
    expect(after.semitones).toBe(0);
    expect(after.chain).toEqual({ lastMs: 351, semitones: 0 });
  });
});

describe('jitter', () => {
  it('stays within ±range and varies', () => {
    const rng = seeded(7);
    const values = Array.from({ length: 200 }, () => jitter(rng, 1));
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(Math.min(...values)).toBeLessThan(-0.5);
    expect(Math.max(...values)).toBeGreaterThan(0.5);
  });

  it('is 0 for a range of 0 without using the rng', () => {
    expect(jitter(() => 0.9, 0)).toBe(0);
  });
});

describe('rateFor', () => {
  it('doubles per octave', () => {
    expect(rateFor(0)).toBe(1);
    expect(rateFor(12)).toBeCloseTo(2);
    expect(rateFor(-12)).toBeCloseTo(0.5);
  });
});
