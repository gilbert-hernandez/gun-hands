/** @typedef {import('phaser').Scene} Scene */
/** @typedef {import('phaser').GameObjects.BitmapText} BitmapText */

/** Above enemies, bullets, sparks and the player's guns; below the bomb blast (1.6). */
const DEPTH = 1.55;

/**
 * Floating damage numbers (GH-13): a fixed pool of bitmap texts that rise and fade out. When every
 * number is showing, a new hit shows nothing. Purely visual.
 */
export default class DamageNumbers {
  /**
   * @param {Scene} scene
   * @param {{ poolSize: number, risePx: number, durationMs: number, color: number, killColor: number, font: { key: string } }} cfg
   *   JUICE.damageNumbers (read on every `show`, so tests can change it)
   */
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    /** @type {BitmapText[]} */
    this.pool = [];
    for (let i = 0; i < cfg.poolSize; i++) {
      const t = scene.add.bitmapText(0, 0, cfg.font.key, '0').setOrigin(0.5, 1).setDepth(DEPTH);
      t.setActive(false).setVisible(false);
      this.pool.push(t);
    }
  }

  /**
   * Show `damage` (rounded) rising from (x, y).
   * @param {number} x
   * @param {number} y
   * @param {number} damage
   * @param {boolean} killed the hit killed: shown in the kill color
   * @returns {BitmapText | null} null when the pool is exhausted
   */
  show(x, y, damage, killed) {
    const t = this.pool.find((n) => !n.active);
    if (!t) return null;
    const { risePx, durationMs, color, killColor } = this.cfg;
    t.setText(String(Math.max(0, Math.round(damage))))
      .setPosition(x, y)
      .setAlpha(1)
      .setTint(killed ? killColor : color)
      .setActive(true)
      .setVisible(true);
    this.scene.tweens.add({
      targets: t,
      y: y - risePx,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => t.setActive(false).setVisible(false),
    });
    return t;
  }

  /** Numbers currently showing. */
  get showing() {
    let n = 0;
    for (const t of this.pool) if (t.active) n += 1;
    return n;
  }
}
