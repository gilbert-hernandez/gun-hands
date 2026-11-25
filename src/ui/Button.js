import Phaser from 'phaser';
import { FLOW } from '../config/index.js';
import { useTouchWording } from '../input/mode.js';
import { pickLayout } from './layout.js';

/** @typedef {'normal' | 'hover' | 'pressed'} ButtonState */

/** Sheet frame per state: `ui_button` is normal, hover, pressed (ASSETS.md, GH-21). */
const FRAMES = { normal: 0, hover: 1, pressed: 2 };

/**
 * A menu button (GH-11): the `ui_button` sheet with a centered label. It shows the hover frame
 * while the pointer is over it and the pressed frame while a press that started on it is held
 * over it. It acts when that press is released over it; a press released elsewhere does nothing.
 * "Act once per screen" is up to the screen (see the scenes' `left`/`started` guards).
 */
export default class Button extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x center x
   * @param {number} y center y
   * @param {string} label
   * @param {() => void} onClick
   */
  constructor(scene, x, y, label, onClick) {
    super(scene, x, y);
    this.onClick = onClick;
    /** True while the press that started on this button is still held. */
    this.armed = false;
    this.over = false;
    this.placeholder = new Set(scene.registry.get('placeholders') ?? []).has(FLOW.keys.button);

    const { scale, fontSize } = pickLayout(FLOW.button, useTouchWording(scene));
    this.image = scene.add.sprite(0, 0, FLOW.keys.button, FRAMES.normal).setScale(scale);
    this.label = scene.add
      .text(0, 0, label, {
        fontFamily: FLOW.fontFamily,
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add([this.image, this.label]);
    scene.add.existing(this);

    this.image.setInteractive({ useHandCursor: true });
    this.image.on('pointerover', () => {
      this.over = true;
      this.refresh();
    });
    this.image.on('pointerout', () => {
      this.over = false;
      this.refresh();
    });
    this.image.on('pointerdown', () => {
      this.armed = true;
      this.refresh();
    });
    this.image.on('pointerup', (pointer) => {
      // Phaser reports a touch the system cancelled as a release.
      const act = this.armed && !pointer.wasCanceled;
      this.armed = false;
      this.refresh();
      if (act) this.onClick();
    });
    // A release anywhere else (on the canvas or outside it) cancels the press. Object-level
    // `pointerup` above runs before these scene-level events, so a release on the button acts first.
    const disarm = () => {
      if (!this.armed) return;
      this.armed = false;
      this.refresh();
    };
    scene.input.on('pointerup', disarm);
    scene.input.on('pointerupoutside', disarm);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off('pointerup', disarm);
      scene.input.off('pointerupoutside', disarm);
    });
    this.refresh();
  }

  /** @returns {ButtonState} what the button shows now (e2e tests read this) */
  get buttonState() {
    if (this.over && this.armed) return 'pressed';
    return this.over ? 'hover' : 'normal';
  }

  refresh() {
    const state = this.buttonState;
    this.image.setFrame(FRAMES[state]);
    if (this.placeholder) this.image.setTint(FLOW.buttonTints[state]);
    // Nudge the label down a pixel while pressed, so it reads as pushed in.
    this.label.setY(state === 'pressed' ? 1 : 0);
  }
}
