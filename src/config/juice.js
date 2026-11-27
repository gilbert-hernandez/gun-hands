// Game-feel tunables (GH-13): screen shake, hit-stop, particles, damage numbers. The juice code reads
// these; don't hard-code them elsewhere. All of it is cosmetic: nothing here changes gameplay.
// Each session copies this object (`juice.settings`), so tests can change the copy.

/**
 * @typedef {object} ShakeKind
 * @property {number} ms shake duration
 * @property {number} intensity Phaser camera shake intensity (fraction of the view size)
 */

/**
 * @typedef {object} BurstConfig
 * @property {number} count particles per burst
 * @property {{min: number, max: number}} speed particle speed range in px/s
 * @property {number} lifespanMs how long each particle lives
 */

export const JUICE = {
  shake: {
    // Player takes damage: intensity = damage × intensityPerDamage, capped at maxIntensity.
    playerHit: { ms: 120, intensityPerDamage: 0.0005, maxIntensity: 0.008 },
    /** @type {ShakeKind} */
    bruteKill: { ms: 150, intensity: 0.006 },
    /** @type {ShakeKind} */
    bomb: { ms: 200, intensity: 0.01 },
  },
  hitStop: {
    // Game freezes this long when a Brute dies.
    ms: 70,
    // No new hit-stop this soon after the last one ended.
    cooldownMs: 250,
  },
  particles: {
    // Live particles at most; bursts past it are cut short.
    max: 300,
    // Generated 3×3 white square (BootScene), tinted per burst.
    texture: 'fx_dot',
    /** @type {BurstConfig} */
    hit: { count: 4, speed: { min: 40, max: 120 }, lifespanMs: 180 },
    /** @type {BurstConfig & {colors: Record<keyof typeof import('./enemies.js').ENEMIES.types, number>}} */
    death: {
      count: 12,
      speed: { min: 60, max: 180 },
      lifespanMs: 350,
      colors: { grunt: 0xef4444, runner: 0xfacc15, brute: 0xa855f7 },
    },
    // Hit sparks are white-hot.
    hitColor: 0xfff7d6,
  },
  damageNumbers: {
    // Numbers showing at once; a hit with none free shows nothing.
    poolSize: 48,
    // Rise distance (px) and time to fade out (ms).
    risePx: 18,
    durationMs: 450,
    color: 0xffffff,
    killColor: 0xfacc15,
    // Generated digit font (BootScene): glyph cell size in px and the bitmap font key.
    font: { key: 'gh_digits', width: 8, height: 12 },
  },
  debug: {
    // Dev K key: enemies alive at once while the stress test is on (GH-13 perf check).
    stressCount: 220,
  },
};
