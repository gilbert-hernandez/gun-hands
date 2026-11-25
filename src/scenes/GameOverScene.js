import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import { formatTime } from '../util/format.js';
import { useTouchWording } from '../input/mode.js';
import Button from '../ui/Button.js';
import { pickLayout } from '../ui/layout.js';
import { addSceneLabel } from './sceneLabel.js';

/** @typedef {import('../combat/events.js').RunStats} RunStats */

// The GameOver screen (GH-11): the run stats Combat starts it with (GH-6) on the GameOver panel,
// with Restart (button or Enter: a new session straight away) and Title (button or Esc). All input
// waits for an input delay, so keys or clicks held at the moment of death can't skip the screen.
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  /** @param {Partial<RunStats>} [data] run stats from the Game scene; empty when opened otherwise */
  init(data) {
    /** @type {RunStats | null} */
    this.stats = data && typeof data.timeMs === 'number' ? /** @type {RunStats} */ (data) : null;
  }

  create() {
    const { width } = DISPLAY;
    const { keys } = FLOW;
    const touch = useTouchWording(this);
    const gameOver = pickLayout(FLOW.gameOver, touch);
    const buttonScale = pickLayout(FLOW.button, touch).scale;
    const placeholders = new Set(this.registry.get('placeholders') ?? []);
    /** Input is accepted once the input delay has passed (e2e tests wait on this). */
    this.ready = false;
    /** Set by the first accepted Restart or Title; every later input is ignored. */
    this.left = false;

    const panel = this.add.image(width / 2, gameOver.panelY, keys.gameOverPanel);
    if (placeholders.has(keys.gameOverPanel)) panel.setTint(FLOW.panelPlaceholderTint);
    addSceneLabel(this);

    this.add
      .text(width / 2, gameOver.titleY, 'GAME OVER', {
        fontFamily: FLOW.fontFamily,
        fontSize: '44px',
        color: '#ef4444',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const s = this.stats;
    const dash = '—';
    this.statsText = this.add
      .text(
        width / 2,
        gameOver.statsY,
        [`Time   ${s ? formatTime(s.timeMs) : dash}`, `Kills  ${s ? s.kills : dash}`, `Level  ${s ? s.level : dash}`],
        { fontFamily: FLOW.fontFamily, fontSize: '22px', color: '#ffffff', align: 'left', lineSpacing: 6 },
      )
      .setOrigin(0.5);

    const offset = (this.textures.getFrame(keys.button).width * buttonScale + gameOver.buttonGap) / 2;
    this.restartButton = new Button(this, width / 2 - offset, gameOver.buttonsY, 'RESTART', () => this.restart());
    this.titleButton = new Button(this, width / 2 + offset, gameOver.buttonsY, 'TITLE', () => this.toTitle());

    this.input.keyboard.on('keydown-ENTER', () => this.restart());
    this.input.keyboard.on('keydown-ESC', () => this.toTitle());
    this.time.delayedCall(gameOver.inputDelayMs, () => {
      this.ready = true;
    });
  }

  /** Start a new session directly. */
  restart() {
    if (!this.ready || this.left) return;
    this.left = true;
    this.scene.start('Game');
  }

  toTitle() {
    if (!this.ready || this.left) return;
    this.left = true;
    this.scene.start('Title');
  }
}
