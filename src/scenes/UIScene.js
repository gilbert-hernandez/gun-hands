import Phaser from 'phaser';
import { DISPLAY, ENEMIES, HUD, POWERUPS } from '../config/index.js';
import { PLAYER_HIT } from '../combat/events.js';
import { PLAYER_LEVELED } from '../xp/events.js';
import { activePowerups, fillWidth, iconVisible } from '../hud/rules.js';
import { formatClock } from '../util/format.js';
import { useTouchWording } from '../input/mode.js';
import { pickLayout } from '../ui/layout.js';
import TouchOverlay from '../ui/TouchOverlay.js';
import { addSceneLabel } from './sceneLabel.js';

/** @typedef {import('../config/powerups.js').TimedPowerupId} TimedPowerupId */

/**
 * What the HUD shows, read from the Game scene each frame.
 * @typedef {object} HudSnapshot
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} level
 * @property {number} xpInto
 * @property {number} xpNeeded
 * @property {number} survivalMs
 * @property {number} kills
 * @property {Partial<Record<string, number>>} active timed powerup id -> ms left
 */

/** @typedef {{ icon: Phaser.GameObjects.Image, text: Phaser.GameObjects.Text, id: TimedPowerupId | null }} PowerupSlot */

// The HUD overlay (GH-10), launched alongside Game. Each frame it reads the session's state from
// the Game scene (HP, XP and level, survival time, kills, active powerups) and redraws only what
// changed, so it can never drift from the game. Game events drive the feedback: `player-hit`
// flashes the HP fill and `player-leveled` pops the level label. Everything sits on whole pixels.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    /** Sizes for this session: desktop or touch (GH-26). */
    const layout = pickLayout(HUD, useTouchWording(this));
    const { margin, rowGap, barInset, labelGap, fontSize } = layout;
    /** @type {any} */
    this.gameScene = this.scene.get('Game');
    this.placeholders = new Set(this.registry.get('placeholders') ?? []);
    /** Last values drawn, so text and fills change only when their value does. */
    this.shown = {};
    this.flashMs = 0;
    /** Visible fill widths in px (e2e tests read these). */
    this.hpFillWidth = 0;
    this.xpFillWidth = 0;

    const frameH = this.textures.getFrame(HUD.barFrame).height;
    const hpY = margin;
    const xpY = hpY + frameH + rowGap;
    this.powerupY = xpY + frameH + rowGap;

    this.hpFrame = this.addBarFrame(margin, hpY);
    this.hpFill = this.addBarFill(HUD.hpFill, margin + barInset.x, hpY + barInset.y, HUD.placeholderTints.hp);
    this.xpFrame = this.addBarFrame(margin, xpY);
    this.xpFill = this.addBarFill(HUD.xpFill, margin + barInset.x, xpY + barInset.y, HUD.placeholderTints.xp);
    this.fullFill = this.hpFill.frame.width;

    const textX = margin + this.hpFrame.width + labelGap;
    this.hpText = this.addText(textX, 0, fontSize.bar);
    this.hpText.y = this.centerY(hpY, frameH, this.hpText);
    this.levelText = this.addText(textX, 0, fontSize.bar, HUD.colors.level);
    this.levelText.y = this.centerY(xpY, frameH, this.levelText);
    this.timerText = this.addText(0, margin, fontSize.timer);
    this.killsText = this.addText(0, margin, fontSize.kills);

    // Overtime cue (GH-13): shown once per session, when survival time reaches the overtime start.
    /** True once overtime has started this session. */
    this.overtime = false;
    /** How many times the banner has started (e2e tests read this). */
    this.bannerShows = 0;
    // Measure the timer on a sample so the banner sits just below it.
    const timerH = this.timerText.setText('00:00').height;
    this.timerText.setText('');
    this.bannerText = this.addText(0, margin + timerH + HUD.overtime.gap, fontSize.banner, HUD.overtime.color)
      .setText(HUD.overtime.banner)
      .setAlpha(0);
    this.bannerText.x = Math.round((DISPLAY.width - this.bannerText.width) / 2);

    /** @type {PowerupSlot[]} fixed pool, one per timed powerup, filled left to right */
    this.slots = HUD.powerupOrder.map((_, i) => {
      const x = margin + i * layout.powerupSlot;
      const icon = this.add
        .image(x, this.powerupY, `ui_icon_${HUD.powerupOrder[0]}`)
        .setOrigin(0)
        .setScale(layout.powerupIconScale)
        .setVisible(false);
      const text = this.addText(x + icon.displayWidth + HUD.iconGap, 0, fontSize.powerup).setVisible(false);
      text.y = this.centerY(this.powerupY, icon.displayHeight, text);
      return { icon, text, id: null };
    });

    addSceneLabel(this)?.setY(this.powerupY + 22);

    // Thumbsticks and the pause button (GH-25).
    this.touch = new TouchOverlay(this, this.gameScene);

    // Feedback from Game's events; listeners go away with this scene.
    const gameEvents = this.gameScene.events;
    const onHit = () => this.flashHp();
    const onLeveled = () => this.popLevel();
    gameEvents.on(PLAYER_HIT, onHit);
    gameEvents.on(PLAYER_LEVELED, onLeveled);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off(PLAYER_HIT, onHit);
      gameEvents.off(PLAYER_LEVELED, onLeveled);
      this.tweens.killAll();
    });

    this.refresh();
  }

  update(_time, delta) {
    if (this.flashMs > 0) {
      this.flashMs -= delta;
      if (this.flashMs <= 0) this.restoreHpTint();
    }
    this.refresh();
    this.touch.update();
  }

  /**
   * The Game session's current state, or null while its systems don't exist yet.
   * @returns {HudSnapshot | null}
   */
  snapshot() {
    const g = this.gameScene;
    if (!g?.player || !g.xp || !g.combat || !g.powerups) return null;
    const p = g.xp.progression;
    return {
      hp: g.player.hp,
      maxHp: g.player.maxHp,
      level: p.level,
      xpInto: p.xpInto,
      xpNeeded: p.xpNeeded,
      survivalMs: g.survivalMs,
      kills: g.combat.kills,
      active: g.powerups.active,
    };
  }

  /** Redraw whatever changed since the last frame. */
  refresh() {
    const s = this.snapshot();
    if (!s) return;
    const { width } = DISPLAY;

    const hpW = fillWidth(s.hp, s.maxHp, this.fullFill);
    if (hpW !== this.hpFillWidth || this.shown.hp === undefined) this.setFill(this.hpFill, hpW, 'hpFillWidth');
    this.setTextIfChanged('hp', this.hpText, `${Math.max(0, Math.ceil(s.hp))}/${s.maxHp}`);

    const xpW = fillWidth(s.xpInto, s.xpNeeded, this.fullFill);
    if (xpW !== this.xpFillWidth || this.shown.lv === undefined) this.setFill(this.xpFill, xpW, 'xpFillWidth');
    this.setTextIfChanged('lv', this.levelText, `LV ${s.level}`);

    if (!this.overtime && s.survivalMs >= ENEMIES.scaling.overtime.startS * 1000) this.startOvertime();
    if (this.setTextIfChanged('timer', this.timerText, formatClock(s.survivalMs)))
      this.timerText.x = Math.round((width - this.timerText.width) / 2);
    if (this.setTextIfChanged('kills', this.killsText, `KILLS ${s.kills}`))
      this.killsText.x = width - HUD.margin - Math.round(this.killsText.width);

    const list = activePowerups(s.active, HUD.powerupOrder);
    this.slots.forEach((slot, i) => {
      const entry = list[i];
      if (!entry) {
        if (slot.id !== null) {
          slot.id = null;
          slot.icon.setVisible(false);
          slot.text.setVisible(false);
        }
        return;
      }
      if (slot.id !== entry.id) {
        slot.id = entry.id;
        slot.icon.setTexture(`ui_icon_${entry.id}`);
        if (this.placeholders.has(`ui_icon_${entry.id}`)) slot.icon.setTint(POWERUPS.types[entry.id].placeholderTint);
        else slot.icon.clearTint();
        slot.text.setVisible(true);
      }
      const label = `${entry.seconds}s`;
      if (slot.text.text !== label) slot.text.setText(label);
      slot.icon.setVisible(iconVisible(entry.msLeft, HUD.powerupWarnMs, HUD.blinkMs));
    });
  }

  /**
   * Set `text` to `value` if it differs from what was last drawn under `key`.
   * @returns {boolean} whether it changed
   */
  setTextIfChanged(key, text, value) {
    if (this.shown[key] === value) return false;
    this.shown[key] = value;
    text.setText(value);
    return true;
  }

  /**
   * Show `w` whole pixels of a bar fill by cropping (never stretching) the art.
   * @param {Phaser.GameObjects.Image} fill
   * @param {number} w
   * @param {'hpFillWidth' | 'xpFillWidth'} field
   */
  setFill(fill, w, field) {
    this[field] = w;
    fill.setCrop(0, 0, w, fill.frame.height);
    fill.setVisible(w > 0);
  }

  /** Flash the HP fill white for `hitFlashMs`. */
  flashHp() {
    this.flashMs = HUD.hitFlashMs;
    this.hpFill.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  }

  restoreHpTint() {
    this.flashMs = 0;
    this.hpFill.setTintMode(Phaser.TintModes.MULTIPLY);
    if (this.placeholders.has(HUD.hpFill)) this.hpFill.setTint(HUD.placeholderTints.hp);
    else this.hpFill.clearTint();
  }

  /** Pop the level label up and back. */
  popLevel() {
    this.tweens.killTweensOf(this.levelText);
    this.levelText.setScale(1);
    this.tweens.add({
      targets: this.levelText,
      scale: HUD.levelPopScale,
      duration: HUD.levelPopMs / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.levelText.setScale(1),
    });
  }

  /** Overtime has started: the timer turns red for good and the banner shows once. */
  startOvertime() {
    const { color, fadeMs, holdMs } = HUD.overtime;
    this.overtime = true;
    this.bannerShows += 1;
    this.timerText.setColor(color);
    this.tweens.add({
      targets: this.bannerText,
      alpha: 1,
      duration: fadeMs,
      hold: holdMs,
      yoyo: true,
      onComplete: () => this.bannerText.setAlpha(0),
    });
  }

  addBarFrame(x, y) {
    const frame = this.add.image(x, y, HUD.barFrame).setOrigin(0);
    if (this.placeholders.has(HUD.barFrame)) frame.setTint(HUD.placeholderTints.frame);
    return frame;
  }

  addBarFill(key, x, y, placeholderTint) {
    const fill = this.add.image(x, y, key).setOrigin(0);
    if (this.placeholders.has(key)) fill.setTint(placeholderTint);
    return fill;
  }

  addText(x, y, size, color = HUD.colors.text) {
    const o = HUD.shadowOffset;
    return this.add
      .text(x, y, '', { fontFamily: HUD.fontFamily, fontSize: `${size}px`, color })
      .setShadow(o, o, HUD.colors.shadow, 0, false, true)
      .setOrigin(0);
  }

  /** Whole-pixel y that vertically centers `text` (measured on a sample) on a row at `top`. */
  centerY(top, rowH, text) {
    const empty = text.text === '';
    if (empty) text.setText('0');
    const y = top + Math.round((rowH - text.height) / 2);
    if (empty) text.setText('');
    return y;
  }
}
