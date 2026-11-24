import Phaser from 'phaser';
import { ENEMIES } from '../config/index.js';

/** @typedef {keyof typeof ENEMIES.types} EnemyTypeId */

/**
 * One pooled enemy. Created by the group on demand (never by game code) and recycled:
 * `despawn()` hides and deactivates it, and `spawn()` brings it back as any type.
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key = ENEMIES.types.grunt.walk, frame) {
    super(scene, x, y, key, frame);
    /** @type {EnemyTypeId} */
    this.typeId = 'grunt';
    this.hp = 0;
    this.maxHp = 0;
    this.speed = 0;
  }

  /**
   * Bring this enemy into play as `typeId` at (x, y) with full HP.
   * @param {EnemyTypeId} typeId
   * @param {number} x
   * @param {number} y
   * @param {Set<string>} placeholders texture keys that are generated placeholders
   */
  spawn(typeId, x, y, placeholders) {
    const type = ENEMIES.types[typeId];
    this.typeId = typeId;
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.speed = type.speed;

    this.setTexture(type.walk, 0);
    this.enableBody(true, x, y, true, true);
    // Hurtbox centered horizontally and bottom-aligned (feet), like the player's.
    const { width, height } = type.hurtbox;
    const body = /** @type {Phaser.Physics.Arcade.Body} */ (this.body);
    body.setSize(width, height, false).setOffset((type.size - width) / 2, type.size - height);
    // enableBody's reset places the body at the sprite's top-left, ignoring the offset, until the
    // next physics step. Sync now so overlap checks right after a spawn see the real hurtbox.
    body.updateFromGameObject();
    body.prev.copy(body.position);
    body.prevFrame.copy(body.position);
    this.setFlipX(false);
    if (placeholders.has(type.walk)) this.setTint(type.placeholderTint);
    else this.clearTint();
    this.play(type.walk, true);
    return this;
  }

  /** Remove from play and free the pool slot. */
  despawn() {
    this.anims.stop();
    this.disableBody(true, true);
  }
}
