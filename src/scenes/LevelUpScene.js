import Phaser from 'phaser';
import { DISPLAY, UPGRADES } from '../config/index.js';
import { addSceneLabel } from './sceneLabel.js';

/** @typedef {import('../upgrades/rules.js').ChoiceId} ChoiceId */

const CARD_W = 160;
const CARD_H = 220;
const CARD_GAP = 24;
const CARD_Y = 300;
// While `ui_card` is a placeholder it is a flat light gray; darken it so white text reads.
const CARD_PLACEHOLDER_TINT = 0x334155;
const HOVER_SCALE = 1.05;
const KEYS = ['ONE', 'TWO', 'THREE'];

const font = (size, color = '#ffffff') => ({ fontFamily: 'monospace', fontSize: `${size}px`, color });

// The pick-1-of-3 upgrade screen (GH-8). Opened by the XP system (GH-7) with Game paused. It draws
// up to 3 cards from `game.upgrades`; clicking a card or pressing its number applies it, then
// hands back to the level-up queue: restart with a new draw while more are pending, else resume
// Game. There is no way out without a choice.
export default class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUp');
  }

  create() {
    const { width, height } = DISPLAY;
    /** @type {any} */
    const game = this.scene.get('Game');
    /** @type {import('../upgrades/Upgrades.js').default} */
    this.upgrades = game.upgrades;
    /** @type {import('../xp/Xp.js').default} */
    this.xp = game.xp;
    /** Input is accepted once the input delay has passed (e2e tests wait on this). */
    this.ready = false;
    /** Set on the first accepted pick; every later input is ignored. */
    this.chosen = false;
    /** @type {ChoiceId[]} the cards shown, left to right */
    this.choices = this.upgrades.draw();
    const placeholders = new Set(this.registry.get('placeholders') ?? []);

    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    addSceneLabel(this)?.setY(52);
    this.add.text(width / 2, 110, 'LEVEL UP', font(40, '#facc15')).setOrigin(0.5);
    this.add.text(width / 2, 150, 'Pick an upgrade: click a card or press its number', font(14)).setOrigin(0.5);

    const n = this.choices.length;
    const left = (width - (n * CARD_W + (n - 1) * CARD_GAP)) / 2 + CARD_W / 2;
    /** @type {Phaser.GameObjects.Container[]} */
    this.cards = this.choices.map((id, i) =>
      this.makeCard(id, i, left + i * (CARD_W + CARD_GAP), CARD_Y, placeholders),
    );

    KEYS.forEach((key, i) => {
      this.input.keyboard.on(`keydown-${key}`, () => this.pick(i));
      this.input.keyboard.on(`keydown-NUMPAD_${key}`, () => this.pick(i));
    });
    this.time.delayedCall(UPGRADES.inputDelayMs, () => {
      this.ready = true;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard.removeAllListeners());
  }

  /**
   * One card: frame, number key, icon, name, next-rank text, and rank/max. The frame is the
   * click target and highlights on hover.
   * @param {ChoiceId} id
   * @param {number} index
   * @param {number} x
   * @param {number} y
   * @param {Set<string>} placeholders texture keys that are generated placeholders
   */
  makeCard(id, index, x, y, placeholders) {
    const def = id === 'patchup' ? UPGRADES.filler : UPGRADES.list.find((u) => u.id === id);
    const { name, text, rank } = this.upgrades.card(id);

    const frame = this.add.image(0, 0, 'ui_card');
    if (placeholders.has('ui_card')) frame.setTint(CARD_PLACEHOLDER_TINT);
    const outline = this.add
      .rectangle(0, 0, CARD_W + 6, CARD_H + 6)
      .setStrokeStyle(3, 0xfacc15)
      .setVisible(false);
    const icon = this.add.image(0, -48, def.icon).setScale(2);
    if (placeholders.has(def.icon)) icon.setTint(def.placeholderTint);

    const card = this.add.container(x, y, [
      outline,
      frame,
      this.add.text(-CARD_W / 2 + 10, -CARD_H / 2 + 8, String(index + 1), font(20, '#facc15')),
      icon,
      this.add.text(0, 8, name, font(16)).setOrigin(0.5, 0),
      this.add
        .text(0, 36, text, { ...font(12, '#d1d5db'), align: 'center', wordWrap: { width: CARD_W - 20 } })
        .setOrigin(0.5, 0),
      this.add.text(0, CARD_H / 2 - 14, rank, font(14, '#facc15')).setOrigin(0.5, 1),
    ]);
    card.setData('id', id);

    frame.setInteractive({ useHandCursor: true });
    frame.on('pointerover', () => {
      outline.setVisible(true);
      card.setScale(HOVER_SCALE);
    });
    frame.on('pointerout', () => {
      outline.setVisible(false);
      card.setScale(1);
    });
    frame.on('pointerdown', () => this.pick(index));
    return card;
  }

  /**
   * Choose card `index`: apply its upgrade, then hand back to the level-up queue. Ignored before
   * the input delay, after a pick, and for an index with no card.
   * @param {number} index
   */
  pick(index) {
    const id = this.choices[index];
    if (!this.ready || this.chosen || id === undefined) return;
    this.chosen = true;
    this.upgrades.choose(id);
    if (this.xp.finishLevelUp()) {
      this.scene.restart();
      return;
    }
    this.scene.resume('Game');
    this.scene.stop();
  }
}
