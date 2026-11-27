// XP and levelling tunables (GH-7). Gem, magnet and XP-curve code reads these; don't hard-code them elsewhere.

/**
 * @typedef {object} GemTier
 * @property {number} value XP a gem of this tier is worth when dropped
 * @property {string} sheet shimmer animation sprite sheet key (asset manifest)
 * @property {number} placeholderTint tint used only while the sheet is a placeholder
 */

/** @type {Record<'small' | 'medium' | 'large', GemTier>} */
const tiers = {
  small: { value: 1, sheet: 'pickup_xp_small', placeholderTint: 0x38bdf8 }, // sky blue
  medium: { value: 3, sheet: 'pickup_xp_medium', placeholderTint: 0x22c55e }, // green
  large: { value: 10, sheet: 'pickup_xp_large', placeholderTint: 0xf472b6 }, // pink
};

export const XP = {
  tiers,
  // Gem shimmer time per frame (ms), from david's GH-20 notes.
  frameMs: 120,
  // Level-up burst around the player (GH-12): time per frame (ms), from david's GH-18 notes.
  levelUpFrameMs: 90,
  /**
   * Gem tier each enemy type drops on death.
   * @type {Record<keyof typeof import('./enemies.js').ENEMIES.types, keyof typeof tiers>}
   */
  drops: { grunt: 'small', runner: 'medium', brute: 'large' },
  // Homing gems start at startSpeed (px/s) and gain accel (px/s²) up to maxSpeed.
  // Keep maxSpeed above PLAYER.speed so a homing gem always catches the player.
  magnet: { startSpeed: 120, accel: 1200, maxSpeed: 520 },
  // A homing gem this close to the player's center (px) is collected.
  collectDistance: 12,
  // Max gems on the floor at once; extra drops merge into the nearest gem.
  poolSize: 300,
  // XP from level L to L+1 = round(base + growth * (L - 1) ^ exponent): 10, 22, 44, 72, 106, ...
  // Level 10 takes 1098 XP in total (GH-13 balance round 1; see the change's balance log).
  curve: { base: 10, growth: 12, exponent: 1.5 },
};
