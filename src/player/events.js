// Player events, emitted on the Game scene's event emitter (`scene.events`). Kept apart from
// Player.js so modules without Phaser (the audio wiring, GH-29) can import the names.

/**
 * Emitted once per shot with `{ x, y, angle, blocked }` (gun tip, radians; `blocked` is true when
 * the guns were pushed into a wall, so the shot hit it and no bullets were spawned).
 * @typedef {{ x: number, y: number, angle: number, blocked: boolean }} PlayerFiredEvent
 */
export const PLAYER_FIRED = 'player-fired';
