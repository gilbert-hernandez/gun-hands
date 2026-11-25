import { TOUCH } from '../config/index.js';
import { knobOffset } from '../input/sticks.js';

/**
 * The touch controls drawn over the HUD (GH-25): held sticks, and the pause button in touch mode.
 * The button is above Game, so Phaser gives its touches to it and not to the sticks.
 */
export default class TouchOverlay {
  /**
   * @param {Phaser.Scene} scene the UI scene
   * @param {any} game the Game scene
   */
  constructor(scene, game) {
    this.game = game;
    this.graphics = scene.add.graphics();
    const { x, y, hitSize, size, fill, fillAlpha, color, colorAlpha } = TOUCH.pause;
    /** Hit area (e2e tests read this); invisible objects take no input. */
    this.pauseHit = scene.add.rectangle(x, y, hitSize, hitSize, fill, 0.001);
    const bar = size / 5;
    this.pauseIcon = scene.add.container(x, y, [
      scene.add.rectangle(0, 0, size, size, fill, fillAlpha),
      scene.add.rectangle(-bar, 0, bar, size * 0.6, color, colorAlpha),
      scene.add.rectangle(bar, 0, bar, size * 0.6, color, colorAlpha),
    ]);
    /** @type {{ id: number, downTime: number } | null} the touch that started on the button */
    this.armed = null;
    this.pauseHit.setInteractive();
    this.pauseHit.on('pointerdown', ({ id, downTime }) => {
      this.armed = { id, downTime };
    });
    this.pauseHit.on('pointerup', (pointer) => {
      const a = this.armed;
      if (!a || a.id !== pointer.id) return;
      this.armed = null;
      if (a.downTime === pointer.downTime && !pointer.wasCanceled) this.game.openPause();
    });
    this.update();
  }

  /** Redraw from the session's input state; call once per frame. */
  update() {
    const player = this.game.player;
    const input = player?.controls;
    const showPause = input?.mode === 'touch' && !player.dead;
    this.pauseHit.setVisible(showPause);
    this.pauseIcon.setVisible(showPause);

    const g = this.graphics;
    g.clear();
    if (!input) return;
    const { radius, knobRadius, color, baseAlpha, ringAlpha, knobAlpha } = TOUCH.stick;
    for (const stick of [input.sticks.move, input.sticks.aim]) {
      if (!stick) continue;
      const { x, y } = stick.origin;
      const knob = knobOffset(stick.origin, stick.pointer, radius);
      g.fillStyle(color, baseAlpha).fillCircle(x, y, radius);
      g.lineStyle(2, color, ringAlpha).strokeCircle(x, y, radius);
      g.fillStyle(color, knobAlpha).fillCircle(x + knob.x, y + knob.y, knobRadius);
    }
  }
}
