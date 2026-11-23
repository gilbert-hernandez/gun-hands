import Phaser from 'phaser';
import { DISPLAY, DEBUG } from '../config/index.js';
import { addSceneLabel } from './sceneLabel.js';

// The play session. For now it only shows the player and a brute to prove the asset keys work;
// movement, shooting, enemies, etc. arrive in GH-2+.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = DISPLAY;
    addSceneLabel(this);

    this.ensureAnim('player_body_idle', 6);
    this.ensureAnim('enemy_brute_walk', 8);

    this.add.sprite(width / 2, height / 2, 'player_body_idle').play('player_body_idle');
    this.add.sprite(width / 2, height / 2, 'player_guns_idle');
    this.add.sprite(width / 2 + 160, height / 2, 'enemy_brute_walk').play('enemy_brute_walk').setFlipX(true);

    // HUD overlay runs in parallel on top of Game.
    this.scene.launch('UI');

    if (DEBUG.enabled) {
      this.input.keyboard.on('keydown-L', () => {
        this.scene.pause();
        this.scene.launch('LevelUp');
      });
      this.input.keyboard.on('keydown-G', () => {
        this.scene.stop('UI');
        this.scene.start('GameOver');
      });
    }
  }

  /** Create a looping animation over all frames of a sprite sheet key (once per game). */
  ensureAnim(key, frameRate) {
    if (this.anims.exists(key)) return;
    this.anims.create({ key, frames: this.anims.generateFrameNumbers(key), frameRate, repeat: -1 });
  }
}
