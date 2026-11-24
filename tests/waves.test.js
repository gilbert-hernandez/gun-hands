import { describe, expect, it } from 'vitest';
import { waveAt, pickType, spawnsDue } from '../src/enemy/waves.js';
import { seeded } from './rng.js';

const keys = [
  { at: 0, interval: 1000, cap: 10, weights: { a: 1, b: 0 } },
  { at: 10, interval: 500, cap: 21, weights: { a: 0.5, b: 0.5 } },
];

describe('waveAt', () => {
  it('returns a keyframe exactly', () => {
    expect(waveAt(0, keys)).toEqual({ interval: 1000, cap: 10, weights: { a: 1, b: 0 } });
    expect(waveAt(10, keys)).toEqual({ interval: 500, cap: 21, weights: { a: 0.5, b: 0.5 } });
  });

  it('interpolates halfway, flooring the cap', () => {
    expect(waveAt(5, keys)).toEqual({ interval: 750, cap: 15, weights: { a: 0.75, b: 0.25 } });
  });

  it('holds the first keyframe before it and the last after it', () => {
    expect(waveAt(-3, keys)).toEqual(waveAt(0, keys));
    expect(waveAt(999, keys)).toEqual(waveAt(10, keys));
  });

  it('does not share weight objects with the config', () => {
    waveAt(0, keys).weights.a = 42;
    expect(keys[0].weights.a).toBe(1);
  });

  it('works with a single keyframe', () => {
    expect(waveAt(7, [keys[0]]).cap).toBe(10);
  });
});

describe('pickType', () => {
  it('follows the weights', () => {
    const rand = seeded(7);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 10000; i++) counts[pickType({ a: 1, b: 3, c: 0 }, rand)]++;
    expect(counts.c).toBe(0);
    expect(counts.b / counts.a).toBeGreaterThan(2.6);
    expect(counts.b / counts.a).toBeLessThan(3.4);
  });

  it('never picks zero weights, even at the edges of the roll', () => {
    expect(pickType({ a: 0, b: 1 }, () => 0)).toBe('b');
    expect(pickType({ a: 1, b: 0 }, () => 0.999999)).toBe('a');
  });

  it('returns null when nothing has weight', () => {
    expect(pickType({ a: 0 })).toBeNull();
  });
});

describe('spawnsDue', () => {
  it('spawns once per elapsed interval', () => {
    expect(spawnsDue(0, 250, 1000, 0, 10)).toEqual({ spawns: 0, acc: 250 });
    expect(spawnsDue(900, 250, 1000, 0, 10)).toEqual({ spawns: 1, acc: 150 });
    expect(spawnsDue(0, 2500, 1000, 0, 10)).toEqual({ spawns: 2, acc: 500 });
  });

  it('never passes the cap and does not bank time while capped', () => {
    expect(spawnsDue(0, 5000, 1000, 9, 10)).toEqual({ spawns: 1, acc: 1000 });
    expect(spawnsDue(1000, 5000, 1000, 10, 10)).toEqual({ spawns: 0, acc: 1000 });
  });
});
