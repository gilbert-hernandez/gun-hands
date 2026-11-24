import Phaser from 'phaser';
import { DISPLAY } from '../config/index.js';
import { formatTime } from '../util/format.js';
import { addSceneLabel } from './sceneLabel.js';

/** @typedef {import('../combat/events.js').RunStats} RunStats */

// Stub: shows the run stats it is started with (GH-6). The real screen and Restart arrive in GH-11.
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
    const { width, height } = DISPLAY;
    addSceneLabel(this);
    this.add
      .text(width / 2, height / 2 - 60, 'GAME OVER', { fontFamily: 'monospace', fontSize: '48px', color: '#ef4444' })
      .setOrigin(0.5);

    if (this.stats) {
      const { timeMs, kills, level } = this.stats;
      this.statsText = this.add
        .text(width / 2, height / 2 + 10, [`Time   ${formatTime(timeMs)}`, `Kills  ${kills}`, `Level  ${level}`], {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffffff',
          align: 'left',
        })
        .setOrigin(0.5);
    }

    this.add
      .text(width / 2, height / 2 + 90, 'Click or press Enter to return to title', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const back = () => this.scene.start('Title');
    this.input.once('pointerdown', back);
    this.input.keyboard.once('keydown-ENTER', back);
  }
}
