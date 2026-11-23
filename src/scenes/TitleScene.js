import Phaser from 'phaser';
import { DISPLAY } from '../config/index.js';
import { addSceneLabel } from './sceneLabel.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = DISPLAY;
    addSceneLabel(this);

    this.add
      .text(width / 2, height / 2 - 40, 'GUN HANDS', { fontFamily: 'monospace', fontSize: '64px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const prompt = this.add
      .text(width / 2, height / 2 + 40, 'Click or press Enter', { fontFamily: 'monospace', fontSize: '20px', color: '#cccccc' })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    const start = () => this.scene.start('Game');
    this.input.once('pointerdown', start);
    this.input.keyboard.once('keydown-ENTER', start);
  }
}
