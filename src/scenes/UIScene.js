import Phaser from 'phaser';
import { addSceneLabel } from './sceneLabel.js';

// HUD overlay, launched alongside Game. Real HP/XP/timer/kills come in GH-10.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    addSceneLabel(this)?.setY(20);
    this.add.text(16, 36, 'HP 100/100   XP 0   LV 1   (HUD placeholder)', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
  }
}
