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
  title: {
    logoY: 170,
    startY: 330,
    hintY: 400,
    hint: 'WASD move · Mouse aim · Esc pause',
    touchHint: 'Left thumb moves · Right thumb aims',
    // Background fill while `ui_title_bg` is a placeholder.
    placeholderFill: 0x111827,
    // Build version label (GH-24), anchored by its bottom-left corner. Dimmer than the hint.
    version: { x: 8, y: 532, fontSize: '12px', color: '#6b7280' },
  },
  pause: {
    // Esc is ignored this long after the overlay opens (covers a doubled or held keydown).
    inputDelayMs: 200,
    dimAlpha: 0.6,
    titleY: 190,
    resumeY: 270,
    quitY: 334,
  },
  gameOver: {
    // All input is ignored this long after the screen appears (keys/clicks held at death).
    inputDelayMs: 600,
    panelY: 270,
    titleY: 165,
    statsY: 245,
    buttonsY: 375,
    // Horizontal gap between Restart and Title.
    buttonGap: 24,
  },
  fontFamily: 'monospace',
  // Tints used only while the button art is a placeholder (all three frames look alike then).
  buttonTints: { normal: 0x334155, hover: 0x475569, pressed: 0x1e293b },
  // Tint for the GameOver panel while it is a placeholder.
  panelPlaceholderTint: 0x1f2937,
};
