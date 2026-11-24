// Upgrade events (GH-8), emitted on the Game scene's event emitter (`scene.events`).
// The HUD (GH-10) can listen to refresh max HP and other stats.

/**
 * An upgrade was chosen on the LevelUp screen and has already been applied. The filler card
 * reports id `patchup` with rank 0.
 * @typedef {{ id: import('./rules.js').ChoiceId, rank: number }} UpgradeChosenEvent
 */
export const UPGRADE_CHOSEN = 'upgrade-chosen';
