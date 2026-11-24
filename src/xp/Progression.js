import { addXp, xpToNext } from './rules.js';

/**
 * One session's XP and level (GH-7), plus the queue of level-ups waiting for the LevelUp
 * screen. No Phaser: `Xp` wires it into the scene.
 */
export default class Progression {
  /** @param {import('./rules.js').XpCurve} curve */
  constructor(curve) {
    this.curve = curve;
    /** XP collected this session. */
    this.totalXp = 0;
    this.level = 1;
    /** XP collected toward the next level. */
    this.xpInto = 0;
    /** Level-ups gained but not yet handled by the LevelUp screen. */
    this.pending = 0;
  }

  /** XP the current level needs in total to reach the next one. */
  get xpNeeded() {
    return xpToNext(this.level, this.curve);
  }

  /**
   * Add XP, levelling up as many times as it covers. Each level gained is queued.
   * @param {number} amount
   * @returns {number} levels gained
   */
  add(amount) {
    const r = addXp(this, amount, this.curve);
    this.totalXp += amount;
    this.level = r.level;
    this.xpInto = r.xpInto;
    this.pending += r.gained;
    return r.gained;
  }

  /** One queued level-up was handled. */
  consume() {
    this.pending = Math.max(0, this.pending - 1);
  }
}
