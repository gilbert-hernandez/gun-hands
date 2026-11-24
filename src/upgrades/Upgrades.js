import { UPGRADES } from '../config/index.js';
import { applyUpgrade, cardText, drawChoices } from './rules.js';
import { UPGRADE_CHOSEN } from './events.js';

/** @typedef {import('./rules.js').ChoiceId} ChoiceId */

/** Cards offered per level-up. */
export const CARD_COUNT = 3;

/**
 * Upgrade state for one Game session (GH-8): ranks start at 0, the LevelUp screen draws cards
 * here, and choosing one applies it to the player's per-run stats and emits `upgrade-chosen`.
 * Lives on the Game scene (`scene.upgrades`), so it resets with every session.
 */
export default class Upgrades {
  /**
   * @param {import('phaser').Scene} scene the Game scene (events are emitted on `scene.events`)
   * @param {import('../player/Player.js').default} player
   */
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    /** @type {Record<string, number>} upgrade id -> rank */
    this.ranks = Object.fromEntries(UPGRADES.list.map((u) => [u.id, 0]));
    /** Random source for draws; tests may replace it with a seeded one. */
    this.rng = Math.random;
  }

  /** @returns {ChoiceId[]} up to 3 different upgrades below max rank, or just the filler */
  draw() {
    return drawChoices(this.ranks, UPGRADES.list, CARD_COUNT, this.rng);
  }

  /**
   * Card text for `id` at the current ranks.
   * @param {ChoiceId} id
   */
  card(id) {
    return cardText(id, this.ranks, UPGRADES);
  }

  /**
   * Apply one rank of `id` (or the filler) to the player, then emit `upgrade-chosen`.
   * @param {ChoiceId} id
   */
  choose(id) {
    applyUpgrade(id, this.player, UPGRADES);
    if (id !== 'patchup') this.ranks[id] += 1;
    const rank = id === 'patchup' ? 0 : this.ranks[id];
    this.scene.events.emit(UPGRADE_CHOSEN, { id, rank });
  }
}
