import Phaser from 'phaser';

/**
 * A fixed pool of plain sprites that each play one animation once and then hide (GH-12): enemy
 * deaths, impact sparks. Purely visual: no physics bodies. When every sprite is playing, `play()`
 * skips the effect and returns null.
 */
export default class FxPool {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ size: number, depth: number }} opts pool size and draw depth
   */
  constructor(scene, { size, depth }) {
    this.depth = depth;
    this.group = scene.add.group({ maxSize: size });
  }

  /**
   * Play `anim` once at (x, y) on a free sprite.
   * @param {string} anim animation key (created with `ensureAnim`)
   * @param {number} x
   * @param {number} y
   * @param {{ flipX?: boolean, rotation?: number, tint?: number | null }} [opts]
   * @returns {Phaser.GameObjects.Sprite | null} null when the pool is exhausted
   */
  play(anim, x, y, { flipX = false, rotation = 0, tint = null } = {}) {
    const sheet = this.group.scene.anims.get(anim).frames[0].textureKey;
    /** @type {Phaser.GameObjects.Sprite | null} */
    const fx = this.group.get(x, y, sheet);
    if (!fx) return null;
    fx.setActive(true).setVisible(true).setPosition(x, y).setFlipX(flipX).setRotation(rotation).setDepth(this.depth);
    if (tint === null) fx.clearTint();
    else fx.setTint(tint);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.setActive(false).setVisible(false));
    fx.play(anim);
    return fx;
  }

  /** Effects currently playing. */
  get playing() {
    return this.group.countActive(true);
  }
}
