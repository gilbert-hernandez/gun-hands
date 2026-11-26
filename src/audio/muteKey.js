import { getSfx } from './Sfx.js';

/** Shared by every scene's M key: Phaser sometimes handles one keydown twice (GH-9 note). */
const shared = { lastStamp: /** @type {number | null} */ (null) };

/**
 * A keydown handler that toggles mute once per DOM key event: a second call with the same
 * `timeStamp` (the same event handled again) is ignored.
 * @param {{ toggleMuted: () => void }} sfx
 * @param {{ lastStamp: number | null }} [state] shared across scenes by default
 * @returns {(event?: { timeStamp?: number }) => void}
 */
export function muteKeyHandler(sfx, state = shared) {
  return (event) => {
    const stamp = event?.timeStamp ?? null;
    if (stamp !== null && stamp === state.lastStamp) return;
    state.lastStamp = stamp;
    sfx.toggleMuted();
  };
}

/**
 * M toggles all sound effects in this scene (GH-29). Call from each scene that takes input while
 * it is in front: Title, Game, LevelUp, Pause, GameOver.
 * @param {import('phaser').Scene} scene
 */
export function bindMuteKey(scene) {
  scene.input.keyboard?.on('keydown-M', muteKeyHandler(getSfx(scene)));
}
