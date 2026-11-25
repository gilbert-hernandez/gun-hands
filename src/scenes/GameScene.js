import Phaser from 'phaser';
import { DEBUG, DISPLAY, FLOW, WEAPON, WORLD } from '../config/index.js';
import Player, { PLAYER_FIRED } from '../player/Player.js';
import { isPortraitPhone } from '../input/orientation.js';
import PlayerInput from '../input/PlayerInput.js';
import Enemies from '../enemy/Enemies.js';
import Bullets from '../weapon/Bullets.js';
import { gunsFlipY } from '../weapon/aim.js';
import Arena from '../world/Arena.js';
import Combat from '../combat/Combat.js';
import Xp from '../xp/Xp.js';
import Upgrades from '../upgrades/Upgrades.js';
import Powerups from '../powerups/Powerups.js';
import { formatTime } from '../util/format.js';
import { addSceneLabel } from './sceneLabel.js';

// The play session: the Tiled arena, the player, enemies, and a camera that follows the player.
// The player auto-fires from a bullet pool; walls stop the player, bullets, and enemies.
// Enemies spawn off-screen and chase the player (GH-5); bullets hurt enemies, enemies hurt the
// player, and the player's death ends the session in GameOver (GH-6, see Combat). Kills drop XP
// gems that level the player up and open LevelUp (GH-7, see Xp), where the player picks an
// upgrade (GH-8, see Upgrades). Kills also drop loot powerups now and then (GH-9, see Powerups).
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    // Debug label bottom-right, clear of the HUD (GH-10) and the debug readout.
    addSceneLabel(this)
      ?.setOrigin(1, 1)
      .setPosition(DISPLAY.width - 4, DISPLAY.height - 4);
    /** Survival time in ms: counted in update(), so it stops while the scene is paused. */
    this.survivalMs = 0;

    this.arena = new Arena(this);
    const { width, height, spawn } = this.arena;
    this.physics.world.setBounds(0, 0, width, height);

    this.bullets = new Bullets(this);
    this.player = new Player(this, spawn.x, spawn.y, this.bullets, new PlayerInput(this));
    this.arena.collide(this.player);
    this.player.isSolidAt = (x, y) => this.arena.isSolidAt(x, y);
    // Walls always stop bullets, whatever pierce they have left.
    this.bulletWalls = this.arena.collide(this.bullets.group, (bullet) => /** @type {any} */ (bullet).despawn());
    this.createMuzzleFlash();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, height);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, WORLD.cameraLerp, WORLD.cameraLerp);

    this.enemies = new Enemies(this, this.player, (x, y) => this.arena.isSolidAt(x, y), { width, height });
    this.arena.collide(this.enemies.group);

    this.combat = new Combat(this, {
      player: this.player,
      bullets: this.bullets,
      enemies: this.enemies,
      survivalMs: () => this.survivalMs,
      shielded: () => this.powerups?.isShielded() ?? false,
    });
    this.xp = new Xp(this, this.player);
    // Upgrade ranks for this session; the LevelUp screen draws and applies cards through it (GH-8).
    this.upgrades = new Upgrades(this, this.player);
    // Loot powerups: drops, pickups, timed and instant effects (GH-9). Created after Xp, so a kill
    // drops its gem before its powerup.
    this.powerups = new Powerups(this, {
      player: this.player,
      combat: this.combat,
      enemies: this.enemies,
      gems: this.xp.gems,
    });

    // HUD overlay runs in parallel on top of Game.
    this.scene.launch('UI');

    // Pause menu (GH-11). `pauseOpen` is a flag, not the scene state, for the same reason as
    // `xp.levelUpOpen`: Phaser queues pause/launch, and a doubled keydown must not open it twice.
    this.pauseOpen = false;
    this.input.keyboard.on('keydown-ESC', () => this.openPause());
    if (FLOW.pauseOnBlur) {
      // The one listener on a game-wide emitter: it must go with the session.
      const onBlur = () => this.openPause();
      this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));
    }

    if (DEBUG.enabled) {
      // Tuning aid, not the HUD (see UIScene): survival time, live enemies / cap, HP, kills.
      this.debugText = this.add
        .text(8, DISPLAY.height - 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' })
        .setOrigin(0, 1)
        .setScrollFactor(0)
        .setDepth(100);
      // L: gain exactly the XP for the next level, through the real level-up path.
      this.input.keyboard.on('keydown-L', () => this.xp.grantLevel());
      // G: die through the real death path. H: take 10 damage (ignores i-frames). J: full HP.
      this.input.keyboard.on('keydown-G', () => this.combat.damagePlayer(this.player.hp, { force: true }));
      this.input.keyboard.on('keydown-H', () => this.combat.damagePlayer(10, { force: true }));
      this.input.keyboard.on('keydown-J', () => this.player.heal());
      // P: drop the next powerup (cycling through all six) in front of the player.
      this.input.keyboard.on('keydown-P', () => this.powerups.debugDrop());
    }
  }

  /**
   * Pause Game and open the Pause menu, unless the player is dead, LevelUp is open (or about to
   * open), or Pause already is.
   */
  openPause() {
    if (this.player.dead || this.xp.levelUpOpen || this.pauseOpen) return;
    this.pauseOpen = true;
    this.scene.pause();
    this.scene.launch('Pause');
  }

  update(time, delta) {
    // The rotate prompt covers the page in portrait (GH-26). Checked every frame, so nothing that
    // resumes or starts Game behind it can let the run go on.
    if (isPortraitPhone()) {
      this.openPause();
      if (this.pauseOpen) return;
    }
    // Survival time stops at death, so run stats report the time the player died.
    if (!this.player.dead) this.survivalMs += delta;
    // Count the flash down before firing, so a shot this frame shows for the full duration.
    this.muzzleMsLeft -= delta;
    if (this.muzzle.visible && this.muzzleMsLeft <= 0) this.muzzle.setVisible(false);
    this.player.update(time, delta);
    this.enemies.update(delta, this.survivalMs);
    this.xp.update(delta);
    this.powerups.update(delta);
    const p = this.player;
    const xp = this.xp.progression;
    const w = p.weapon;
    this.debugText?.setText(
      `t ${formatTime(this.survivalMs)}  enemies ${this.enemies.liveCount}/${this.enemies.cap}` +
        `  hp ${p.hp}/${p.maxHp}  kills ${this.combat.kills}  lv ${xp.level}  xp ${xp.xpInto}/${xp.xpNeeded}` +
        `\nspd ${p.speed}  dmg ${w.bullet.damage}  rate ${w.fireRate}  n ${w.bullet.count}` +
        `  pierce ${w.bullet.pierce}  pickup ${p.pickupRadius}` +
        `\npw ${this.powerups.debugText()}  pickups ${this.powerups.pickups.liveCount}`,
    );
  }

  /**
   * Placeholder muzzle flash: one reused sprite shown at the gun tip for `muzzleFlashMs`
   * on every `player-fired` event. Art/sound tickets hook the same event.
   */
  createMuzzleFlash() {
    // fx_muzzle's pivot is its left-center, so the flash extends forward from the tip.
    this.muzzle = this.add.sprite(0, 0, 'fx_muzzle').setOrigin(0, 0.5).setDepth(1.5).setVisible(false);
    this.muzzleMsLeft = 0;
    const onFired = ({ x, y, angle }) => {
      this.muzzle.setPosition(x, y).setRotation(angle).setFlipY(gunsFlipY(angle)).setVisible(true);
      this.muzzleMsLeft = WEAPON.muzzleFlashMs;
    };
    this.events.on(PLAYER_FIRED, onFired);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(PLAYER_FIRED, onFired));
  }
}
