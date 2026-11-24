import Phaser from 'phaser';
import { DISPLAY, FLOW } from '../config/index.js';
import Button from '../ui/Button.js';
import { addSceneLabel } from './sceneLabel.js';

// The pause menu (GH-11). Launched by Game (`openPause`, on Esc or focus loss) with Game paused,
// so everything in the run stands still exactly as it does during LevelUp. Drawn above the HUD.
// Resume (or Esc, after the input delay) resumes Game; Quit to Title ends the session.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const { width, height } = DISPLAY;
    const { pause } = FLOW;
    /** Esc is accepted once the input delay has passed (e2e tests wait on this). */
    this.ready = false;
    /** Set by the first Resume or Quit; every later input is ignored. */
    this.left = false;

    this.add.rectangle(0, 0, width, height, 0x000000, pause.dimAlpha).setOrigin(0);
    addSceneLabel(this)?.setY(52);
    this.add
      .text(width / 2, pause.titleY, 'PAUSED', {
        fontFamily: FLOW.fontFamily,
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.resumeButton = new Button(this, width / 2, pause.resumeY, 'RESUME', () => this.resume());
    this.quitButton = new Button(this, width / 2, pause.quitY, 'QUIT TO TITLE', () => this.quit());

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.ready) this.resume();
    });
    this.time.delayedCall(pause.inputDelayMs, () => {
      this.ready = true;
    });
  }

  resume() {
    if (this.left) return;
    this.left = true;
    /** @type {any} */ (this.scene.get('Game')).pauseOpen = false;
    this.scene.resume('Game');
    this.scene.stop();
  }

  quit() {
    if (this.left) return;
    this.left = true;
    this.scene.stop('UI');
    this.scene.stop('Game');
    // Starting Title from here also stops this scene.
    this.scene.start('Title');
  }
}
