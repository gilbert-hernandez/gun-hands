// Shared animation setup (GH-12). Every sprite sheet animation is built here from all of the
// sheet's frames, with its time per frame (ms) from config, so timings live in one kind of field.

/**
 * Frame rate (fps) for a time per frame in ms. Pure, so it can be unit-tested.
 * @param {number} frameMs
 */
export function frameRateFor(frameMs) {
  return 1000 / frameMs;
}

/**
 * Create an animation over all frames of a sprite sheet once per game (animations are global).
 * @param {import('phaser').Scene} scene
 * @param {string} key animation key; also the sheet key unless `sheet` is given
 * @param {number} frameMs time per frame in ms
 * @param {{ loop?: boolean, sheet?: string }} [opts] `loop` (default true) repeats forever; false plays once
 */
export function ensureAnim(scene, key, frameMs, { loop = true, sheet = key } = {}) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(sheet),
    frameRate: frameRateFor(frameMs),
    repeat: loop ? -1 : 0,
  });
}
