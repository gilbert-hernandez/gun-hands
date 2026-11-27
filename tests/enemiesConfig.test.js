import { describe, expect, it } from 'vitest';
import { ENEMIES, PLAYER, DISPLAY } from '../src/config/index.js';
import { asset } from '../src/assets/manifest.js';
import { ringRadius } from '../src/enemy/spawn.js';
import { spawnMultipliers } from '../src/enemy/scaling.js';

const { types, waves } = ENEMIES;

describe('enemy types', () => {
  it('defines grunt, runner and brute', () => {
    expect(Object.keys(types).sort()).toEqual(['brute', 'grunt', 'runner']);
  });

  it('orders speed runner > grunt > brute, all below the player', () => {
    expect(types.runner.speed).toBeGreaterThan(types.grunt.speed);
    expect(types.grunt.speed).toBeGreaterThan(types.brute.speed);
    for (const t of Object.values(types)) expect(t.speed).toBeLessThan(PLAYER.speed);
  });

  it('orders HP runner < grunt < brute', () => {
    expect(types.runner.hp).toBeLessThan(types.grunt.hp);
    expect(types.grunt.hp).toBeLessThan(types.brute.hp);
  });

  it('orders knockback runner > grunt > brute > 0', () => {
    expect(types.runner.knockback).toBeGreaterThan(types.grunt.knockback);
    expect(types.grunt.knockback).toBeGreaterThan(types.brute.knockback);
    expect(types.brute.knockback).toBeGreaterThan(0);
  });

  it('has positive contact damage below the player max HP, largest for the brute', () => {
    for (const t of Object.values(types)) {
      expect(t.contactDamage).toBeGreaterThan(0);
      expect(t.contactDamage).toBeLessThan(PLAYER.maxHp);
      if (t !== types.brute) expect(types.brute.contactDamage).toBeGreaterThan(t.contactDamage);
    }
  });

  it('uses 64 px sprites for the brute and 32 px for the others', () => {
    expect(types.brute.size).toBe(64);
    expect(types.grunt.size).toBe(32);
    expect(types.runner.size).toBe(32);
  });

  it('has walk sheets in the manifest at the type size, and hurtboxes that fit', () => {
    for (const t of Object.values(types)) {
      const e = asset(t.walk);
      expect(e.frameWidth).toBe(t.size);
      expect(e.frameHeight).toBe(t.size);
      expect(t.hurtbox.width).toBeLessThanOrEqual(t.size);
      expect(t.hurtbox.height).toBeLessThanOrEqual(t.size);
      // GH-12: the hurtbox ends at the drawn feet, inside the frame.
      expect(Number.isInteger(t.footGap) && t.footGap >= 0).toBe(true);
      expect(t.hurtbox.height + t.footGap).toBeLessThanOrEqual(t.size);
    }
  });
});

describe('wave keyframes', () => {
  it('ramps monotonically', () => {
    for (let i = 1; i < waves.length; i++) {
      expect(waves[i].at).toBeGreaterThan(waves[i - 1].at);
      expect(waves[i].interval).toBeLessThanOrEqual(waves[i - 1].interval);
      expect(waves[i].cap).toBeGreaterThanOrEqual(waves[i - 1].cap);
    }
  });

  it('starts at t = 0 with a weight for every type', () => {
    expect(waves[0].at).toBe(0);
    for (const k of waves) expect(Object.keys(k.weights).sort()).toEqual(Object.keys(types).sort());
  });

  it('opens with Grunt-only keyframes, and Runners come before Brutes', () => {
    expect(waves[0].weights).toMatchObject({ runner: 0, brute: 0 });
    expect(waves[1].weights).toMatchObject({ runner: 0, brute: 0 });
    const firstRunner = waves.findIndex((k) => k.weights.runner > 0);
    const firstBrute = waves.findIndex((k) => k.weights.brute > 0);
    expect(firstRunner).toBeGreaterThan(0);
    expect(firstBrute).toBeGreaterThan(firstRunner);
  });

  it('keeps building pressure until 15:00 (GH-13)', () => {
    expect(waves[waves.length - 1].at).toBeGreaterThanOrEqual(900);
    expect(Math.max(...waves.map((k) => k.cap))).toBeGreaterThanOrEqual(300);
  });

  it('fits in the pool', () => {
    expect(ENEMIES.poolSize).toBeGreaterThanOrEqual(Math.max(...waves.map((k) => k.cap)));
  });
});

describe('enemy scaling (GH-13)', () => {
  const { scaling } = ENEMIES;

  it('has sane per-level amounts, caps and overtime rates', () => {
    for (const k of ['hp', 'speed', 'damage']) {
      expect(scaling.perLevel[k]).toBeGreaterThanOrEqual(0);
      expect(scaling.maxLevelBonus[k]).toBeGreaterThanOrEqual(0);
      expect(scaling.overtime.perMinute[k]).toBeGreaterThanOrEqual(0);
    }
    // "Slightly": the level alone never more than doubles HP or adds over 25% speed.
    expect(scaling.maxLevelBonus.hp).toBeLessThanOrEqual(1);
    expect(scaling.maxLevelBonus.speed).toBeLessThanOrEqual(0.25);
    expect(scaling.overtime.startS).toBe(600);
  });

  it('lets an overtime Runner outpace the base player by 15:00 at level 10', () => {
    const m = spawnMultipliers(10, 900, scaling);
    expect(types.runner.speed * m.speed).toBeGreaterThan(PLAYER.speed);
  });

  it('keeps every enemy slower than the base player before overtime, even at the level cap', () => {
    const m = spawnMultipliers(1000, 599, scaling);
    for (const t of Object.values(types)) expect(t.speed * m.speed).toBeLessThan(PLAYER.speed);
  });
});

describe('spawn and recycle distances', () => {
  it('recycles beyond the spawn ring', () => {
    const maxHalf = Math.max(...Object.values(types).map((t) => t.size)) / 2;
    const ring = ringRadius(DISPLAY, ENEMIES.spawn.margin, maxHalf);
    expect(ENEMIES.recycleDistance).toBeGreaterThan(ring);
  });
});
