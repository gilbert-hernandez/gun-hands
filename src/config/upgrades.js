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
  // LevelUp screen layout (GH-8), in screen pixels. Card art is cardWidth×cardHeight times cardScale;
  // the offsets inside a card are from its center (number: from its top-left corner, rank: up from
  // its bottom). `touch` overrides these on touch devices (GH-26, see ui/layout.js).
  layout: {
    titleY: 110,
    promptY: 150,
    promptSize: 14,
    cardWidth: 160,
    cardHeight: 220,
    cardScale: 1,
    cardGap: 24,
    cardY: 300,
    hoverScale: 1.05,
    // Positions fit david's card art (GH-21): the 32 px icon window centers 46 px from the top, the
    // name sits just above the divider (100 px), the text below it, and the rank just above the
    // decorative pips at the bottom (195 px). The number clears the steel corner bolt.
    number: { x: 14, y: 14, size: 20 },
    icon: { y: -64, scale: 1 },
    name: { y: -32, size: 16 },
    text: { y: 4, size: 12 },
    rank: { bottom: 28, size: 14 },
    touch: {
      titleY: 60,
      promptY: 110,
      promptSize: 20,
      cardScale: 1.5,
      cardY: 340,
      // The desktop offsets times cardScale (1.5).
      number: { x: 21, y: 21, size: 24 },
      icon: { y: -96, scale: 1.5 },
      name: { y: -48, size: 24 },
      text: { y: 6, size: 20 },
      rank: { bottom: 42, size: 20 },
    },
  },
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
