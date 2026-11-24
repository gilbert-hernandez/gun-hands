import Phaser from 'phaser';
import { DISPLAY } from '../config/index.js';
import { addSceneLabel } from './sceneLabel.js';

// Stub: the pick-1-of-3 upgrade screen arrives in GH-8. Opened by the XP system (GH-7) with Game
// paused; each close handles one queued level-up, and the screen shows again while more are pending.
export default class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUp');
  }

  create() {
    const { width, height } = DISPLAY;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    addSceneLabel(this)?.setY(52);
    this.add
      .text(width / 2, height / 2 - 20, 'LEVEL UP', { fontFamily: 'monospace', fontSize: '40px', color: '#facc15' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 30, '(stub) Click or press Enter to continue', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const resume = () => {
      /** @type {import('../xp/Xp.js').default | undefined} */
      const xp = /** @type {any} */ (this.scene.get('Game'))?.xp;
      if (xp?.finishLevelUp()) {
        this.scene.restart();
        return;
      }
      this.scene.resume('Game');
      this.scene.stop();
    };
    this.input.once('pointerdown', resume);
    this.input.keyboard.once('keydown-ENTER', resume);
  }
}
