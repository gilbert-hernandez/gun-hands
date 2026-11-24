// Powerup events (GH-9), emitted on the Game scene's event emitter (`scene.events`).
// The HUD (GH-10) listens to these.

/**
 * A powerup pickup was collected. `durationMs` is set for timed powerups (also on a refresh).
 * @typedef {{ id: import('../config/powerups.js').PowerupId, durationMs?: number }} PowerupCollectedEvent
 */
export const POWERUP_COLLECTED = 'powerup-collected';

/**
 * A timed powerup ran out.
 * @typedef {{ id: import('../config/powerups.js').TimedPowerupId }} PowerupExpiredEvent
 */
export const POWERUP_EXPIRED = 'powerup-expired';
