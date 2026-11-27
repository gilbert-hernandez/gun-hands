import Phaser from 'phaser';
import { JUICE } from '../config/index.js';
import { createDigitFont, createDotTexture } from '../fx/digitFont.js';

// First scene: generates the damage-number font and particle texture (GH-13), then hands off to Preload.
// (Scale/physics are configured in main.js from src/config.)
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createDigitFont(this, JUICE.damageNumbers.font);
    createDotTexture(this, JUICE.particles.texture);
    this.scene.start('Preload');
  }
}
