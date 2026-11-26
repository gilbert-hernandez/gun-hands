import { AUDIO } from '../config/index.js';
import { BULLET_WALL, ENEMY_HIT, ENEMY_KILLED, PLAYER_DIED, PLAYER_HIT, SHIELD_BLOCKED } from '../combat/events.js';
import { PLAYER_FIRED } from '../player/events.js';
import { POWERUP_COLLECTED, POWERUP_EXPIRED } from '../powerups/events.js';
import { UPGRADE_CHOSEN } from '../upgrades/events.js';
import { PLAYER_LEVELED, XP_COLLECTED } from '../xp/events.js';
import { xpChainSemitones } from './rules.js';

/** Powerups with their own pickup sound; the rest play `powerup-pickup`. */
const POWERUP_SOUNDS = { health: 'heal', shield: 'shield-up', bomb: 'bomb' };

/**
 * Plays the sounds for one Game session (GH-29) by listening to the Game scene's events, so
 * gameplay code doesn't call audio. Listeners come off on `shutdown`: the Game scene and its
 * emitter persist across restarts, and a second set would double every sound.
 * No Phaser imports, so it can be unit-tested with a plain emitter.
 */
export default class GameAudio {
  /**
   * @param {{ events: { on: Function, off: Function, once: Function } }} scene the Game scene
   * @param {Pick<import('./Sfx.js').default, 'play' | 'now'>} sfx
   * @param {typeof AUDIO} [config]
   */
  constructor(scene, sfx, config = AUDIO) {
    this.sfx = sfx;
    this.config = config;
    /** The previous XP pickup, for the rising-pitch chain. */
    this.xpChain = { lastMs: /** @type {number | null} */ (null), semitones: 0 };

    /** @type {[string, (e: any) => void][]} */
    const handlers = [
      [PLAYER_FIRED, (e) => sfx.play(e.blocked ? 'bullet-wall' : 'shoot')],
      [BULLET_WALL, () => sfx.play('bullet-wall')],
      // A killing hit plays only the death sound (enemy-killed follows straight away).
      [ENEMY_HIT, (e) => e.hpLeft > 0 && sfx.play('enemy-hit')],
      [ENEMY_KILLED, (e) => sfx.play(e.typeId === 'brute' ? 'brute-die' : 'enemy-die')],
      // A fatal hit plays only player-die.
      [PLAYER_HIT, (e) => e.hp > 0 && sfx.play('player-hurt')],
      [PLAYER_DIED, () => sfx.play('player-die')],
      [SHIELD_BLOCKED, () => sfx.play('shield-block')],
      [XP_COLLECTED, () => this.xpPickup()],
      [PLAYER_LEVELED, () => sfx.play('level-up')],
      [UPGRADE_CHOSEN, () => sfx.play('card-pick')],
      [POWERUP_COLLECTED, (e) => sfx.play(POWERUP_SOUNDS[e.id] ?? 'powerup-pickup')],
      [POWERUP_EXPIRED, () => sfx.play('powerup-expire')],
    ];
    for (const [event, fn] of handlers) scene.events.on(event, fn);
    scene.events.once('shutdown', () => {
      for (const [event, fn] of handlers) scene.events.off(event, fn);
    });
  }

  /** The chain only advances on pickups that actually play, so throttled frames don't skip steps. */
  xpPickup() {
    const r = xpChainSemitones(this.xpChain, this.sfx.now(), this.config.xpChain);
    if (this.sfx.play('xp-pickup', { semitones: r.semitones }) === 'played') this.xpChain = r.chain;
  }
}
