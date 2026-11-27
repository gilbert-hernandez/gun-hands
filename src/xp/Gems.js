import Phaser from 'phaser';
import { XP } from '../config/index.js';
import { ensureAnim } from '../fx/anims.js';
import { homeStep, tierForValue } from './rules.js';

/** @typedef {keyof typeof XP.tiers} GemTierId */

// Above the map layers (negative depths), below enemies (0), so enemies walk over gems.
const DEPTH = -1;

/**
 * One pooled XP gem: a plain sprite (no physics body), so hundreds on the floor cost little.
 * Created by the group on demand and recycled by `Gems`.
 */
export class Gem extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, key = XP.tiers.small.sheet, frame) {
    super(scene, x, y, key, frame);
    this.value = 0;
    /** @type {GemTierId} */
    this.tier = 'small';
    /** Whether the gem is flying to the player. */
    this.homing = false;
    /** Current homing speed in px/s. */
    this.speed = 0;
  }
}

/**
 * XP gems on the floor (GH-7): a fixed pool, drops with a merge fallback when the pool is full,
 * the pickup-radius magnet, and collection.
 */
export default class Gems {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} [poolSize]
   */
  constructor(scene, poolSize = XP.poolSize) {
    this.scene = scene;
    /** @type {Set<string>} */
    this.placeholders = new Set(scene.registry.get('placeholders') ?? []);
    for (const tier of Object.values(XP.tiers)) ensureAnim(scene, tier.sheet, XP.frameMs);
    this.group = scene.add.group({ classType: Gem, defaultKey: XP.tiers.small.sheet, maxSize: poolSize });
  }

  /** Gems currently on the floor (or flying). */
  get liveCount() {
    return this.group.countActive(true);
  }

  /**
   * Drop a gem of `tier` at (x, y). When the pool is full, its value goes to the nearest gem.
   * @param {number} x
   * @param {number} y
   * @param {GemTierId} tier
   * @returns {Gem | null} the new or merged-into gem (null only if no gem exists at all)
   */
  drop(x, y, tier) {
    const { value } = XP.tiers[tier];
    /** @type {Gem | null} */
    const gem = this.group.get(x, y);
    if (gem) {
      gem.setActive(true).setVisible(true).setPosition(x, y).setDepth(DEPTH);
      gem.value = value;
      gem.homing = false;
      gem.speed = 0;
      this.setTier(gem, tier);
      return gem;
    }
    const nearest = this.nearest(x, y);
    if (!nearest) return null;
    nearest.value += value;
    this.setTier(nearest, tierForValue(nearest.value, XP.tiers));
    return nearest;
  }

  /**
   * The active gem nearest to (x, y).
   * @param {number} x
   * @param {number} y
   * @returns {Gem | null}
   */
  nearest(x, y) {
    let best = null;
    let bestD2 = Infinity;
    for (const child of this.group.getChildren()) {
      const g = /** @type {Gem} */ (child);
      if (!g.active) continue;
      const d2 = (g.x - x) ** 2 + (g.y - y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = g;
      }
    }
    return best;
  }

  /**
   * Show `gem` as `tier`: its shimmer animation, tinted while the sheet is a placeholder.
   * @param {Gem} gem
   * @param {GemTierId} tier
   */
  setTier(gem, tier) {
    const { sheet, placeholderTint } = XP.tiers[tier];
    gem.tier = tier;
    if (this.placeholders.has(sheet)) gem.setTint(placeholderTint);
    else gem.clearTint();
    gem.play(sheet, true);
  }

  /** Make every gem on the floor fly to the player (for the Magnet powerup, GH-9). */
  magnetizeAll() {
    for (const child of this.group.getChildren()) {
      const g = /** @type {Gem} */ (child);
      if (g.active && !g.homing) this.startHoming(g);
    }
  }

  /** @param {Gem} gem */
  startHoming(gem) {
    gem.homing = true;
    gem.speed = XP.magnet.startSpeed;
  }

  /**
   * Start gems inside the pickup radius homing, move homing gems, and collect those that reach
   * the player. Call once per frame while the player is alive.
   * @param {number} delta frame time in ms
   * @param {{ x: number, y: number, pickupRadius: number }} player
   * @returns {number} XP collected this frame
   */
  update(delta, player) {
    const r2 = player.pickupRadius * player.pickupRadius;
    let collected = 0;
    for (const child of this.group.getChildren()) {
      const g = /** @type {Gem} */ (child);
      if (!g.active) continue;
      if (!g.homing) {
        // Strict, so a radius of 0 turns the magnet off.
        if ((g.x - player.x) ** 2 + (g.y - player.y) ** 2 < r2) this.startHoming(g);
        else continue;
      }
      const s = homeStep(g, player, delta, XP.magnet, XP.collectDistance);
      g.speed = s.speed;
      if (s.collected) {
        collected += g.value;
        this.despawn(g);
      } else {
        g.setPosition(s.x, s.y);
      }
    }
    return collected;
  }

  /** @param {Gem} gem */
  despawn(gem) {
    gem.anims.stop();
    gem.homing = false;
    gem.value = 0;
    gem.setActive(false).setVisible(false);
  }
}
