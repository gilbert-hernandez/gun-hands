// HUD tunables (GH-10). The UI scene reads these; don't hard-code them elsewhere.
// Positions are in screen pixels at the 960×540 base resolution and must be whole numbers.

/** @type {import('./powerups.js').TimedPowerupId[]} */
const powerupOrder = ['rapidfire', 'spread', 'shield'];

export const HUD = {
  // Distance from the screen edges.
  margin: 12,
  // Vertical gap between the HP bar, the XP bar and the powerup row.
  rowGap: 6,
  // Bar art keys (asset manifest). The fill sits `barInset` px inside the frame.
  barFrame: 'ui_bar_frame',
  hpFill: 'ui_bar_fill_hp',
  xpFill: 'ui_bar_fill_xp',
  barInset: 2,
  // Gap between a bar and its text, and between a powerup icon and its countdown.
  labelGap: 8,
  iconGap: 4,
  fontFamily: 'monospace',
  fontSize: { bar: 14, timer: 22, kills: 16, powerup: 12 },
  colors: { text: '#ffffff', level: '#facc15', shadow: '#000000' },
  // Text drop shadow offset (whole px), so text reads over bright tiles.
  shadowOffset: 1,
  // Tints used only while the bar art is a placeholder. Powerup icons reuse their pickup's tint.
  placeholderTints: { frame: 0x1f2937, hp: 0xef4444, xp: 0x22c55e },
  // Timed powerups shown in the HUD, left to right.
  powerupOrder,
  // Width of one powerup slot (16 px icon + countdown text + spacing).
  powerupSlot: 48,
  // Icons blink for this last part of a timed powerup (ms), with this half-period (ms).
  powerupWarnMs: 2000,
  blinkMs: 120,
  // HP fill flashes white for this long on `player-hit` (ms).
  hitFlashMs: 120,
  // The level label pops to this scale and back on `player-leveled` (ms for the whole pop).
  levelPopMs: 250,
  levelPopScale: 1.4,
};
