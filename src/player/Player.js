import Phaser from 'phaser';
import { PLAYER } from '../config/index.js';
import { velocityFrom, facingFrom } from './movement.js';

const ANIM_IDLE = 'player_body_idle';
const ANIM_RUN = 'player_body_run';

/**
 * The player: an Arcade physics sprite for the body (with a hurtbox smaller than the sprite)
 * plus a plain sprite for the gun-hands that follows the body. The guns stay separate so they
 * can rotate independently later (shooting ticket).
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
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
    this.keys = scene.input.keyboard.addKeys('W,A,S,D');

    ensureAnim(scene, ANIM_IDLE, PLAYER.anims.idle);
    ensureAnim(scene, ANIM_RUN, PLAYER.anims.run);
    this.play(ANIM_IDLE);

    // Aim facing only kicks in after the mouse has actually moved over the game.
    const onPointerMove = () => {
      this.pointerUsed = true;
    };
    scene.input.on('pointermove', onPointerMove);

    // Sync the guns after physics has moved the body this frame (no one-frame lag).
    const syncGuns = () => this.guns.setPosition(this.x, this.y).setFlipX(this.flipX);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, syncGuns);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointermove', onPointerMove);
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, syncGuns);
    });
  }

  /** Read input, set velocity, facing and animation. Call once per frame from the scene. */
  update() {
    const k = this.keys;
    const v = velocityFrom({ up: k.W.isDown, down: k.S.isDown, left: k.A.isDown, right: k.D.isDown }, PLAYER.speed);
    this.setVelocity(v.x, v.y);

    let aimX;
    if (this.pointerUsed) {
      const pointer = this.scene.input.activePointer;
      // Recompute from screen coords so aim stays right while the camera scrolls.
      aimX = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y).x;
    }
    this.facing = facingFrom({ vx: v.x, aimX, playerX: this.x, pointerUsed: this.pointerUsed, current: this.facing });
    // Art faces right; flip for left.
    this.setFlipX(this.facing === 'left');

    const moving = v.x !== 0 || v.y !== 0;
    this.play(moving ? ANIM_RUN : ANIM_IDLE, true);
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
