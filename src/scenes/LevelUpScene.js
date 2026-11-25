import Phaser from 'phaser';
import { DISPLAY, TOUCH, UPGRADES } from '../config/index.js';
import { useTouchWording } from '../input/mode.js';
import { pickLayout } from '../ui/layout.js';
import { addSceneLabel } from './sceneLabel.js';

/** @typedef {import('../upgrades/rules.js').ChoiceId} ChoiceId */

// While `ui_card` is a placeholder it is a flat light gray; darken it so white text reads.
const CARD_PLACEHOLDER_TINT = 0x334155;
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
    const touch = useTouchWording(this);
    const layout = pickLayout(UPGRADES.layout, touch);
    this.layout = layout;
    /** @type {any} */
    const game = this.scene.get('Game');
    /** @type {import('../upgrades/Upgrades.js').default} */
    this.upgrades = game.upgrades;
    /** @type {import('../xp/Xp.js').default} */
    this.xp = game.xp;
    /** Input is accepted once the input delay has passed (e2e tests wait on this). */
    this.ready = false;
    /** Touches may start on a card once the longer touch delay has passed (GH-25). */
    this.touchReady = false;
    /** @type {{ id: number, downTime: number, index: number } | null} the touch held on a card */
    this.armed = null;
    /** Set on the first accepted pick; every later input is ignored. */
    this.chosen = false;
    /** @type {ChoiceId[]} the cards shown, left to right */
    this.choices = this.upgrades.draw();
    const placeholders = new Set(this.registry.get('placeholders') ?? []);

    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    addSceneLabel(this)?.setY(52);
    this.add.text(width / 2, layout.titleY, 'LEVEL UP', font(40, '#facc15')).setOrigin(0.5);
    const how = touch ? 'tap a card' : 'click a card or press its number';
    this.promptText = this.add
      .text(width / 2, layout.promptY, `Pick an upgrade: ${how}`, font(layout.promptSize))
      .setOrigin(0.5);

    const n = this.choices.length;
    const cardW = layout.cardWidth * layout.cardScale;
    const left = (width - (n * cardW + (n - 1) * layout.cardGap)) / 2 + cardW / 2;
    /** @type {Phaser.GameObjects.Container[]} */
    this.cards = this.choices.map((id, i) =>
      this.makeCard(id, i, left + i * (cardW + layout.cardGap), layout.cardY, placeholders),
    );

    KEYS.forEach((key, i) => {
      this.input.keyboard.on(`keydown-${key}`, () => this.pick(i));
      this.input.keyboard.on(`keydown-NUMPAD_${key}`, () => this.pick(i));
    });
    this.time.delayedCall(UPGRADES.inputDelayMs, () => {
      this.ready = true;
    });
    this.time.delayedCall(TOUCH.levelUpDelayMs, () => {
      this.touchReady = true;
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

    const l = this.layout;
    const w = l.cardWidth * l.cardScale;
    const h = l.cardHeight * l.cardScale;
    const frame = this.add.image(0, 0, 'ui_card').setScale(l.cardScale);
    if (placeholders.has('ui_card')) frame.setTint(CARD_PLACEHOLDER_TINT);
    const outline = this.add
      .rectangle(0, 0, w + 6, h + 6)
      .setStrokeStyle(3, 0xfacc15)
      .setVisible(false);
    const icon = this.add.image(0, l.icon.y, def.icon).setScale(l.icon.scale);
    if (placeholders.has(def.icon)) icon.setTint(def.placeholderTint);

    const card = this.add.container(x, y, [
      outline,
      frame,
      this.add.text(-w / 2 + l.number.x, -h / 2 + l.number.y, String(index + 1), font(l.number.size, '#facc15')),
      icon,
      this.add.text(0, l.name.y, name, font(l.name.size)).setOrigin(0.5, 0),
      this.add
        .text(0, l.text.y, text, { ...font(l.text.size, '#d1d5db'), align: 'center', wordWrap: { width: w - 20 } })
        .setOrigin(0.5, 0),
      this.add.text(0, h / 2 - l.rank.bottom, rank, font(l.rank.size, '#facc15')).setOrigin(0.5, 1),
    ]);
    card.setData('id', id);

    frame.setInteractive({ useHandCursor: true });
    frame.on('pointerover', () => {
      outline.setVisible(true);
      card.setScale(l.hoverScale);
    });
    frame.on('pointerout', () => {
      outline.setVisible(false);
      card.setScale(1);
    });
    // A mouse picks on press. A touch must start and end on the same card, so a thumb coming off a
    // stick can't pick by accident.
    frame.on('pointerdown', (pointer) => {
      if (!pointer.wasTouch) this.pick(index);
      else if (this.touchReady) this.armed = { id: pointer.id, downTime: pointer.downTime, index };
    });
    frame.on('pointerup', (pointer) => {
      const a = this.armed;
      if (!pointer.wasTouch || !a || a.id !== pointer.id) return;
      this.armed = null;
      if (a.index === index && a.downTime === pointer.downTime && !pointer.wasCanceled) this.pick(index);
    });
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
