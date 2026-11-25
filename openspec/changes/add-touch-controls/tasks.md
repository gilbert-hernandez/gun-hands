# Tasks

## 1. Input core

- [ ] 1.1 Add `src/config/touch.js` (`TOUCH`, design §9), export it, and add `tests/touchConfig.test.js` (positive sizes, dead zone < radius, pause hit area ≥ 64 and on-screen, touch delay ≥ LevelUp delay); verify `npm test`
- [ ] 1.2 Add `src/input/sticks.js` and `velocityFromVector` with `tests/sticks.test.js` (dead zone edge, all directions, knob clamp, sides, zero vector); verify `npm test`
- [ ] 1.3 Add `src/input/PlayerInput.js` with keyboard and mouse only and move `Player` onto it, with no behavior change; verify `npm run check` and the movement and shooting e2e specs pass
- [ ] 1.4 Add sticks, ownership, modes and resets (design §3–5) and `activePointers: 2`; verify `npm run check`

## 2. Screens and page

- [ ] 2.1 Add `src/ui/TouchOverlay.js` to UI: sticks and pause button (design §6); verify in device emulation
- [ ] 2.2 LevelUp touch picks and prompt (design §7), title hint, and `Button` ignoring cancelled touches; verify `npm run check`
- [ ] 2.3 Page gesture blocking in `index.html` (design §8); verify in device emulation that dragging doesn't scroll

## 3. Browser tests and docs

- [ ] 3.1 Add a CDP touch helper to `e2e/support.js` and `e2e/touch.spec.js` covering sticks, ownership, modes and resets
- [ ] 3.2 Cover pause button, level-up taps, held thumb, cancelled touch, hints, and no listener build-up over three sessions
- [ ] 3.3 Verify the full `npm run e2e` passes three times in a row; update README controls and CHANGELOG

## 4. Manual verification

- [ ] 4.1 Run `npm run dev` and check on desktop: WASD, mouse aim, Esc, card keys and clicks behave as before, with no touch UI
- [ ] 4.2 Run `npm run dev -- --host` (or a preview deploy) and play a full run on one iPhone and one Android phone in landscape: move and aim together, level up with thumbs down, pause and resume, switch apps, die and restart; tune `TOUCH` if needed and note the devices on GH-25
