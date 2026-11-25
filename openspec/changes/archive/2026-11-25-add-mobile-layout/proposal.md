# Proposal

## Why

Vikunja: GH-26. GH-25 made the game playable by touch, but on a landscape phone the 960×540 canvas is drawn at roughly 0.6 scale: 12–14 px text becomes about 8 CSS px, the 48 px buttons are small to tap, thumbs resting in the black side bars do nothing, and portrait gives a tiny game. People will open the 12/6 demo link on phones.

## What Changes

- **Rotate prompt**: on a phone in portrait, play pauses and "Rotate your phone" covers the page. Turning back shows the pause menu, so play continues only when the player taps Resume.
- **Touch layout**: larger text, buttons, cards and HUD on touch devices. Tap targets are at least 64 game px and essential text at least 20 game px.
- **Side bars**: a thumb in the black bars starts and drives a stick like one on the canvas.
- **Safe areas**: the canvas stays clear of notches, rounded corners and browser bars.
- Desktop layout doesn't change.

If time runs short, task group 1 (rotate prompt) ships alone.

## Non-goals

- iPhone/iOS support, fullscreen, orientation lock, PWA or native app.
- A portrait layout, or a wider game view that fills the side bars.
- New or resized art files: existing art is scaled up in code (GH-21, GH-22 and GH-12 aren't affected).
- Enlarging the build version label and the dev-only debug text.

## Capabilities

### New Capabilities

- `mobile-layout`: rotate prompt, touch layout sizes, safe areas and its configuration.

### Modified Capabilities

- `touch-controls`: sticks start in the side bars, stay visible when they do, and gesture blocking covers the bars.

## Impact

- New: `src/ui/layout.js`, `src/input/orientation.js`, `src/input/barTouches.js`, `tests/layout.test.js`, `e2e/mobile.spec.js`.
- Changed: `index.html`, `src/main.js`, `src/input/PlayerInput.js`, `src/ui/{Button,TouchOverlay}.js`, `src/scenes/{Game,UI,LevelUp,Pause,Title,GameOver}Scene.js`, `src/config/{flow,hud,touch,upgrades}.js`, config tests, `e2e/touch.spec.js` where it assumes positions, `e2e/support.js`, `README.md`, `CHANGELOG.md`.
- No new dependencies or assets.
