// XP events (GH-7), emitted on the Game scene's event emitter (`scene.events`).
// The HUD (GH-10) listens to these.

/**
 * The player's XP changed.
 * @typedef {{ totalXp: number, level: number, xpInto: number, xpNeeded: number }} XpChangedEvent
 */
export const XP_CHANGED = 'xp-changed';

/**
 * The player gained a level (one event per level). Emitted before the `xp-changed` that reports it.
 * @typedef {{ level: number }} PlayerLeveledEvent
 */
export const PLAYER_LEVELED = 'player-leveled';

/**
 * XP gems were collected this frame (GH-29: the pickup sound). Not emitted for XP granted
 * without a pickup (the debug L key).
 * @typedef {{ amount: number }} XpCollectedEvent
 */
export const XP_COLLECTED = 'xp-collected';
