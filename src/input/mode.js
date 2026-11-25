/** @typedef {'keys' | 'touch'} InputMode */

const KEY = 'inputMode';

/**
 * The input mode last used in play, kept for the whole page visit; undefined before any.
 * @param {Phaser.Scene} scene
 * @returns {InputMode | undefined}
 */
export function inputMode(scene) {
  return scene.registry.get(KEY);
}

/**
 * @param {Phaser.Scene} scene
 * @param {InputMode} mode
 */
export function setInputMode(scene, mode) {
  scene.registry.set(KEY, mode);
}

/**
 * Whether prompts should describe touch: the last mode used, else whether the device's main
 * pointer is touch. Only wording depends on the device; the controls never do.
 * @param {Phaser.Scene} scene
 */
export function useTouchWording(scene) {
  const mode = inputMode(scene);
  if (mode) return mode === 'touch';
  return scene.sys.game.device.input.touch && window.matchMedia('(pointer: coarse)').matches;
}
