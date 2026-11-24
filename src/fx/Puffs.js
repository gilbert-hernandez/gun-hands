import Phaser from 'phaser';
import { COMBAT } from '../config/index.js';

const KEY = 'fx_enemy_puff';
const ANIM = 'fx_enemy_puff_play';
const ANIM_FPS = 18;
/** Frame size of the puff sheet; puffs are scaled from this to the enemy's sprite size. */
const BASE_SIZE = 32;
// Above enemies and bullets, below the player's guns.
const DEPTH = 0.75;

/**
 * Pool of enemy death puffs (GH-6): plain sprites that play `fx_enemy_puff` once and hide
 * themselves. When every puff is playing, `play()` skips the effect.
 */
export default class Puffs {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} [poolSize]
   */
  constructor(scene, poolSize = COMBAT.puffPoolSize) {
    if (!scene.anims.exists(ANIM)) {
      scene.anims.create({ key: ANIM, frames: scene.anims.generateFrameNumbers(KEY), frameRate: ANIM_FPS, repeat: 0 });
    }
    this.group = scene.add.group({ defaultKey: KEY, maxSize: poolSize });
  }

  /**
   * Play a puff centered at (x, y), scaled for a sprite of `size` px.
   * @param {number} x
   * @param {number} y
   * @param {number} [size]
   * @returns {Phaser.GameObjects.Sprite | null} null when the pool is exhausted
   */
  play(x, y, size = BASE_SIZE) {
    /** @type {Phaser.GameObjects.Sprite | null} */
    const puff = this.group.get(x, y);
    if (!puff) return null;
    puff
      .setActive(true)
      .setVisible(true)
      .setPosition(x, y)
      .setScale(size / BASE_SIZE)
      .setDepth(DEPTH);
    puff.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => puff.setActive(false).setVisible(false));
    puff.play(ANIM);
    return puff;
  }

  /** Puffs currently playing. */
  get playing() {
    return this.group.countActive(true);
  }
}
