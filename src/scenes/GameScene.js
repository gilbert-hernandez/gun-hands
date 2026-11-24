import Phaser from 'phaser';
import { DEBUG, DISPLAY, WEAPON, WORLD } from '../config/index.js';
import Player, { PLAYER_FIRED } from '../player/Player.js';
import Enemies from '../enemy/Enemies.js';
import Bullets from '../weapon/Bullets.js';
import { gunsFlipY } from '../weapon/aim.js';
import Arena from '../world/Arena.js';
import { addSceneLabel } from './sceneLabel.js';

// The play session: the Tiled arena, the player, enemies, and a camera that follows the player.
// The player auto-fires from a bullet pool; walls stop the player, bullets, and enemies.
// Enemies spawn off-screen and chase the player (GH-5); combat between them arrives in GH-6.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    addSceneLabel(this);
    /** Survival time in ms: counted in update(), so it stops while the scene is paused. */
    this.survivalMs = 0;

    this.arena = new Arena(this);
    const { width, height, spawn } = this.arena;
    this.physics.world.setBounds(0, 0, width, height);

    this.bullets = new Bullets(this);
    this.player = new Player(this, spawn.x, spawn.y, this.bullets);
    this.arena.collide(this.player);
    this.player.isSolidAt = (x, y) => this.arena.isSolidAt(x, y);
    // Walls always stop bullets, whatever pierce they have left.
    this.bulletWalls = this.arena.collide(this.bullets.group, (bullet) => /** @type {any} */ (bullet).despawn());
    this.createMuzzleFlash();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, height);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, WORLD.cameraLerp, WORLD.cameraLerp);

    this.enemies = new Enemies(this, this.player, (x, y) => this.arena.isSolidAt(x, y), { width, height });
    this.arena.collide(this.enemies.group);

    // HUD overlay runs in parallel on top of Game.
    this.scene.launch('UI');

    if (DEBUG.enabled) {
      // Tuning aid, not the HUD (GH-10): survival time and live enemies / cap.
      this.debugText = this.add
        .text(8, DISPLAY.height - 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' })
        .setOrigin(0, 1)
        .setScrollFactor(0)
        .setDepth(100);
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
    this.survivalMs += delta;
    // Count the flash down before firing, so a shot this frame shows for the full duration.
    this.muzzleMsLeft -= delta;
    if (this.muzzle.visible && this.muzzleMsLeft <= 0) this.muzzle.setVisible(false);
    this.player.update(time, delta);
    this.enemies.update(delta, this.survivalMs);
    this.debugText?.setText(`t ${formatTime(this.survivalMs)}  enemies ${this.enemies.liveCount}/${this.enemies.cap}`);
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

/** ms -> "m:ss" */
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
