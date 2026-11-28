// Enemy tunables (GH-5, combat numbers GH-6). Enemy and spawner code reads these; don't hard-code them elsewhere.

/**
 * @typedef {object} EnemyType
 * @property {number} speed move speed in px/s (keep below PLAYER.speed)
 * @property {number} hp max HP
 * @property {number} contactDamage HP the player loses when this enemy touches them
 * @property {number} knockback push speed in px/s when hit by a bullet (for COMBAT.knockbackMs)
 * @property {number} size sprite frame size in px (square)
 * @property {{width: number, height: number}} hurtbox physics body, centered horizontally and bottom-aligned in the sprite
 * @property {number} footGap px between the hurtbox bottom and the frame bottom: where the drawn feet end (GH-12)
 * @property {string} walk walk animation sprite sheet key (asset manifest)
 * @property {number} walkMs walk animation time per frame (ms)
 * @property {string} death death animation sprite sheet key (asset manifest), played once
 * @property {number} deathMs death animation time per frame (ms)
 * @property {number} placeholderTint tint used only while the walk art is a placeholder
 */

/** @type {Record<'grunt' | 'runner' | 'brute', EnemyType>} */
const types = {
  grunt: {
    speed: 70,
    hp: 30,
    contactDamage: 10,
    knockback: 220,
    size: 32,
    hurtbox: { width: 18, height: 20 },
    footGap: 2,
    walk: 'enemy_grunt_walk',
    walkMs: 110,
    death: 'enemy_grunt_death',
    deathMs: 110,
    placeholderTint: 0xef4444, // red
  },
  runner: {
    speed: 130,
    hp: 12,
    contactDamage: 6,
    knockback: 320,
    size: 32,
    hurtbox: { width: 14, height: 16 },
    footGap: 2,
    walk: 'enemy_runner_walk',
    walkMs: 70,
    death: 'enemy_runner_death',
    deathMs: 80,
    placeholderTint: 0xfacc15, // yellow
  },
  brute: {
    speed: 45,
    hp: 120,
    contactDamage: 20,
    knockback: 60,
    size: 64,
    hurtbox: { width: 40, height: 44 },
    footGap: 2,
    walk: 'enemy_brute_walk',
    walkMs: 150,
    death: 'enemy_brute_death',
    deathMs: 130,
    placeholderTint: 0xa855f7, // purple
  },
};

/**
 * Wave keyframes by survival time. Values between keyframes are interpolated linearly; before
 * the first and after the last they hold. Interval must not grow and cap must not shrink.
 * Weights are relative (normalized when picking).
 * @type {Array<{at: number, interval: number, cap: number, weights: Record<keyof typeof types, number>}>}
 */
const waves = [
  { at: 0, interval: 1400, cap: 12, weights: { grunt: 1, runner: 0, brute: 0 } },
  // Same mix as t=0, so the first 30 s are Grunts only.
  { at: 30, interval: 1100, cap: 20, weights: { grunt: 1, runner: 0, brute: 0 } },
  { at: 45, interval: 1000, cap: 25, weights: { grunt: 0.8, runner: 0.2, brute: 0 } },
  { at: 120, interval: 600, cap: 60, weights: { grunt: 0.6, runner: 0.3, brute: 0.1 } },
  { at: 240, interval: 350, cap: 120, weights: { grunt: 0.5, runner: 0.3, brute: 0.2 } },
  { at: 360, interval: 220, cap: 180, weights: { grunt: 0.45, runner: 0.3, brute: 0.25 } },
  { at: 480, interval: 160, cap: 220, weights: { grunt: 0.45, runner: 0.3, brute: 0.25 } },
  // Overtime (GH-13, see `scaling`): Runners gain share because they catch a kiting player.
  { at: 600, interval: 120, cap: 260, weights: { grunt: 0.4, runner: 0.35, brute: 0.25 } },
  { at: 720, interval: 80, cap: 300, weights: { grunt: 0.35, runner: 0.4, brute: 0.25 } },
  { at: 900, interval: 50, cap: 300, weights: { grunt: 0.3, runner: 0.45, brute: 0.25 } },
];

export const ENEMIES = {
  types,
  waves,
  spawn: {
    // Extra distance (px) beyond the view so spawns are clearly off-screen.
    margin: 32,
    // Random angles tried per spawn before skipping it.
    attempts: 12,
    // Quiet time at the start of a session before the first spawn (ms).
    startDelayMs: 1000,
  },
  separation: {
    // Enemies closer than this (px, center to center) push each other apart.
    radius: 28,
    // Push weight relative to the chase direction (1 = equal).
    strength: 1.2,
  },
  // Enemy scaling at spawn (GH-13, see src/enemy/scaling.js). Enemies level up with the player:
  // each player level above 1 adds `perLevel` (0.05 = +5%), up to `maxLevelBonus`. From
  // `overtime.startS` of survival, every minute adds `overtime.perMinute` more, with no cap, so
  // runs past 12:00 are rare and 15:00 is effectively impossible. Level and overtime factors multiply.
  scaling: {
    perLevel: { hp: 0.05, speed: 0.01, damage: 0 },
    maxLevelBonus: { hp: 1, speed: 0.15, damage: 0 },
    // Rounds 3–5 (GH-13 balance log): steeper after round 2's bot runs outlived 15:00 with
    // crowd-clearing builds.
    overtime: { startS: 600, perMinute: { hp: 0.5, speed: 0.3, damage: 1 } },
  },
  // Max enemies alive at once (object pool size). Must be >= the largest wave cap and the dev
  // stress count (JUICE.debug.stressCount, GH-13).
  poolSize: 320,
  // Enemies farther than this from the player (px) go back to the pool.
  recycleDistance: 900,
};
