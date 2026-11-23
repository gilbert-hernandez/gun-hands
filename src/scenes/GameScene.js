import Phaser from 'phaser';
import { DEBUG, WORLD } from '../config/index.js';
import Player from '../player/Player.js';
import { addSceneLabel } from './sceneLabel.js';

const FLOOR_KEY = 'stand_in_floor';
const TILE = 32;

// The play session: a bounded arena, the player, and a camera that follows it.
// Shooting, enemies, etc. arrive in later GH tickets.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height, cameraLerp } = WORLD;
    addSceneLabel(this);

    this.physics.world.setBounds(0, 0, width, height);
    this.createStandInFloor(width, height);

    this.player = new Player(this, width / 2, height / 2);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, height);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, cameraLerp, cameraLerp);

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

  update() {
    this.player.update();
  }

  /**
   * Grid floor + border so movement and camera scrolling are visible before the Tiled map
   * lands. Generated at runtime (not an art asset); remove when the real arena arrives.
   */
  createStandInFloor(width, height) {
    if (!this.textures.exists(FLOOR_KEY)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x1f2430, 1).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x2c3344, 1).fillRect(0, 0, TILE, 1).fillRect(0, 0, 1, TILE);
      g.generateTexture(FLOOR_KEY, TILE, TILE);
      g.destroy();
    }
    this.add.tileSprite(0, 0, width, height, FLOOR_KEY).setOrigin(0, 0).setDepth(-10);
    // Stroke is centered on the outline, so inset it to keep the whole wall inside the world.
    const wall = 6;
    this.add
      .rectangle(wall / 2, wall / 2, width - wall, height - wall)
      .setOrigin(0, 0)
      .setStrokeStyle(wall, 0x8b5a2b, 1)
      .setDepth(-9);
  }
}
