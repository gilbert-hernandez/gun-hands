import Phaser from 'phaser';
import { POWERUPS } from '../config/index.js';
import { ensureAnim } from '../fx/anims.js';
import { pickupVisible } from './rules.js';

/** @typedef {import('../config/powerups.js').PowerupId} PowerupId */

// Above XP gems (-1), below enemies (0).
const DEPTH = -0.5;

/** One pooled powerup pickup: a plain sprite (no physics body), collected by distance. */
export class Pickup extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, key = POWERUPS.types.health.sheet, frame) {
    super(scene, x, y, key, frame);
    /** @type {PowerupId} */
    this.id = 'health';
    /** ms left on the floor before it despawns. */
    this.msLeft = 0;
  }
}

/**
 * Powerup pickups on the floor (GH-9): a fixed pool (a drop is skipped when it's full),
 * a lifetime with a blink before despawning, and collection by distance.
 */
export default class Pickups {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} [poolSize]
   */
  constructor(scene, poolSize = POWERUPS.poolSize) {
    this.scene = scene;
    /** @type {Set<string>} */
    this.placeholders = new Set(scene.registry.get('placeholders') ?? []);
    for (const t of Object.values(POWERUPS.types)) ensureAnim(scene, t.sheet, POWERUPS.frameMs.pickup);
    this.group = scene.add.group({ classType: Pickup, defaultKey: POWERUPS.types.health.sheet, maxSize: poolSize });
  }

  /** Pickups currently on the floor. */
  get liveCount() {
    return this.group.countActive(true);
  }

  /**
   * Drop a pickup of powerup `id` at (x, y).
   * @param {number} x
   * @param {number} y
   * @param {PowerupId} id
   * @returns {Pickup | null} null when the pool is full (the drop is skipped)
   */
  drop(x, y, id) {
    /** @type {Pickup | null} */
    const p = this.group.get(x, y);
    if (!p) return null;
    const { sheet, placeholderTint } = POWERUPS.types[id];
    p.setActive(true).setVisible(true).setPosition(x, y).setDepth(DEPTH);
    p.id = id;
    p.msLeft = POWERUPS.lifetimeMs;
    if (this.placeholders.has(sheet)) p.setTint(placeholderTint);
    else p.clearTint();
    p.play(sheet);
    return p;
  }

  /**
   * Age pickups (blinking near the end, despawning at 0) and collect those within the collect
   * radius of the player. Call once per frame while the player is alive.
   * @param {number} delta frame time in ms
   * @param {{ x: number, y: number }} player
   * @returns {PowerupId[]} ids collected this frame
   */
  update(delta, player) {
    const r2 = POWERUPS.collectRadius * POWERUPS.collectRadius;
    /** @type {PowerupId[]} */
    const collected = [];
    for (const child of this.group.getChildren()) {
      const p = /** @type {Pickup} */ (child);
      if (!p.active) continue;
      if ((p.x - player.x) ** 2 + (p.y - player.y) ** 2 <= r2) {
        collected.push(p.id);
        this.despawn(p);
        continue;
      }
      p.msLeft = Math.max(0, p.msLeft - delta);
      if (p.msLeft === 0) this.despawn(p);
      else p.setVisible(pickupVisible(p.msLeft, POWERUPS.warnMs, POWERUPS.blinkMs));
    }
    return collected;
  }

  /** @param {Pickup} pickup */
  despawn(pickup) {
    pickup.anims.stop();
    pickup.msLeft = 0;
    pickup.setActive(false).setVisible(false);
  }
}
