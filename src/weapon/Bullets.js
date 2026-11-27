import Phaser from 'phaser';
import { WEAPON } from '../config/index.js';
import { applyHit } from './aim.js';
import { ensureAnim } from '../fx/anims.js';

const KEY = 'fx_bullet';
const ANIM = 'fx_bullet_fly';
// Between the body (0) and the guns (1), so bullets look like they leave from under the guns.
const DEPTH = 0.5;
/** Bullet physics body radius in px. */
export const BODY_RADIUS = 3;

/**
 * One pooled bullet. Created by the group on demand (never by game code) and recycled:
 * `despawn()` hides and deactivates it, and `Bullets.fire()` brings it back.
 */
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key = KEY, frame) {
    super(scene, x, y, key, frame);
    this.damage = 0;
    this.pierceLeft = 0;
    this.expiresAt = 0;
    /**
     * Enemies this bullet has already damaged in this flight, by object -> its spawnId then.
     * A pooled enemy that respawns gets a new spawnId, so it counts as a different enemy.
     * @type {Map<object, number>}
     */
    this.hitEnemies = new Map();
  }

  /**
   * Launch from (x, y) along `angle` with the given stats.
   * @param {number} x
   * @param {number} y
   * @param {number} angle radians
   * @param {{speed: number, damage: number, lifetime: number, pierce: number}} stats
   * @param {number} now scene time in ms
   */
  fire(x, y, angle, stats, now) {
    this.enableBody(true, x, y, true, true);
    this.body.setCircle(BODY_RADIUS, this.width / 2 - BODY_RADIUS, this.height / 2 - BODY_RADIUS);
    this.setDepth(DEPTH).setRotation(angle);
    this.scene.physics.velocityFromRotation(angle, stats.speed, this.body.velocity);
    this.damage = stats.damage;
    this.pierceLeft = stats.pierce;
    this.expiresAt = now + stats.lifetime;
    this.hitEnemies.clear();
    this.play(ANIM, true);
    return this;
  }

  /** Called by the group each frame while active: despawn on lifetime or leaving the arena. */
  update(time) {
    if (time >= this.expiresAt || !this.scene.physics.world.bounds.contains(this.x, this.y)) {
      this.despawn();
    }
  }

  /**
   * Whether this bullet already damaged `enemy` (in its current spawn) during this flight.
   * @param {{ spawnId: number }} enemy
   */
  hasHit(enemy) {
    return this.hitEnemies.get(enemy) === enemy.spawnId;
  }

  /**
   * Remember that this bullet damaged `enemy`, so overlaps on later frames are ignored.
   * @param {{ spawnId: number }} enemy
   */
  markHit(enemy) {
    this.hitEnemies.set(enemy, enemy.spawnId);
  }

  /**
   * The bullet hit an enemy. Uses one pierce, or despawns when none is left.
   * @returns {boolean} true if the bullet is still in flight
   */
  hit() {
    const r = applyHit(this.pierceLeft);
    this.pierceLeft = r.pierceLeft;
    if (!r.alive) this.despawn();
    return r.alive;
  }

  /** Remove from play and free the pool slot. */
  despawn() {
    this.anims.stop();
    this.disableBody(true, true);
  }
}

/** The bullet pool: an Arcade group capped at `WEAPON.poolSize` objects. */
export default class Bullets {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} [poolSize]
   */
  constructor(scene, poolSize = WEAPON.poolSize) {
    this.scene = scene;
    ensureAnim(scene, ANIM, WEAPON.frameMs.bullet, { sheet: KEY });
    this.group = scene.physics.add.group({
      classType: Bullet,
      defaultKey: KEY,
      maxSize: poolSize,
      runChildUpdate: true,
      allowGravity: false,
    });
  }

  /**
   * Fire one bullet from the pool.
   * @param {number} x
   * @param {number} y
   * @param {number} angle radians
   * @param {{speed: number, damage: number, lifetime: number, pierce: number}} stats
   * @param {number} now scene time in ms
   * @returns {Bullet | null} null when every pooled bullet is already in flight
   */
  fire(x, y, angle, stats, now) {
    /** @type {Bullet | null} */
    const bullet = this.group.get(x, y);
    if (!bullet) return null;
    return bullet.fire(x, y, angle, stats, now);
  }
}
