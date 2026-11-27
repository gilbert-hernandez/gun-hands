// Loot powerup tunables (GH-9). Drop, pickup and powerup code reads these; don't hard-code them
// elsewhere. A powerup is timed when it has `durationMs`; the others act once, when collected.

/** @typedef {'rapidfire' | 'spread' | 'shield' | 'health' | 'bomb' | 'magnet'} PowerupId */
/** @typedef {'rapidfire' | 'spread' | 'shield'} TimedPowerupId */

/**
 * @typedef {object} PowerupType
 * @property {string} sheet pickup shimmer sprite sheet key (asset manifest)
 * @property {number} placeholderTint tint used only while the sheet is a placeholder
 * @property {number} [durationMs] timed powerups: how long the effect lasts from pickup
 * @property {number} [fireRateMult] Rapid Fire: fire rate multiplier
 * @property {number} [extraCount] Spread Shot: projectiles added per shot
 * @property {number} [extraSpreadDeg] Spread Shot: degrees added to the fan
 * @property {number} [heal] Health Pack: HP restored (capped at max HP)
 * @property {number} [damage] Bomb: damage to every enemy on screen
 */

/** @type {Record<PowerupId, PowerupType>} */
const types = {
  rapidfire: { sheet: 'pickup_rapidfire', placeholderTint: 0xf97316, durationMs: 10000, fireRateMult: 2 }, // orange
  spread: { sheet: 'pickup_spread', placeholderTint: 0x22d3ee, durationMs: 10000, extraCount: 2, extraSpreadDeg: 30 }, // cyan
  shield: { sheet: 'pickup_shield', placeholderTint: 0x6366f1, durationMs: 8000 }, // indigo
  health: { sheet: 'pickup_health', placeholderTint: 0xef4444, heal: 30 }, // red
  bomb: { sheet: 'pickup_bomb', placeholderTint: 0x475569, damage: 100 }, // slate
  magnet: { sheet: 'pickup_magnet', placeholderTint: 0xa3e635 }, // lime
};

export const POWERUPS = {
  types,
  /**
   * Chance (0-1) that a killed enemy of each type drops a powerup.
   * @type {Record<keyof typeof import('./enemies.js').ENEMIES.types, number>}
   */
  dropChance: { grunt: 0.02, runner: 0.03, brute: 0.25 },
  /**
   * Relative weights for which powerup a drop is (normalized when picking).
   * @type {Record<PowerupId, number>}
   */
  weights: { rapidfire: 3, spread: 3, shield: 2, health: 3, bomb: 1, magnet: 2 },
  // Time per frame (ms), from david's GH-18/GH-20 notes: pickup tokens and the shield bubble loop,
  // the bomb blast plays once.
  frameMs: { pickup: 140, shield: 100, bombBlast: 80 },
  // A pickup this close to the player's center (px) is collected. Pickups never home.
  collectRadius: 20,
  // How long an uncollected pickup stays on the floor (ms).
  lifetimeMs: 12000,
  // The pickup blinks for this last part of its lifetime (ms).
  warnMs: 3000,
  // Blink period (ms per visible/hidden half), for pickups and the shield aura.
  blinkMs: 120,
  // The shield aura blinks for this last part of the Shield (ms).
  shieldWarnMs: 2000,
  // Max pickups on the floor at once; extra drops are skipped.
  poolSize: 12,
  // Scale of the 64 px blast sprite. The Bomb's camera shake is JUICE.shake.bomb (GH-13).
  bombBlastScale: 6,
};
