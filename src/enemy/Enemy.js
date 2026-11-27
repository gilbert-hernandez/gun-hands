import Phaser from 'phaser';
import { COMBAT, ENEMIES } from '../config/index.js';
import { applyDamage, knockbackVelocity } from '../combat/rules.js';

/** @typedef {keyof typeof ENEMIES.types} EnemyTypeId */

const FLASH_COLOR = 0xffffff;

/** Bumped on every spawn, so a recycled enemy is distinguishable from its previous life. */
let nextSpawnId = 1;

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
    /** HP the player loses on contact: the type's, scaled at spawn (GH-13). */
    this.contactDamage = 0;
    /** Unique per spawn (see `Bullet.hasHit`). */
    this.spawnId = 0;
    /** Whether the current type's walk art is a generated placeholder (drawn tinted). */
    this.usesPlaceholder = false;
    /** ms left of the white hit flash. */
    this.flashMs = 0;
    /** ms left of knockback; while > 0 the enemy doesn't steer. */
    this.knockMs = 0;
  }

  /**
   * Bring this enemy into play as `typeId` at (x, y) with full HP.
   * @param {EnemyTypeId} typeId
   * @param {number} x
   * @param {number} y
   * @param {Set<string>} placeholders texture keys that are generated placeholders
   * @param {{ hp: number, speed: number, contactDamage: number }} [stats] scaled stats (GH-13);
   *   the type's own when omitted
   */
  spawn(typeId, x, y, placeholders, stats = ENEMIES.types[typeId]) {
    const type = ENEMIES.types[typeId];
    this.typeId = typeId;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.speed = stats.speed;
    this.contactDamage = stats.contactDamage;
    this.spawnId = nextSpawnId++;
    this.flashMs = 0;
    this.knockMs = 0;

    this.setTexture(type.walk, 0);
    this.enableBody(true, x, y, true, true);
    // Hurtbox centered horizontally and ending at the drawn feet, `footGap` px above the frame bottom.
    const { width, height } = type.hurtbox;
    const body = /** @type {Phaser.Physics.Arcade.Body} */ (this.body);
    body.setSize(width, height, false).setOffset((type.size - width) / 2, type.size - type.footGap - height);
    // enableBody's reset places the body at the sprite's top-left, ignoring the offset, until the
    // next physics step. Sync now so overlap checks right after a spawn see the real hurtbox.
    body.updateFromGameObject();
    body.prev.copy(body.position);
    body.prevFrame.copy(body.position);
    this.setFlipX(false);
    this.usesPlaceholder = placeholders.has(type.walk);
    this.restoreLook();
    this.play(type.walk, true);
    return this;
  }

  /**
   * Take a bullet hit: lose HP and, if still alive, flash white and get knocked back along
   * the bullet's direction of travel.
   * @param {number} damage
   * @param {number} dirX bullet velocity x (any length)
   * @param {number} dirY bullet velocity y
   * @returns {boolean} true if this hit killed the enemy (the caller removes it from play)
   */
  takeHit(damage, dirX, dirY) {
    const r = applyDamage(this.hp, damage);
    this.hp = r.hp;
    if (r.dead) return true;

    this.flashMs = COMBAT.hitFlashMs;
    this.setTint(FLASH_COLOR).setTintMode(Phaser.TintModes.FILL);
    this.knockMs = COMBAT.knockbackMs;
    const v = knockbackVelocity(dirX, dirY, ENEMIES.types[this.typeId].knockback);
    this.setVelocity(v.x, v.y);
    return false;
  }

  /**
   * Count down the flash and knockback timers.
   * @param {number} delta frame time in ms
   */
  tick(delta) {
    if (this.flashMs > 0) {
      this.flashMs = Math.max(0, this.flashMs - delta);
      if (this.flashMs === 0) this.restoreLook();
    }
    if (this.knockMs > 0) this.knockMs = Math.max(0, this.knockMs - delta);
  }

  /** Normal look: the type's placeholder tint, or untinted real art. */
  restoreLook() {
    this.setTintMode(Phaser.TintModes.MULTIPLY);
    if (this.usesPlaceholder) this.setTint(ENEMIES.types[this.typeId].placeholderTint);
    else this.clearTint();
  }

  /** Remove from play and free the pool slot. */
  despawn() {
    this.anims.stop();
    this.flashMs = 0;
    this.knockMs = 0;
    this.disableBody(true, true);
  }
}
