import { describe, expect, it } from 'vitest';
import { applyDamage, blinkVisible, knockbackVelocity, tickTimer } from '../src/combat/rules.js';
import { ENEMY_HIT, ENEMY_KILLED, PLAYER_DIED, PLAYER_HIT } from '../src/combat/events.js';
import { formatTime } from '../src/util/format.js';

describe('applyDamage', () => {
  it('reduces HP and stays alive above 0', () => {
    expect(applyDamage(30, 10)).toEqual({ hp: 20, dead: false });
  });

  it('reports death at exactly 0 and below', () => {
    expect(applyDamage(10, 10)).toEqual({ hp: 0, dead: true });
    expect(applyDamage(5, 10)).toEqual({ hp: -5, dead: true });
  });

  it('clamps at 0 for the player', () => {
    expect(applyDamage(5, 20, true)).toEqual({ hp: 0, dead: true });
  });
});

describe('knockbackVelocity', () => {
  it('follows the bullet direction at the given speed', () => {
    expect(knockbackVelocity(480, 0, 220)).toEqual({ x: 220, y: 0 });
    const v = knockbackVelocity(-3, 4, 100);
    expect(v.x).toBeCloseTo(-60);
    expect(v.y).toBeCloseTo(80);
  });

  it('gives zero for a still bullet', () => {
    expect(knockbackVelocity(0, 0, 220)).toEqual({ x: 0, y: 0 });
  });
});

describe('tickTimer', () => {
  it('counts down and never goes negative', () => {
    expect(tickTimer(100, 30)).toBe(70);
    expect(tickTimer(20, 30)).toBe(0);
    expect(tickTimer(0, 16)).toBe(0);
  });
});

describe('blinkVisible', () => {
  it('alternates every period', () => {
    const period = 80;
    const seen = [];
    for (let ms = 1000; ms > 0; ms -= period) seen.push(blinkVisible(ms - 1, period));
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });

  it('is visible when the time is up', () => {
    expect(blinkVisible(0, 80)).toBe(true);
  });
});

describe('events', () => {
  it('has distinct names', () => {
    const names = [ENEMY_HIT, ENEMY_KILLED, PLAYER_HIT, PLAYER_DIED];
    expect(new Set(names).size).toBe(4);
    expect(names).toEqual(['enemy-hit', 'enemy-killed', 'player-hit', 'player-died']);
  });
});

describe('formatTime', () => {
  it('formats m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(42_900)).toBe('0:42');
    expect(formatTime(65_000)).toBe('1:05');
    expect(formatTime(600_000)).toBe('10:00');
  });
});
