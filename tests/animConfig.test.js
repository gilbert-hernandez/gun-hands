import { describe, expect, it } from 'vitest';
import { COMBAT, ENEMIES, PLAYER, POWERUPS, WEAPON, XP } from '../src/config/index.js';
import { MANIFEST } from '../src/assets/manifest.js';
import { frameRateFor } from '../src/fx/anims.js';

// Every animation time per frame in config (GH-12), by a readable name.
const frameTimes = {
  ...Object.fromEntries(Object.entries(PLAYER.frameMs).map(([k, v]) => [`player.${k}`, v])),
  ...Object.fromEntries(
    Object.entries(ENEMIES.types).flatMap(([id, t]) => [
      [`${id}.walk`, t.walkMs],
      [`${id}.death`, t.deathMs],
    ]),
  ),
  ...Object.fromEntries(Object.entries(WEAPON.frameMs).map(([k, v]) => [`weapon.${k}`, v])),
  ...Object.fromEntries(Object.entries(POWERUPS.frameMs).map(([k, v]) => [`powerups.${k}`, v])),
  'combat.impact': COMBAT.impactFrameMs,
  'xp.gems': XP.frameMs,
  'xp.levelUp': XP.levelUpFrameMs,
};

const manifestKeys = new Set(MANIFEST.map((e) => e.key));
const sheetKeys = new Set(MANIFEST.filter((e) => e.type === 'spritesheet').map((e) => e.key));

describe('animation timings (GH-12)', () => {
  it('are positive whole milliseconds', () => {
    for (const [name, ms] of Object.entries(frameTimes)) {
      expect(Number.isInteger(ms) && ms > 0, `${name} = ${ms}`).toBe(true);
    }
  });

  it("use david's suggested timings", () => {
    expect(PLAYER.frameMs).toEqual({ idle: 160, run: 90, hurt: 90, death: 120, recoil: 50 });
    expect(ENEMIES.types.grunt).toMatchObject({ walkMs: 110, deathMs: 110 });
    expect(ENEMIES.types.runner).toMatchObject({ walkMs: 70, deathMs: 80 });
    expect(ENEMIES.types.brute).toMatchObject({ walkMs: 150, deathMs: 130 });
  });

  it('convert to frame rates', () => {
    expect(frameRateFor(100)).toBe(10);
    expect(frameRateFor(160)).toBeCloseTo(6.25);
  });

  it('refer to sprite sheets that exist in the manifest', () => {
    const keys = [
      ...Object.values(ENEMIES.types).flatMap((t) => [t.walk, t.death]),
      ...Object.values(XP.tiers).map((t) => t.sheet),
      ...Object.values(POWERUPS.types).map((t) => t.sheet),
    ];
    for (const k of keys) {
      expect(manifestKeys.has(k), k).toBe(true);
      expect(sheetKeys.has(k), `${k} is a sprite sheet`).toBe(true);
    }
  });
});
