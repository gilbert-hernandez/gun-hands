import Phaser from 'phaser';
import { DISPLAY } from '../config/index.js';
import { addSceneLabel } from './sceneLabel.js';

// Stub: run stats and Restart arrive in GH-11.
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create() {
    const { width, height } = DISPLAY;
    addSceneLabel(this);
    this.add
      .text(width / 2, height / 2 - 20, 'GAME OVER', { fontFamily: 'monospace', fontSize: '48px', color: '#ef4444' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 36, 'Click or press Enter to return to title', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const back = () => this.scene.start('Title');
    this.input.once('pointerdown', back);
    this.input.keyboard.once('keydown-ENTER', back);
  }
}
