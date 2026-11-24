// Combat events (GH-6), emitted on the Game scene's event emitter (`scene.events`).
// The HUD (GH-10), drops (GH-7, GH-9) and the game over screen (GH-11) listen to these.

/**
 * A bullet damaged an enemy. Emitted before `enemy-killed` on a killing hit.
 * @typedef {{ enemy: import('../enemy/Enemy.js').default, typeId: string, damage: number, hpLeft: number, x: number, y: number }} EnemyHitEvent
 */
export const ENEMY_HIT = 'enemy-hit';

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
 * The player died (emitted once). GameOver receives the same stats.
 * @typedef {{ timeMs: number, kills: number, level: number }} RunStats
 */
export const PLAYER_DIED = 'player-died';
