import { AUDIO } from '../config/index.js';
import { useTouchWording } from '../input/mode.js';
import { MUTE_CHANGED, getSfx } from '../audio/Sfx.js';
import { pickLayout } from './layout.js';

/** Label for a mute state. */
export const soundLabel = (muted) => (muted ? 'SOUND OFF' : 'SOUND ON');

/**
 * The SOUND ON/OFF toggle (GH-29) on the title screen and the pause menu: a small text that
 * toggles mute when clicked or tapped and follows mute changes from the M key. Padding enlarges
 * its hit area (more on touch devices).
 * @param {import('phaser').Scene} scene
 * @param {'title' | 'pause'} place
 * @returns {import('phaser').GameObjects.Text}
 */
export function addSoundToggle(scene, place) {
  const sfx = getSfx(scene);
  const layout = pickLayout(AUDIO.toggle, useTouchWording(scene));
  const { x, y, originX } = layout[place];
  const text = scene.add
    .text(x, y, soundLabel(sfx.muted), {
      fontFamily: layout.fontFamily,
      fontSize: `${layout.fontSize}px`,
      color: layout.color,
    })
    .setPadding(layout.hitPadding)
    .setOrigin(originX, 0)
    .setInteractive({ useHandCursor: true });

  text.on('pointerup', () => {
    sfx.toggleMuted();
    // Audible confirmation when turning sound back on (muted requests play nothing anyway).
    sfx.play('ui-click');
  });
  const refresh = (muted) => text.setText(soundLabel(muted));
  sfx.on(MUTE_CHANGED, refresh);
  scene.events.once('shutdown', () => sfx.off(MUTE_CHANGED, refresh));
  return text;
}
