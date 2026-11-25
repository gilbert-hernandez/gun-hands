import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import { useTouchWording } from '../input/mode.js';
import Button from '../ui/Button.js';
import { versionLabel } from '../util/version.js';
import { addSceneLabel } from './sceneLabel.js';

// The title screen (GH-11): background, logo, Start button and a controls hint. Start, Enter or
// Space start a session (once); a click anywhere else does nothing. While the logo or background
// is a placeholder, the logo is drawn as text and the background as a plain fill. The build
// version (GH-24) sits small in the bottom-left corner; it isn't interactive.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = DISPLAY;
    const { keys, title } = FLOW;
    const placeholders = new Set(this.registry.get('placeholders') ?? []);
    /** Set by the first start; later inputs are ignored. */
    this.started = false;

    if (placeholders.has(keys.titleBg)) {
      this.add.rectangle(0, 0, width, height, title.placeholderFill).setOrigin(0);
    } else {
      this.add.image(0, 0, keys.titleBg).setOrigin(0);
    }

    /** @type {Phaser.GameObjects.Image | Phaser.GameObjects.Text} */
    this.logo = placeholders.has(keys.logo)
      ? this.add
          .text(width / 2, title.logoY, 'GUN HANDS', {
            fontFamily: FLOW.fontFamily,
            fontSize: '64px',
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
      : this.add.image(width / 2, title.logoY, keys.logo);

    this.startButton = new Button(this, width / 2, title.startY, 'START', () => this.start());
    const hint = useTouchWording(this) ? title.touchHint : title.hint;
    this.hintText = this.add
      .text(width / 2, title.hintY, hint, { fontFamily: FLOW.fontFamily, fontSize: '14px', color: '#9ca3af' })
      .setOrigin(0.5);
    const v = title.version;
    this.versionText = this.add
      .text(v.x, v.y, versionLabel(__APP_VERSION__, __APP_COMMIT__, import.meta.env.DEV), {
        fontFamily: FLOW.fontFamily,
        fontSize: v.fontSize,
        color: v.color,
      })
      .setOrigin(0, 1);
    addSceneLabel(this);

    this.input.keyboard.on('keydown-ENTER', () => this.start());
    this.input.keyboard.on('keydown-SPACE', () => this.start());
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.scene.start('Game');
  }
}
