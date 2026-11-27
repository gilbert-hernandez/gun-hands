import Phaser from 'phaser';
import { POWERUPS } from '../config/index.js';
import { ENEMY_KILLED } from '../combat/events.js';
import { ensureAnim } from '../fx/anims.js';
import Pickups from './Pickups.js';
import { POWERUP_COLLECTED, POWERUP_EXPIRED } from './events.js';
import { effectiveWeapon, isTimed, pickWeighted, pickupVisible, rollDrop, tickTimers } from './rules.js';

/** @typedef {import('../config/powerups.js').PowerupId} PowerupId */
/** @typedef {import('./rules.js').ActiveTimers} ActiveTimers */
/** @typedef {import('../combat/events.js').EnemyKilledEvent} EnemyKilledEvent */
/** @typedef {import('../enemy/Enemy.js').default} Enemy */

/** Order the debug P key cycles through. */
export const DEBUG_ORDER = /** @type {PowerupId[]} */ (['rapidfire', 'spread', 'shield', 'health', 'bomb', 'magnet']);
// How far in front of the player (px, along the aim) the debug key drops a pickup.
const DEBUG_DROP_DISTANCE = 60;

const SHIELD_KEY = 'fx_shield';
const BLAST_KEY = 'fx_bomb_blast';
const BLAST_ANIM = 'fx_bomb_blast_play';

/**
 * Loot powerups for one Game session (GH-9): drops on `enemy-killed`, pickups on the floor,
 * timed effects (Rapid Fire and Spread Shot layered onto the player's weapon, Shield checked by
 * Combat) and instant ones (Health Pack, Bomb, Magnet), and the powerup events.
 * Lives on the Game scene (`scene.powerups`), so it resets with every session.
 */
export default class Powerups {
  /**
   * @param {Phaser.Scene} scene the Game scene (events are emitted on `scene.events`)
   * @param {object} parts
   * @param {import('../player/Player.js').default} parts.player
   * @param {import('../combat/Combat.js').default} parts.combat
   * @param {import('../enemy/Enemies.js').default} parts.enemies
   * @param {import('../xp/Gems.js').default} parts.gems
   */
  constructor(scene, { player, combat, enemies, gems }) {
    this.scene = scene;
    this.player = player;
    this.combat = combat;
    this.enemies = enemies;
    this.gems = gems;
    this.pickups = new Pickups(scene);
    /** @type {ActiveTimers} timed powerup id -> ms left (the HUD reads this) */
    this.active = {};
    /** Random source for drop rolls and picks; tests may replace it with a seeded one. */
    this.rng = Math.random;
    /** Drop chances in use; tests may replace them (e.g. `{ grunt: 1 }`). */
    this.dropChance = { ...POWERUPS.dropChance };
    this.debugIndex = 0;
    /** Powerups collected this session, by id (run summary, GH-13). @type {Partial<Record<PowerupId, number>>} */
    this.collected = {};

    player.boosts = () => effectiveWeapon(player.weapon, this.active, POWERUPS.types);

    ensureAnim(scene, SHIELD_KEY, POWERUPS.frameMs.shield);
    // Under the guns (1), over the body.
    this.aura = scene.add.sprite(player.x, player.y, SHIELD_KEY).setDepth(0.9).setVisible(false);
    this.aura.play(SHIELD_KEY);

    ensureAnim(scene, BLAST_ANIM, POWERUPS.frameMs.bombBlast, { loop: false, sheet: BLAST_KEY });
    this.blast = scene.add.sprite(0, 0, BLAST_KEY).setDepth(1.6).setScale(POWERUPS.bombBlastScale).setVisible(false);
    this.blast.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.blast.setVisible(false));

    /** @param {EnemyKilledEvent} e */
    const onKilled = ({ typeId, x, y }) => {
      if (rollDrop(typeId, this.dropChance, this.rng))
        this.pickups.drop(x, y, pickWeighted(POWERUPS.weights, this.rng));
    };
    // Sync the aura after physics has moved the player this frame, like the guns.
    const syncAura = () => this.syncAura();
    scene.events.on(ENEMY_KILLED, onKilled);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, syncAura);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(ENEMY_KILLED, onKilled);
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, syncAura);
    });
  }

  /** Whether the Shield is up (Combat skips contact damage meanwhile). */
  isShielded() {
    return (this.active.shield ?? 0) > 0;
  }

  /**
   * Tick timed powerups (emitting `powerup-expired`), age pickups, and collect those the player
   * reaches. Call once per frame; does nothing once the player is dead.
   * @param {number} delta frame time in ms
   */
  update(delta) {
    if (this.player.dead) return;
    const t = tickTimers(this.active, delta);
    this.active = t.active;
    for (const id of t.expired) this.scene.events.emit(POWERUP_EXPIRED, { id });
    for (const id of this.pickups.update(delta, this.player)) this.collect(id);
  }

  /**
   * Apply powerup `id`: start (or refresh) a timed one, or run an instant one, then emit
   * `powerup-collected`.
   * @param {PowerupId} id
   */
  collect(id) {
    const type = POWERUPS.types[id];
    this.collected[id] = (this.collected[id] ?? 0) + 1;
    if (isTimed(id, POWERUPS.types)) {
      this.active[id] = type.durationMs;
      this.scene.events.emit(POWERUP_COLLECTED, { id, durationMs: type.durationMs });
      return;
    }
    if (id === 'health') this.player.heal(type.heal);
    else if (id === 'magnet') this.gems.magnetizeAll();
    else if (id === 'bomb') this.bomb(type.damage);
    this.scene.events.emit(POWERUP_COLLECTED, { id });
  }

  /**
   * Damage every live enemy inside the camera view, pushing survivors away from the player,
   * then play the blast. The camera shake comes from `Juice` on `powerup-collected` (GH-13).
   * @param {number} damage
   */
  bomb(damage) {
    const view = this.scene.cameras.main.worldView;
    const p = this.player;
    // Snapshot first: kills despawn enemies while we'd otherwise be iterating the group.
    const targets = /** @type {Enemy[]} */ (this.enemies.group.getChildren()).filter(
      (e) => e.active && view.contains(e.x, e.y),
    );
    for (const e of targets) this.combat.damageEnemy(e, damage, e.x - p.x, e.y - p.y, 'bomb');
    this.blast.setPosition(p.x, p.y).setVisible(true).play(BLAST_ANIM);
  }

  /** Dev shortcut: drop the next powerup (cycling through all six) in front of the player. */
  debugDrop() {
    const id = DEBUG_ORDER[this.debugIndex++ % DEBUG_ORDER.length];
    const p = this.player;
    const b = this.scene.physics.world.bounds;
    const x = Phaser.Math.Clamp(p.x + Math.cos(p.aim) * DEBUG_DROP_DISTANCE, b.left + 16, b.right - 16);
    const y = Phaser.Math.Clamp(p.y + Math.sin(p.aim) * DEBUG_DROP_DISTANCE, b.top + 16, b.bottom - 16);
    return this.pickups.drop(x, y, id);
  }

  /** Short readout of the active timers for the debug line, e.g. `rapidfire 7.2  shield 3.0`. */
  debugText() {
    const parts = Object.entries(this.active).map(([id, ms]) => `${id} ${(ms / 1000).toFixed(1)}`);
    return parts.length ? parts.join('  ') : '-';
  }

  syncAura() {
    const ms = this.active.shield ?? 0;
    const show = ms > 0 && !this.player.dead && pickupVisible(ms, POWERUPS.shieldWarnMs, POWERUPS.blinkMs);
    this.aura.setVisible(show);
    if (show) this.aura.setPosition(this.player.x, this.player.y);
  }
}
