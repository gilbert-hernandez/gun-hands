# Proposal

## Why

Vikunja: GH-25. The game can't be played on a phone: moving needs WASD, pausing needs Esc, and aiming follows Phaser's `activePointer`, so a second finger would take the aim over. People will open the 12/6 demo link on phones, so it needs controls that work with touch alone. Twin thumbsticks keep the core of the game, which is moving and aiming independently.

## What Changes

- **Twin floating sticks**: a thumb on the left half of the screen moves, a thumb on the right half aims. Each stick appears where its thumb lands. Guns keep auto-firing; releasing the aim stick keeps the last aim.
- **Movement** at full speed in any direction past a dead zone, so balance matches WASD.
- **Automatic input mode**: a touch in play switches to touch; WASD or a real mouse move/press switches to keyboard and mouse. Desktop controls don't change.
- **Pause button** on the HUD in touch mode.
- **Reset**: sticks let go on pause, level-up, death, focus loss, session end and touch cancel.
- **Safe card picks**: a touch picks a card only when it starts and ends on that card, after a longer input delay. Mouse and number keys don't change.
- **Cancelled touches** never activate a menu button.
- **Touch wording** for the title hint and the LevelUp prompt.
- Page scrolling, zooming, text selection and long-press menus are blocked over the game.
- Tunables live in a new `TOUCH` config.

## Non-goals

- Mobile layout: larger text and cards, touch in the letterbox bars, safe areas, rotate prompt (GH-26).
- Auto-aim, analog speed, remappable or fixed sticks, haptics, gamepads.
- Stick and pause art: they are drawn in code, so GH-21 and GH-12 aren't affected.
- iPhone/iOS support: it can't be tested for now, so it is neither verified nor claimed.
- Native app, PWA, fullscreen or orientation lock.

## Capabilities

### New Capabilities

- `touch-controls`: input mode, sticks, pointer ownership, resets, on-screen display, gesture blocking and configuration.

### Modified Capabilities

- `player-movement`: movement and facing also come from the sticks.
- `player-shooting`: aim comes from the aim stick in touch mode.
- `upgrades`: touch picks are press-and-release with their own delay.
- `game-flow`: on-screen pause button, touch hint, and cancelled touches on buttons.

## Impact

- New: `src/config/touch.js`, `src/input/sticks.js` (pure), `src/input/PlayerInput.js`, `src/ui/TouchOverlay.js`, `tests/sticks.test.js`, `tests/touchConfig.test.js`, `e2e/touch.spec.js`.
- Changed: `src/main.js`, `index.html`, `src/player/Player.js`, `src/player/movement.js`, `src/scenes/{Game,UI,LevelUp,Title}Scene.js`, `src/ui/Button.js`, `src/config/{index,flow,upgrades}.js`, existing tests that use the changed player fields, `e2e/support.js`, `README.md`, `CHANGELOG.md`.
- No new dependencies and no asset changes.
