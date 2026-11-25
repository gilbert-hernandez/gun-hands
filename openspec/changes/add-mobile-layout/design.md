# Design

## Context

Phaser scales a fixed 960×540 canvas with FIT and centers it in `#game`. `useTouchWording(scene)` already decides touch or desktop wording: the last input mode, else a coarse main pointer.

Read in the Phaser 4.2.1 source:
- Touch start and end outside the canvas reach Phaser through window listeners and fire `pointerdownoutside` / `pointerupoutside`. There is no window `touchmove` listener, and `InputManager.onTouchMove` drops every move whose finger isn't over the canvas, so a bar touch never moves and a canvas touch that slides into a bar freezes.
- Objects are hit-tested for outside touches too, so a DOM overlay alone doesn't shield the buttons under it.
- FIT measures the parent with `getBoundingClientRect()`, which includes the parent's own padding.

## Goals / Non-Goals

**Goals:** one layout switch, no art changes, desktop values untouched.
**Non-Goals:** see the proposal.

## Decisions

**1. Rotate prompt is DOM, shown by CSS.** A `#rotate` element in `index.html` shows under `(orientation: portrait) and (pointer: coarse)`. It is readable however small the canvas is and works before Phaser boots. It stops propagation of its touch and mouse events, so nothing underneath is hit. *Alternative:* a Phaser scene; rejected because the portrait canvas is tiny.

**2. Pausing is polled.** `orientation.js` exposes `isPortraitPhone()` (the same media query). `Game.update()` calls `openPause()` when it is true. The existing guards cover death, LevelUp and an already open menu. It also covers sessions started in portrait, and Esc or a card key pressed behind the prompt, with no listeners to clean up. Cost: at most one frame runs after such a resume. Rotating back never resumes by itself.

**3. Layout is picked once per scene.** `layout.js` has `pickLayout(base, touch)`, pure: `base` merged with its `touch` overrides. Scenes call it in `create()` with `useTouchWording(this)`. A mode change mid-session applies from the next screen or session, so nothing jumps during play. *Alternative:* measuring the canvas scale; rejected because a small desktop window would change.

**4. Sizes** (game px; starting values to tune on the phone). On a 360 CSS px high screen the scale is 0.67, so 20 px reads as about 13 CSS px.

| Element | Desktop | Touch |
|---|---|---|
| Button art | 160×48, 18 px label | scale 1.5 (240×72), 22 px label |
| Pause buttons y | 270 / 334 | 270 / 360 |
| Title hint | 14 px, y 400 | 20 px, y 412 |
| GameOver buttons y | 375 | 475 (below the panel; two 240 px buttons don't fit inside) |
| Cards | 160×220, y 300 | scale 1.5 (240×330), y 340, text 20–24 px |
| LevelUp heading / prompt y | 110 / 150 (14 px) | 60 / 110 (20 px) |
| HUD bar / kills / timer text | 14 / 16 / 22 | 20 / 20 / 26, row gap 12 |
| Powerup icon / text / slot | 16 / 12 / 48 | scale 2 (32) / 20 / 96 |

Text is created at its final size rather than scaled, so it stays sharp. LevelUp's card constants move into `UPGRADES` config. HUD bars keep their size, so fill math is unchanged.

**5. Bar touches.** `barTouches.js` adds one window `touchmove` listener that applies moves off the canvas to the matching active touch pointer (`Pointer.touchmove`), removed on game destroy. Sticks poll their pointers, so no scene event is needed. `PlayerInput` also listens to `pointerdownoutside`, for touches only: browsers send emulated mouse events after a bar tap, and these must not switch the mode. `sideOf` already handles x outside 0–960. *Alternative:* `input.touch.target: #game`; rejected because the window listeners then handle each bar touch a second time.

**6. Drawing bar sticks.** The overlay clamps the drawn center to the canvas; stick math keeps the real origin.

**7. Safe areas.** `viewport-fit=cover`, body height `100dvh` (with `100%` fallback), `box-sizing: border-box`, and `env(safe-area-inset-*)` padding on `body`, not `#game` (see Context). `touch-action: none` on `html`/`body` and `contextmenu` prevented on the page outside the canvas.

## Testing

Unit: `pickLayout` and config checks (touch targets ≥ 64, text ≥ 20, everything on-screen and not overlapping). E2E in a mobile context: portrait pause and resume, bar sticks, sizes, and a desktop check that positions match today's. Insets can't be emulated reliably, so e2e overrides body padding and checks the canvas fits inside; the phone check covers the rest.

## Risks / Trade-offs

- [1.5 scale gives uneven pixels] → phones already scale the canvas by a fraction.
- [Tablets in portrait get the prompt] → accepted for the demo.
- [david's card or button art leaves less text room] → sizes are config; recheck in GH-12.
- [Browser back-swipe starts at the edge of a side bar] → judge on the phone; fullscreen is out of scope.
