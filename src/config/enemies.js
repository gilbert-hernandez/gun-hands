// Enemy tunables (GH-5, combat numbers GH-6). Enemy and spawner code reads these; don't hard-code them elsewhere.

/**
 * @typedef {object} EnemyType
 * @property {number} speed move speed in px/s (keep below PLAYER.speed)
 * @property {number} hp max HP
 * @property {number} contactDamage HP the player loses when this enemy touches them
 * @property {number} knockback push speed in px/s when hit by a bullet (for COMBAT.knockbackMs)
 * @property {number} size sprite frame size in px (square)
 * @property {{width: number, height: number}} hurtbox physics body, centered horizontally and bottom-aligned in the sprite
 * @property {string} walk walk animation sprite sheet key (asset manifest)
 * @property {number} walkFps walk animation frame rate
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
    walk: 'enemy_grunt_walk',
    walkFps: 8,
    placeholderTint: 0xef4444, // red
  },
  runner: {
    speed: 130,
    hp: 12,
    contactDamage: 6,
    knockback: 320,
    size: 32,
    hurtbox: { width: 14, height: 16 },
    walk: 'enemy_runner_walk',
    walkFps: 12,
    placeholderTint: 0xfacc15, // yellow
  },
  brute: {
    speed: 45,
    hp: 120,
    contactDamage: 20,
    knockback: 60,
    size: 64,
    hurtbox: { width: 40, height: 44 },
    walk: 'enemy_brute_walk',
    walkFps: 6,
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
  { at: 120, interval: 700, cap: 50, weights: { grunt: 0.6, runner: 0.3, brute: 0.1 } },
  { at: 240, interval: 450, cap: 90, weights: { grunt: 0.5, runner: 0.3, brute: 0.2 } },
  { at: 360, interval: 300, cap: 140, weights: { grunt: 0.45, runner: 0.3, brute: 0.25 } },
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
  // Max enemies alive at once (object pool size). Must be >= the largest wave cap.
  poolSize: 160,
  // Enemies farther than this from the player (px) go back to the pool.
  recycleDistance: 900,
};
