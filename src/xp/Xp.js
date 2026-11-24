import { XP } from '../config/index.js';
import { ENEMY_KILLED } from '../combat/events.js';
import Gems from './Gems.js';
import Progression from './Progression.js';
import { PLAYER_LEVELED, XP_CHANGED } from './events.js';

/** @typedef {import('../combat/events.js').EnemyKilledEvent} EnemyKilledEvent */
/** @typedef {import('../enemy/Enemy.js').EnemyTypeId} EnemyTypeId */

/**
 * XP wiring for one Game session (GH-7): gems drop on `enemy-killed`, collected XP feeds the
 * progression, the XP events are emitted, and level-ups are queued for the LevelUp scene.
 */
export default class Xp {
  /**
   * @param {import('phaser').Scene} scene the Game scene (events are emitted on `scene.events`)
   * @param {import('../player/Player.js').default} player
   */
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.gems = new Gems(scene);
    this.progression = new Progression(XP.curve);
    /** Set while LevelUp is open (or about to open) for this session's queued level-ups. */
    this.levelUpOpen = false;

    /** @param {EnemyKilledEvent} e */
    const onKilled = ({ typeId, x, y }) => this.gems.drop(x, y, XP.drops[/** @type {EnemyTypeId} */ (typeId)]);
    scene.events.on(ENEMY_KILLED, onKilled);
    scene.events.once('shutdown', () => scene.events.off(ENEMY_KILLED, onKilled));
  }

  /**
   * Run the magnet and collect gems. Call once per frame; does nothing once the player is dead.
   * @param {number} delta frame time in ms
   */
  update(delta) {
    if (this.player.dead) return;
    const amount = this.gems.update(delta, this.player);
    if (amount > 0) this.collect(amount);
  }

  /**
   * Add collected XP: level up, emit `player-leveled` per level then `xp-changed`, and open
   * LevelUp if a level was gained.
   * @param {number} amount
   */
  collect(amount) {
    const p = this.progression;
    const before = p.level;
    const gained = p.add(amount);
    this.player.level = p.level;
    for (let i = 1; i <= gained; i++) this.scene.events.emit(PLAYER_LEVELED, { level: before + i });
    this.scene.events.emit(XP_CHANGED, {
      totalXp: p.totalXp,
      level: p.level,
      xpInto: p.xpInto,
      xpNeeded: p.xpNeeded,
    });
    if (gained > 0) this.openLevelUp();
  }

  /** Grant exactly the XP the current level still needs (dev shortcut). */
  grantLevel() {
    const p = this.progression;
    this.collect(p.xpNeeded - p.xpInto);
  }

  /**
   * Pause Game and open LevelUp, unless the player is dead, nothing is pending, or LevelUp is
   * already open. Phaser queues `pause` and `launch` until the next step, so a flag (not the scene
   * state) tracks "open" for two level-ups in the same frame.
   */
  openLevelUp() {
    if (this.player.dead || this.progression.pending === 0 || this.levelUpOpen) return;
    this.levelUpOpen = true;
    const mgr = this.scene.scene;
    mgr.pause();
    mgr.launch('LevelUp');
  }

  /**
   * The LevelUp scene is done with one level-up.
   * @returns {boolean} true if another level-up is pending (LevelUp should show again)
   */
  finishLevelUp() {
    this.progression.consume();
    const more = this.progression.pending > 0 && !this.player.dead;
    if (!more) this.levelUpOpen = false;
    return more;
  }
}
