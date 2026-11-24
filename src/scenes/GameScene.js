import Phaser from 'phaser';
import { DEBUG, WEAPON, WORLD } from '../config/index.js';
import Player, { PLAYER_FIRED } from '../player/Player.js';
import Bullets from '../weapon/Bullets.js';
import { gunsFlipY } from '../weapon/aim.js';
import Arena from '../world/Arena.js';
import { addSceneLabel } from './sceneLabel.js';

// The play session: the Tiled arena, the player, and a camera that follows it.
// The player auto-fires from a bullet pool; walls stop the player and bullets.
// Enemies etc. arrive in later GH tickets (they collide via `this.arena.collide`).
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    addSceneLabel(this);

    this.arena = new Arena(this);
    const { width, height, spawn } = this.arena;
    this.physics.world.setBounds(0, 0, width, height);

    this.bullets = new Bullets(this);
    this.player = new Player(this, spawn.x, spawn.y, this.bullets);
    this.arena.collide(this.player);
    // Walls always stop bullets, whatever pierce they have left.
    this.bulletWalls = this.arena.collide(this.bullets.group, (bullet) => /** @type {any} */ (bullet).despawn());
    this.createMuzzleFlash();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, height);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, WORLD.cameraLerp, WORLD.cameraLerp);

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
}
