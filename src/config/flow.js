// Game flow tunables (GH-11): the title, pause and GameOver screens. Those scenes read these;
// don't hard-code them elsewhere. Positions are screen pixels at the 960×540 base resolution.

export const FLOW = {
  // Open the pause menu when the game window loses focus during play.
  pauseOnBlur: true,
  // Menu art keys (asset manifest).
  keys: {
    button: 'ui_button',
    logo: 'ui_logo',
    titleBg: 'ui_title_bg',
    gameOverPanel: 'ui_gameover_panel',
  },
  // Menu buttons: scale of the `ui_button` art and label size (px). `touch` blocks here and below
  // override their section on touch devices (GH-26, see ui/layout.js).
  button: { scale: 1, fontSize: 18, touch: { scale: 1.5, fontSize: 22 } },
  title: {
    // From david's GH-22 notes: the logo over the sun (top at 60), Start on the fence line (top at 262).
    logoY: 140,
    startY: 286,
    hintY: 400,
    hintSize: 14,
    hint: 'WASD move · Mouse aim · Esc pause',
    touchHint: 'Left thumb moves · Right thumb aims',
    // Background fill while `ui_title_bg` is a placeholder.
    placeholderFill: 0x111827,
    // Build version label (GH-24), anchored by its bottom-left corner. Dimmer than the hint.
    version: { x: 8, y: 532, fontSize: '12px', color: '#6b7280' },
    touch: { hintY: 412, hintSize: 20 },
  },
  pause: {
    // Esc is ignored this long after the overlay opens (covers a doubled or held keydown).
    inputDelayMs: 200,
    dimAlpha: 0.6,
    titleY: 190,
    resumeY: 270,
    quitY: 334,
    touch: { quitY: 360 },
  },
  gameOver: {
    // All input is ignored this long after the screen appears (keys/clicks held at death).
    inputDelayMs: 600,
    // Bands in david's GH-22 panel (400×300, top at 120): title 16-56, stats 56-214, buttons below 214.
    panelY: 270,
    titleY: 156,
    titleSize: 32,
    statsY: 255,
    buttonsY: 377,
    // Horizontal gap between Restart and Title.
    buttonGap: 24,
    // Two touch buttons don't fit inside the panel, so they go below it.
    touch: { buttonsY: 475 },
  },
  fontFamily: 'monospace',
  // Tints used only while the button art is a placeholder (all three frames look alike then).
  buttonTints: { normal: 0x334155, hover: 0x475569, pressed: 0x1e293b },
  // Tint for the GameOver panel while it is a placeholder.
  panelPlaceholderTint: 0x1f2937,
};
