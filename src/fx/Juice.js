import Phaser from 'phaser';
import { ENEMIES, JUICE } from '../config/index.js';
import { ENEMY_DAMAGED, ENEMY_KILLED, PLAYER_HIT } from '../combat/events.js';
import { POWERUP_COLLECTED } from '../powerups/events.js';
import { canHitStop, shakeIntensity, shouldShake } from './rules.js';
import DamageNumbers from './DamageNumbers.js';

/** @typedef {import('../combat/events.js').EnemyKilledEvent} EnemyKilledEvent */
/** @typedef {import('../combat/events.js').PlayerHitEvent} PlayerHitEvent */
/** @typedef {import('../combat/events.js').EnemyDamagedEvent} EnemyDamagedEvent */

/** Between the death animations (0.75) and the impact sparks (0.8). */
const PARTICLE_DEPTH = 0.78;

/**
 * Game feel for one Game session (GH-13): camera shake, the hit-stop on Brute kills, hit and death
 * particles, and damage numbers. It listens
 * to the Game events (like `GameAudio`) and removes its listeners on shutdown. Everything here is
 * cosmetic: the hit-stop freezes the whole scene and gives the time back, so no outcome changes.
 *
 * `settings` is this session's copy of `JUICE`; tests change it in the page.
 */
export default class Juice {
  /**
   * @param {Phaser.Scene} scene the Game scene
   * @param {object} parts
   * @param {{ dead: boolean }} parts.player
   * @param {{ group: Phaser.GameObjects.Group }} parts.bullets
   */
  constructor(scene, { player, bullets }) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;
    /** @type {typeof JUICE} */
    this.settings = structuredClone(JUICE);
    /** The browser asks for reduced motion: no camera shake at all. */
    this.reducedMotion =
      typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    /** Intensity of the shake started last (compared only while it's still running). */
    this.shakeLevel = 0;
    /** ms left of the running hit-stop (0 = none). */
    this.hitStopMs = 0;
    /** `game.loop.time` when the last hit-stop ended, for the cooldown. */
    this.lastHitStopEnd = /** @type {number | null} */ (null);

    const p = this.settings.particles;
    // One emitter for every burst; the texture is generated in Boot. The cap is on live particles.
    this.particles = scene.add
      .particles(0, 0, p.texture, {
        emitting: false,
        speed: p.hit.speed,
        lifespan: p.hit.lifespanMs,
        scale: { start: 1, end: 0.3 },
        alpha: { start: 1, end: 0 },
        maxAliveParticles: p.max,
      })
      .setDepth(PARTICLE_DEPTH);
    this.numbers = new DamageNumbers(scene, this.settings.damageNumbers);

    /** @type {Array<[string, Function]>} */
    const listeners = [
      [
        PLAYER_HIT,
        (/** @type {PlayerHitEvent} */ e) =>
          this.shake(this.settings.shake.playerHit.ms, shakeIntensity(this.settings.shake.playerHit, e.damage)),
      ],
      [ENEMY_DAMAGED, (/** @type {EnemyDamagedEvent} */ e) => this.enemyDamaged(e)],
      [ENEMY_KILLED, (/** @type {EnemyKilledEvent} */ e) => this.enemyKilled(e)],
      [
        POWERUP_COLLECTED,
        (/** @type {{ id: string }} */ e) => e.id === 'bomb' && this.shakeKind(this.settings.shake.bomb),
      ],
    ];
    for (const [name, fn] of listeners) scene.events.on(name, fn);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [name, fn] of listeners) scene.events.off(name, fn);
      // The animation manager is game-wide: never leave it paused behind a finished session.
      if (this.hitStopMs > 0) scene.anims.resumeAll();
      this.hitStopMs = 0;
    });
  }

  /** @param {{ ms: number, intensity: number }} kind */
  shakeKind(kind) {
    this.shake(kind.ms, kind.intensity);
  }

  /**
   * Shake the camera unless reduced motion is on, or a stronger shake is still running.
   * @param {number} ms
   * @param {number} intensity
   * @returns {boolean} true if a shake started
   */
  shake(ms, intensity) {
    if (this.reducedMotion || !(ms > 0)) return false;
    const cam = this.scene.cameras.main;
    if (!shouldShake(cam.shakeEffect.isRunning, this.shakeLevel, intensity)) return false;
    this.shakeLevel = intensity;
    cam.shake(ms, intensity, true);
    return true;
  }

  /**
   * A damage number above the enemy, plus a small spark burst for bullet hits.
   * @param {EnemyDamagedEvent} e
   */
  enemyDamaged(e) {
    const size = ENEMIES.types[/** @type {keyof typeof ENEMIES.types} */ (e.typeId)]?.size ?? 32;
    this.numbers.show(e.x, e.y - size / 2, e.damage, e.killed);
    if (e.source === 'bullet') this.burst(this.settings.particles.hit, this.settings.particles.hitColor, e.x, e.y);
  }

  /**
   * A death burst in the type's color; Brutes also shake and hit-stop.
   * @param {EnemyKilledEvent} e
   */
  enemyKilled(e) {
    const { death } = this.settings.particles;
    const color = death.colors[/** @type {keyof typeof death.colors} */ (e.typeId)] ?? 0xffffff;
    this.burst(death, color, e.x, e.y);
    if (e.typeId === 'brute') {
      this.shakeKind(this.settings.shake.bruteKill);
      this.hitStop();
    }
  }

  /**
   * Burst particles at (x, y). The emitter's live cap cuts a burst short when full.
   * @param {{ count: number, speed: { min: number, max: number }, lifespanMs: number }} b
   * @param {number} color
   * @param {number} x
   * @param {number} y
   */
  burst(b, color, x, y) {
    const em = this.particles;
    em.speed = b.speed;
    em.lifespan = b.lifespanMs;
    em.setParticleTint(color);
    em.explode(b.count, x, y);
  }

  /** Whether the scene is frozen by a hit-stop. */
  get stopped() {
    return this.hitStopMs > 0;
  }

  /**
   * Freeze the Game scene for `settings.hitStop.ms`: physics, sprite animations, tweens and scene
   * timers stop here; `GameScene.update` skips everything else while `stopped`. Refused while one
   * runs, inside the cooldown, or once the player is dead.
   * @returns {boolean} true if a hit-stop started
   */
  hitStop() {
    const { ms, cooldownMs } = this.settings.hitStop;
    const nowMs = this.scene.game.loop.time;
    if (this.player.dead) return false;
    if (!canHitStop({ nowMs, remainingMs: this.hitStopMs, lastEndMs: this.lastHitStopEnd, cooldownMs, ms }))
      return false;
    this.hitStopMs = ms;
    // Bullet lifetimes run on loop time, which keeps going: give the frozen time back up front.
    for (const child of this.bullets.group.getChildren()) {
      const b = /** @type {any} */ (child);
      if (b.active) b.expiresAt += ms;
    }
    this.scene.physics.world.pause();
    this.scene.anims.pauseAll();
    this.scene.tweens.pauseAll();
    this.scene.time.paused = true;
    this.particles.pause();
    return true;
  }

  /**
   * Count the hit-stop down. Call first thing in `GameScene.update`.
   * @param {number} delta frame time in ms
   * @returns {boolean} true while frozen, including the frame it ends on (that frame's delta is frozen time)
   */
  tick(delta) {
    if (this.hitStopMs <= 0) return false;
    this.hitStopMs = Math.max(0, this.hitStopMs - delta);
    if (this.hitStopMs === 0) this.endHitStop();
    return true;
  }

  endHitStop() {
    this.scene.physics.world.resume();
    this.scene.anims.resumeAll();
    this.scene.tweens.resumeAll();
    this.scene.time.paused = false;
    this.particles.resume();
    this.lastHitStopEnd = this.scene.game.loop.time;
  }
}
