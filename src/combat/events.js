// Combat events (GH-6), emitted on the Game scene's event emitter (`scene.events`).
// The HUD (GH-10), drops (GH-7, GH-9) and the game over screen (GH-11) listen to these.

/**
 * A bullet damaged an enemy. Emitted before `enemy-killed` on a killing hit.
 * @typedef {{ enemy: import('../enemy/Enemy.js').default, typeId: string, damage: number, hpLeft: number, x: number, y: number }} EnemyHitEvent
 */
export const ENEMY_HIT = 'enemy-hit';

/**
 * Any damage to an enemy, by a bullet or a Bomb (GH-13: damage numbers and hit particles). Emitted
 * after `enemy-hit` for bullets and before `enemy-killed` on a killing hit. `enemy-hit` stays
 * bullet-only.
 * @typedef {{ typeId: string, x: number, y: number, damage: number, killed: boolean, source: DamageSource }} EnemyDamagedEvent
 * @typedef {'bullet' | 'bomb'} DamageSource
 */
export const ENEMY_DAMAGED = 'enemy-damaged';

/**
 * An enemy died from damage (not emitted for far-away recycling).
 * @typedef {{ typeId: string, x: number, y: number, kills: number }} EnemyKilledEvent
 */
export const ENEMY_KILLED = 'enemy-killed';

/**
 * The player took damage.
 * @typedef {{ damage: number, hp: number, maxHp: number }} PlayerHitEvent
 */
export const PLAYER_HIT = 'player-hit';

/**
 * The player died (emitted once). GameOver receives the same stats. `killsByType` and
 * `damageTaken` (HP lost per enemy type), `upgrades` (rank per upgrade id) and `powerups` (collected per
 * id) feed the run summary (GH-13); GameOver shows only the first three.
 * @typedef {{ timeMs: number, kills: number, level: number, killsByType: Record<string, number>, damageTaken: Record<string, number>, upgrades?: Record<string, number>, powerups?: Record<string, number> }} RunStats
 */
export const PLAYER_DIED = 'player-died';

/**
 * A bullet hit a wall and was removed (GH-29: the wall tick sound).
 * @typedef {{ x: number, y: number }} BulletWallEvent
 */
export const BULLET_WALL = 'bullet-wall';

/**
 * A live enemy is touching the player but the Shield absorbs it (GH-29: the block sound). Emitted
 * on every physics step the contact lasts, so listeners throttle it. No `player-hit` follows.
 * @typedef {{ typeId: string }} ShieldBlockedEvent
 */
export const SHIELD_BLOCKED = 'shield-blocked';
