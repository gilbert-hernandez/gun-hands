import Phaser from 'phaser';
import { PLAYER, WEAPON } from '../config/index.js';
import { velocityFrom, facingFrom } from './movement.js';
import { aimAngle, spreadAngles, shotsDue, gunsFlipY } from '../weapon/aim.js';

const ANIM_IDLE = 'player_body_idle';
const ANIM_RUN = 'player_body_run';

/** Scene event emitted once per shot with `{ x, y, angle }` (gun tip, radians). */
export const PLAYER_FIRED = 'player-fired';

/**
 * The player: an Arcade physics sprite for the body (with a hurtbox smaller than the sprite)
 * plus a plain sprite for the gun-hands that follows the body and rotates toward the aim.
 * The guns auto-fire bullets from the pool at `weapon.fireRate`.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {import('../weapon/Bullets.js').default} bullets the bullet pool to fire from
   */
  constructor(scene, x, y, bullets) {
    super(scene, x, y, ANIM_IDLE);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const { width, height, offsetX, offsetY } = PLAYER.hurtbox;
    this.body.setSize(width, height, false).setOffset(offsetX, offsetY);
    this.setCollideWorldBounds(true);

    this.guns = scene.add.sprite(x, y, 'player_guns_idle');
    this.guns.setDepth(1);

    /** @type {'left' | 'right'} */
    this.facing = 'right';
    this.pointerUsed = false;
    this.bullets = bullets;
    // Per-run weapon stats: upgrades and powerups change this copy, never the config.
    this.weapon = structuredClone(WEAPON);
    // Aim angle in radians (0 = right); points the way the body faces until the mouse is used.
    this.aim = 0;
    this.fireAcc = 0;
    /** @type {Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>} */
    this.keys = /** @type {any} */ (scene.input.keyboard.addKeys('W,A,S,D'));

    ensureAnim(scene, ANIM_IDLE, PLAYER.anims.idle);
    ensureAnim(scene, ANIM_RUN, PLAYER.anims.run);
    this.play(ANIM_IDLE);

    // Aim facing only kicks in after the mouse has actually moved over the game.
    const onPointerMove = () => {
      this.pointerUsed = true;
    };
    scene.input.on('pointermove', onPointerMove);

    // Sync the guns after physics has moved the body this frame (no one-frame lag).
    // Rotation replaces flipX; flipY keeps them right side up when aiming left.
    const syncGuns = () => this.guns.setPosition(this.x, this.y).setRotation(this.aim).setFlipY(gunsFlipY(this.aim));
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, syncGuns);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointermove', onPointerMove);
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, syncGuns);
    });
  }

  /**
   * Read input, set velocity, facing, animation and aim, then fire any shots that are due.
   * Call once per frame from the scene.
   * @param {number} time scene time in ms
   * @param {number} delta frame time in ms
   */
  update(time, delta) {
    const k = this.keys;
    const v = velocityFrom({ up: k.W.isDown, down: k.S.isDown, left: k.A.isDown, right: k.D.isDown }, PLAYER.speed);
    this.setVelocity(v.x, v.y);

    let aimPoint;
    if (this.pointerUsed) {
      const pointer = this.scene.input.activePointer;
      // Recompute from screen coords so aim stays right while the camera scrolls.
      aimPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    }
    const aimX = aimPoint?.x;
    this.facing = facingFrom({ vx: v.x, aimX, playerX: this.x, pointerUsed: this.pointerUsed, current: this.facing });
    // Art faces right; flip for left.
    this.setFlipX(this.facing === 'left');

    const moving = v.x !== 0 || v.y !== 0;
    this.play(moving ? ANIM_RUN : ANIM_IDLE, true);

    const facingAngle = this.facing === 'left' ? Math.PI : 0;
    this.aim = aimPoint ? aimAngle(this, aimPoint, facingAngle) : facingAngle;

    this.fire(time, delta);
  }

  /** Fire the shots due this frame from the gun tip, one `PLAYER_FIRED` event per shot. */
  fire(time, delta) {
    const { fireRate, muzzleOffset, bullet } = this.weapon;
    const due = shotsDue(this.fireAcc, delta, fireRate);
    this.fireAcc = due.acc;
    for (let i = 0; i < due.shots; i++) {
      const x = this.x + Math.cos(this.aim) * muzzleOffset;
      const y = this.y + Math.sin(this.aim) * muzzleOffset;
      // A full pool returns null; that bullet is simply skipped.
      for (const angle of spreadAngles(this.aim, bullet.count, bullet.spreadDeg)) {
        this.bullets.fire(x, y, angle, bullet, time);
      }
      this.scene.events.emit(PLAYER_FIRED, { x, y, angle: this.aim });
    }
  }

  destroy(fromScene) {
    this.guns?.destroy(fromScene);
    super.destroy(fromScene);
  }
}

/** Create a looping animation over all frames of a sprite sheet key (once per game). */
export function ensureAnim(scene, key, frameRate) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key), frameRate, repeat: -1 });
}
