import Phaser from 'phaser';
import { DISPLAY, TOUCH } from '../config/index.js';
import { velocityFrom } from '../player/movement.js';
import { inputMode, setInputMode } from './mode.js';
import { sideOf, stickVector } from './sticks.js';

/** @typedef {import('./sticks.js').Vec} Vec */

/**
 * A held stick and the touch that owns it. Phaser reuses pointer objects, so `identifier` and
 * `downTime` tell this touch from a later one.
 * @typedef {{ pointer: Phaser.Input.Pointer, identifier: number, downTime: number, origin: Vec }} Stick
 */

/**
 * What the player wants to do this frame. `aimPoint` (world) is set while the mouse aims,
 * `aimAngle` (radians) once the aim stick has; both null = no aim yet.
 * @typedef {{ move: Vec, aimPoint: Vec | null, aimAngle: number | null }} PlayerIntent
 */

/**
 * Turns keyboard, mouse and touch into one intent for the player (GH-25). The left half of the
 * screen is a floating move stick and the right half a floating aim stick. Sticks are polled each
 * frame rather than driven by events: a paused scene gets no events, so it can miss a release.
 */
export default class PlayerInput {
  /** @param {Phaser.Scene} scene the Game scene */
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    /** The mouse has moved over the game since the aim stick was last used. */
    this.mouseUsed = false;
    /** @type {number | null} last aim set by the aim stick */
    this.aimAngle = null;
    /** @type {{ move: Stick | null, aim: Stick | null }} */
    this.sticks = { move: null, aim: null };
    /** @type {Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>} */
    this.keys = /** @type {any} */ (scene.input.keyboard.addKeys('W,A,S,D'));
    for (const key of Object.values(this.keys)) key.on('down', () => this.setMode('keys'));

    const onDown = (pointer) => this.pointerDown(pointer);
    // Beside the canvas only touches count: browsers follow a tap there with emulated mouse events.
    const onDownOutside = (pointer) => {
      if (pointer.wasTouch) this.pointerDown(pointer);
    };
    const onMove = (pointer) => {
      if (pointer.wasTouch) return;
      this.setMode('keys');
      this.mouseUsed = true;
    };
    const reset = () => this.reset();
    const { Events } = Phaser.Scenes;
    scene.input.on('pointerdown', onDown);
    scene.input.on('pointerdownoutside', onDownOutside);
    scene.input.on('pointermove', onMove);
    scene.events.on(Events.PAUSE, reset);
    scene.events.on(Events.RESUME, reset);
    scene.events.once(Events.SHUTDOWN, () => {
      this.disable();
      scene.input.off('pointerdown', onDown);
      scene.input.off('pointerdownoutside', onDownOutside);
      scene.input.off('pointermove', onMove);
      scene.events.off(Events.PAUSE, reset);
      scene.events.off(Events.RESUME, reset);
    });
  }

  get mode() {
    return inputMode(this.scene);
  }

  /** @param {import('./mode.js').InputMode} mode */
  setMode(mode) {
    if (mode === this.mode) return;
    this.reset();
    setInputMode(this.scene, mode);
  }

  /** @param {Phaser.Input.Pointer} pointer */
  pointerDown(pointer) {
    if (!this.enabled) return;
    if (!pointer.wasTouch) {
      this.setMode('keys');
      return;
    }
    this.setMode('touch');
    this.dropEnded();
    const side = sideOf(pointer.x, DISPLAY.width);
    if (this.sticks[side]) return;
    const { identifier, downTime } = pointer;
    this.sticks[side] = { pointer, identifier, downTime, origin: { x: pointer.x, y: pointer.y } };
  }

  /** Let go of sticks whose touch has ended, including releases this scene got no event for. */
  dropEnded() {
    for (const side of /** @type {const} */ (['move', 'aim'])) {
      const s = this.sticks[side];
      if (!s) continue;
      const p = s.pointer;
      if (!p.isDown || p.identifier !== s.identifier || p.downTime !== s.downTime) this.sticks[side] = null;
    }
  }

  /** Let go of both sticks. A finger still down must lift and press again. */
  reset() {
    this.sticks.move = null;
    this.sticks.aim = null;
  }

  /** Stop taking touches for good (death, session end). */
  disable() {
    this.enabled = false;
    this.reset();
  }

  /** @returns {PlayerIntent} */
  read() {
    this.dropEnded();
    const aim = this.vector('aim');
    if (aim) {
      this.aimAngle = Math.atan2(aim.y, aim.x);
      // The stick's aim stays until the mouse moves again.
      this.mouseUsed = false;
    }
    const move = this.mode === 'touch' ? (this.vector('move') ?? { x: 0, y: 0 }) : this.keyVector();
    if (!this.mouseUsed) return { move, aimPoint: null, aimAngle: this.aimAngle };
    // Recompute from screen coords so aim stays right while the camera scrolls.
    const { x, y } = this.scene.input.mousePointer;
    return { move, aimPoint: this.scene.cameras.main.getWorldPoint(x, y), aimAngle: null };
  }

  /** @param {'move' | 'aim'} side */
  vector(side) {
    const s = this.sticks[side];
    return s && stickVector(s.origin, s.pointer, TOUCH.stick.deadZone);
  }

  /** @returns {Vec} held keys as a direction; opposite keys cancel */
  keyVector() {
    const { W, A, S, D } = this.keys;
    return velocityFrom({ up: W.isDown, down: S.isDown, left: A.isDown, right: D.isDown }, 1);
  }
}
