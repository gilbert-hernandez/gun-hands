// Level-up upgrade tunables (GH-8). The upgrade rules and the LevelUp screen read these; don't
// hard-code them elsewhere. Each rank changes one per-run player stat by `step`.

/**
 * @typedef {'damage' | 'firerate' | 'multishot' | 'pierce' | 'movespeed' | 'maxhp' | 'pickup'} UpgradeId
 */

/**
 * @typedef {object} UpgradeDef
 * @property {UpgradeId} id stable id (events, tests)
 * @property {string} name card title
 * @property {(step: number) => string} describe what one rank does, for the card
 * @property {number} maxRank ranks available per run
 * @property {number} step stat change per rank
 * @property {string} icon icon image key (asset manifest)
 * @property {number} placeholderTint icon tint used only while the icon is a placeholder
 */

/** @type {UpgradeDef[]} */
const list = [
  {
    id: 'damage',
    name: 'Damage',
    describe: (s) => `+${s} bullet damage`,
    maxRank: 5,
    step: 3,
    icon: 'ui_up_damage',
    placeholderTint: 0xef4444, // red
  },
  {
    id: 'firerate',
    name: 'Fire Rate',
    describe: (s) => `+${s} shots per second`,
    maxRank: 5,
    step: 0.8,
    icon: 'ui_up_firerate',
    placeholderTint: 0xf97316, // orange
  },
  {
    id: 'multishot',
    name: 'Multishot',
    describe: (s) => `+${s} bullet per shot`,
    maxRank: 4,
    step: 1,
    icon: 'ui_up_multishot',
    placeholderTint: 0xfacc15, // yellow
  },
  {
    id: 'pierce',
    name: 'Pierce',
    describe: (s) => `Bullets pass through +${s} enemy`,
    maxRank: 3,
    step: 1,
    icon: 'ui_up_pierce',
    placeholderTint: 0xa855f7, // purple
  },
  {
    id: 'movespeed',
    name: 'Move Speed',
    describe: (s) => `+${s} move speed`,
    maxRank: 4,
    step: 20,
    icon: 'ui_up_movespeed',
    placeholderTint: 0x22d3ee, // cyan
  },
  {
    id: 'maxhp',
    name: 'Max HP',
    describe: (s) => `+${s} max HP and heal ${s}`,
    maxRank: 5,
    step: 20,
    icon: 'ui_up_maxhp',
    placeholderTint: 0x22c55e, // green
  },
  {
    id: 'pickup',
    name: 'Pickup Radius',
    describe: (s) => `+${s} XP pickup radius`,
    maxRank: 4,
    step: 40,
    icon: 'ui_up_pickup',
    placeholderTint: 0x3b82f6, // blue
  },
];

export const UPGRADES = {
  list,
  // Clicks and number keys are ignored this long (ms) after LevelUp opens, so a stray input
  // at the moment it pops up doesn't pick a card.
  inputDelayMs: 250,
  // Multishot also widens the fan (WEAPON.bullet.spreadDeg) by this many degrees per rank.
  spreadStepDeg: 10,
  // Shown alone once every upgrade is at max rank, so level-ups still do something.
  filler: {
    id: /** @type {'patchup'} */ ('patchup'),
    name: 'Patch Up',
    describe: (/** @type {number} */ heal) => `Heal ${heal} HP`,
    heal: 25,
    icon: 'ui_up_maxhp',
    placeholderTint: 0xf87171, // light red
  },
};
