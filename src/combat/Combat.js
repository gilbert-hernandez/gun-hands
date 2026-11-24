import { COMBAT, ENEMIES } from '../config/index.js';
import Puffs from '../fx/Puffs.js';
import { ENEMY_HIT, ENEMY_KILLED, PLAYER_DIED, PLAYER_HIT } from './events.js';

/** @typedef {import('../enemy/Enemy.js').default} Enemy */
/** @typedef {import('../weapon/Bullets.js').Bullet} Bullet */
/** @typedef {import('./events.js').RunStats} RunStats */

/**
 * Combat wiring for one Game session (GH-6): bullet hits on enemies, enemy contact with the
 * player, the kill count, death puffs, the player's death sequence, and the combat events.
 * The rules themselves live in `rules.js`, `Enemy`, and `Player`.
 */
export default class Combat {
  /**
   * @param {import('phaser').Scene} scene the Game scene (events are emitted on `scene.events`)
   * @param {object} parts
   * @param {import('../player/Player.js').default} parts.player
   * @param {import('../weapon/Bullets.js').default} parts.bullets
   * @param {import('../enemy/Enemies.js').default} parts.enemies
   * @param {() => number} parts.survivalMs current survival time in ms
   * @param {() => boolean} [parts.shielded] true while a Shield powerup blocks contact (GH-9)
   */
  constructor(scene, { player, bullets, enemies, survivalMs, shielded = () => false }) {
    this.scene = scene;
    this.shielded = shielded;
    this.player = player;
    this.enemies = enemies;
    this.survivalMs = survivalMs;
    this.kills = 0;
    this.puffs = new Puffs(scene);
    /** @type {RunStats | null} set when the player dies */
    this.stats = null;

    this.bulletHits = scene.physics.add.overlap(
      bullets.group,
      enemies.group,
      (b, e) => this.onBulletHit(/** @type {Bullet} */ (b), /** @type {Enemy} */ (e)),
      (b, e) => this.canBulletHit(/** @type {Bullet} */ (b), /** @type {Enemy} */ (e)),
    );
    this.contacts = scene.physics.add.overlap(
      player,
      enemies.group,
      (_p, e) => this.onContact(/** @type {Enemy} */ (e)),
      (_p, e) => this.canContact(/** @type {Enemy} */ (e)),
    );
  }

  /**
   * Overlap guard: Arcade keeps testing pairs in the same frame after a bullet despawns or an
   * enemy dies, so check both are still in play and this bullet hasn't hit this enemy yet.
   * @param {Bullet} bullet
   * @param {Enemy} enemy
   */
  canBulletHit(bullet, enemy) {
    return bullet.active && enemy.active && !this.player.dead && !bullet.hasHit(enemy);
  }

  /**
   * @param {Bullet} bullet
   * @param {Enemy} enemy
   */
  onBulletHit(bullet, enemy) {
    bullet.markHit(enemy);
    const { damage } = bullet;
    const { x: vx, y: vy } = bullet.body.velocity;
    const { x, y, typeId } = enemy;
    const killed = enemy.takeHit(damage, vx, vy);
    this.scene.events.emit(ENEMY_HIT, { enemy, typeId, damage, hpLeft: enemy.hp, x, y });
    bullet.hit();
    if (killed) this.killEnemy(enemy);
  }

  /**
   * Damage an enemy without a bullet (the Bomb, GH-9): flash and knockback along (dirX, dirY) if it
   * survives, the normal kill path if not. Emits no `enemy-hit` (that event is for bullet hits).
   * @param {Enemy} enemy
   * @param {number} damage
   * @param {number} dirX push direction x (any length; 0,0 = no push)
   * @param {number} dirY push direction y
   * @returns {boolean} true if it died
   */
  damageEnemy(enemy, damage, dirX, dirY) {
    if (!enemy.active) return false;
    const killed = enemy.takeHit(damage, dirX, dirY);
    if (killed) this.killEnemy(enemy);
    return killed;
  }

  /**
   * Remove a dead enemy from play, play its puff, count it, and emit `enemy-killed`.
   * @param {Enemy} enemy
   */
  killEnemy(enemy) {
    const { x, y, typeId } = enemy;
    enemy.despawn();
    this.puffs.play(x, y, ENEMIES.types[typeId].size);
    this.kills += 1;
    this.scene.events.emit(ENEMY_KILLED, { typeId, x, y, kills: this.kills });
  }

  /** @param {Enemy} enemy */
  canContact(enemy) {
    const p = this.player;
    return enemy.active && !p.dead && p.invulnerableMs <= 0 && !this.shielded();
  }

  /** @param {Enemy} enemy */
  onContact(enemy) {
    this.damagePlayer(ENEMIES.types[enemy.typeId].contactDamage);
  }

  /**
   * Damage the player, emit `player-hit`, and start the death sequence at 0 HP.
   * @param {number} amount
   * @param {{ force?: boolean }} [opts] force: ignore invulnerability (dev shortcuts)
   */
  damagePlayer(amount, { force = false } = {}) {
    const p = this.player;
    if (p.dead || (!force && p.invulnerableMs > 0)) return;
    const r = p.takeDamage(amount);
    this.scene.events.emit(PLAYER_HIT, { damage: amount, hp: r.hp, maxHp: p.maxHp });
    if (r.dead) this.playerDied();
  }

  /** The player reached 0 HP: stop everything, emit `player-died` once, then go to GameOver. */
  playerDied() {
    if (this.stats) return;
    const stats = { timeMs: this.survivalMs(), kills: this.kills, level: this.player.level };
    this.stats = stats;
    this.enemies.freeze();
    this.player.die(() => {
      this.scene.time.delayedCall(COMBAT.gameOverDelayMs, () => {
        this.scene.scene.stop('UI');
        this.scene.scene.start('GameOver', stats);
      });
    });
    this.scene.events.emit(PLAYER_DIED, stats);
  }
}
