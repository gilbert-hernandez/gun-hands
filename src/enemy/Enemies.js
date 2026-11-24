import { ENEMIES } from '../config/index.js';
import { ensureAnim } from '../player/Player.js';
import Enemy from './Enemy.js';
import { findSpawnPoint, ringRadius } from './spawn.js';
import { chaseVelocity, separationPushes } from './steering.js';
import { pickType, spawnsDue, waveAt } from './waves.js';

/** @typedef {import('./Enemy.js').EnemyTypeId} EnemyTypeId */

// Below this horizontal speed (px/s) an enemy keeps its current facing, so ones moving
// straight up or down don't flicker.
const FACING_DEAD_ZONE = 1;

/**
 * All enemies in a session: the pool, the wave director, and per-frame chase steering.
 * Other systems use `group` (to collide or overlap with) and `Enemy.despawn()`.
 */
export default class Enemies {
  /**
   * @param {import('phaser').Scene} scene
   * @param {{ x: number, y: number }} target what enemies chase (the player)
   * @param {(x: number, y: number) => boolean} isSolidAt wall test (true outside the map, too)
   * @param {{ width: number, height: number }} world map size in px
   */
  constructor(scene, target, isSolidAt, world) {
    this.scene = scene;
    this.target = target;
    this.isSolidAt = isSolidAt;
    this.world = world;
    /** @type {Set<string>} */
    this.placeholders = new Set(scene.registry.get('placeholders') ?? []);

    for (const type of Object.values(ENEMIES.types)) ensureAnim(scene, type.walk, type.walkFps);

    this.group = scene.physics.add.group({
      classType: Enemy,
      defaultKey: ENEMIES.types.grunt.walk,
      maxSize: ENEMIES.poolSize,
      runChildUpdate: false,
      allowGravity: false,
    });

    const maxHalf = Math.max(...Object.values(ENEMIES.types).map((t) => t.size)) / 2;
    /** Spawn ring radius around the camera view center (px). */
    this.ringRadius = ringRadius(scene.cameras.main, ENEMIES.spawn.margin, maxHalf);

    /**
     * Wave director state. Set `enabled = false` to stop automatic spawning; `capOverride`
     * replaces the wave cap when not null. `wave` is the latest wave values (for the readout).
     */
    this.director = {
      enabled: true,
      acc: 0,
      /** @type {number | null} */
      capOverride: null,
      wave: waveAt(0, ENEMIES.waves),
    };
    /** Set by `freeze()` when the player dies: every enemy stands still from then on. */
    this.frozen = false;

    // Scratch buffers for steering, reused every frame.
    /** @type {Enemy[]} */
    this.live = [];
    this.xs = new Float64Array(ENEMIES.poolSize);
    this.ys = new Float64Array(ENEMIES.poolSize);
    this.pushX = new Float64Array(ENEMIES.poolSize);
    this.pushY = new Float64Array(ENEMIES.poolSize);
  }

  /** Enemies currently in play. */
  get liveCount() {
    return this.group.countActive(true);
  }

  /** Current cap on live enemies. */
  get cap() {
    return this.director.capOverride ?? this.director.wave.cap;
  }

  /**
   * Spawn one enemy of `typeId` at (x, y) from the pool.
   * @param {EnemyTypeId} typeId
   * @param {number} x
   * @param {number} y
   * @returns {Enemy | null} null when every pooled enemy is in play
   */
  spawnAt(typeId, x, y) {
    /** @type {Enemy | null} */
    const enemy = this.group.get(x, y);
    if (!enemy) return null;
    return enemy.spawn(typeId, x, y, this.placeholders);
  }

  /**
   * Spawn one enemy of `typeId` on the ring just outside the camera view, on open floor.
   * @param {EnemyTypeId} typeId
   * @param {() => number} [rand]
   * @returns {Enemy | null} null if no valid point was found or the pool is exhausted
   */
  spawnRing(typeId, rand = Math.random) {
    const type = ENEMIES.types[typeId];
    const view = this.scene.cameras.main.worldView;
    const pt = findSpawnPoint({
      center: { x: view.centerX, y: view.centerY },
      radius: this.ringRadius,
      // Hurtbox center sits below the sprite center (bottom-aligned).
      box: { width: type.hurtbox.width, height: type.hurtbox.height, offsetY: (type.size - type.hurtbox.height) / 2 },
      isSolid: this.isSolidAt,
      worldW: this.world.width,
      worldH: this.world.height,
      attempts: ENEMIES.spawn.attempts,
      rand,
    });
    return pt ? this.spawnAt(typeId, pt.x, pt.y) : null;
  }

  /** Stop spawning and stop every enemy for good (the player died). */
  freeze() {
    this.frozen = true;
    this.director.enabled = false;
    for (const child of this.group.getChildren()) {
      const e = /** @type {Enemy} */ (child);
      if (e.active) e.setVelocity(0, 0);
    }
  }

  /**
   * Run the wave director, recycle far-away enemies, and steer the rest. Call once per frame.
   * @param {number} delta frame time in ms
   * @param {number} survivalMs survival time in ms
   */
  update(delta, survivalMs) {
    this.director.wave = waveAt(survivalMs / 1000, ENEMIES.waves);
    if (this.director.enabled && survivalMs >= ENEMIES.spawn.startDelayMs) this.runDirector(delta);
    this.steer(delta);
  }

  /** @param {number} delta */
  runDirector(delta) {
    const { wave } = this.director;
    const due = spawnsDue(this.director.acc, delta, wave.interval, this.liveCount, this.cap);
    this.director.acc = due.acc;
    for (let i = 0; i < due.spawns; i++) {
      const typeId = /** @type {EnemyTypeId | null} */ (pickType(wave.weights));
      // A skipped spawn (no room on the ring, or pool full) just waits for the next interval.
      if (typeId) this.spawnRing(typeId);
    }
  }

  /** @param {number} delta frame time in ms */
  steer(delta) {
    const { target } = this;
    const recycle2 = ENEMIES.recycleDistance * ENEMIES.recycleDistance;
    const live = this.live;
    live.length = 0;
    for (const child of this.group.getChildren()) {
      const e = /** @type {Enemy} */ (child);
      if (!e.active) continue;
      e.tick(delta);
      const dx = e.x - target.x;
      const dy = e.y - target.y;
      if (dx * dx + dy * dy > recycle2) {
        e.despawn();
        continue;
      }
      this.xs[live.length] = e.x;
      this.ys[live.length] = e.y;
      live.push(e);
    }

    const { radius, strength } = ENEMIES.separation;
    separationPushes(this.xs, this.ys, live.length, radius, this.pushX, this.pushY);
    for (let i = 0; i < live.length; i++) {
      const e = live[i];
      if (this.frozen) {
        e.setVelocity(0, 0);
        continue;
      }
      // Knocked-back enemies keep their push velocity (they still count for separation above).
      if (e.knockMs > 0) continue;
      const v = chaseVelocity(e, target, e.speed, this.pushX[i], this.pushY[i], strength);
      e.setVelocity(v.x, v.y);
      if (Math.abs(v.x) >= FACING_DEAD_ZONE) e.setFlipX(v.x < 0);
    }
  }
}
