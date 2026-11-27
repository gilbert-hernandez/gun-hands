import { describe, expect, it } from 'vitest';
import { ENEMIES, JUICE } from '../src/config/index.js';

const isColor = (c) => Number.isInteger(c) && c >= 0 && c <= 0xffffff;

describe('JUICE config', () => {
  it('has short, gentle shakes', () => {
    const { playerHit, bruteKill, bomb } = JUICE.shake;
    for (const s of [playerHit, bruteKill, bomb]) expect(s.ms).toBeGreaterThan(0);
    for (const s of [playerHit, bruteKill, bomb]) expect(s.ms).toBeLessThanOrEqual(400);
    expect(playerHit.intensityPerDamage).toBeGreaterThan(0);
    expect(playerHit.maxIntensity).toBeGreaterThan(0);
    for (const i of [playerHit.maxIntensity, bruteKill.intensity, bomb.intensity]) expect(i).toBeLessThanOrEqual(0.02);
  });

  it('orders shakes player hit (max) <= Brute kill <= Bomb', () => {
    const { playerHit, bruteKill, bomb } = JUICE.shake;
    expect(bruteKill.intensity).toBeLessThanOrEqual(bomb.intensity);
    expect(playerHit.maxIntensity).toBeLessThanOrEqual(bomb.intensity);
  });

  it('keeps the hit-stop short with a cooldown', () => {
    expect(JUICE.hitStop.ms).toBeGreaterThan(0);
    expect(JUICE.hitStop.ms).toBeLessThanOrEqual(150);
    expect(JUICE.hitStop.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it('has sane particle bursts and a color per enemy type', () => {
    const { particles } = JUICE;
    expect(Number.isInteger(particles.max) && particles.max > 0).toBe(true);
    for (const b of [particles.hit, particles.death]) {
      expect(Number.isInteger(b.count) && b.count > 0 && b.count <= particles.max).toBe(true);
      expect(b.speed.min).toBeGreaterThanOrEqual(0);
      expect(b.speed.max).toBeGreaterThanOrEqual(b.speed.min);
      expect(b.lifespanMs).toBeGreaterThan(0);
    }
    expect(Object.keys(particles.death.colors).sort()).toEqual(Object.keys(ENEMIES.types).sort());
    for (const c of Object.values(particles.death.colors)) expect(isColor(c)).toBe(true);
    expect(isColor(particles.hitColor)).toBe(true);
  });

  it('has a damage-number pool and colors', () => {
    const d = JUICE.damageNumbers;
    expect(Number.isInteger(d.poolSize) && d.poolSize > 0).toBe(true);
    expect(d.durationMs).toBeGreaterThan(0);
    expect(d.risePx).toBeGreaterThan(0);
    expect(isColor(d.color) && isColor(d.killColor)).toBe(true);
    expect(d.color).not.toBe(d.killColor);
    expect(Number.isInteger(d.font.width) && Number.isInteger(d.font.height)).toBe(true);
  });

  it('fits the stress count in the enemy pool (200+ enemies)', () => {
    expect(JUICE.debug.stressCount).toBeGreaterThanOrEqual(Math.max(...ENEMIES.waves.map((k) => k.cap)));
    expect(ENEMIES.poolSize).toBeGreaterThanOrEqual(JUICE.debug.stressCount);
  });
});
