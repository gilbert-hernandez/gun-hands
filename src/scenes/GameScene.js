import Phaser from 'phaser';
import { DEBUG, WEAPON, WORLD } from '../config/index.js';
import Player, { PLAYER_FIRED } from '../player/Player.js';
import Bullets from '../weapon/Bullets.js';
import { gunsFlipY } from '../weapon/aim.js';
import { addSceneLabel } from './sceneLabel.js';

const FLOOR_KEY = 'stand_in_floor';
const TILE = 32;

// The play session: a bounded arena, the player, and a camera that follows it.
// The player auto-fires from a bullet pool. Enemies etc. arrive in later GH tickets.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height, cameraLerp } = WORLD;
    addSceneLabel(this);

    this.physics.world.setBounds(0, 0, width, height);
    this.createStandInFloor(width, height);

    this.bullets = new Bullets(this);
    this.player = new Player(this, width / 2, height / 2, this.bullets);
    this.createMuzzleFlash();

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

  update(time, delta) {
    // Count the flash down before firing, so a shot this frame shows for the full duration.
    this.muzzleMsLeft -= delta;
    if (this.muzzle.visible && this.muzzleMsLeft <= 0) this.muzzle.setVisible(false);
    this.player.update(time, delta);
  }

  /**
   * Placeholder muzzle flash: one reused sprite shown at the gun tip for `muzzleFlashMs`
   * on every `player-fired` event. Art/sound tickets hook the same event.
   */
  createMuzzleFlash() {
    // fx_muzzle's pivot is its left-center, so the flash extends forward from the tip.
    this.muzzle = this.add.sprite(0, 0, 'fx_muzzle').setOrigin(0, 0.5).setDepth(1.5).setVisible(false);
    this.muzzleMsLeft = 0;
    const onFired = ({ x, y, angle }) => {
      this.muzzle.setPosition(x, y).setRotation(angle).setFlipY(gunsFlipY(angle)).setVisible(true);
      this.muzzleMsLeft = WEAPON.muzzleFlashMs;
    };
    this.events.on(PLAYER_FIRED, onFired);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(PLAYER_FIRED, onFired));
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
