# Tasks

## 1. Rotate prompt (shippable alone)

- [x] 1.1 Add `src/input/orientation.js`, the `#rotate` element and CSS in `index.html`, and its event blocking (design §1); verify in device emulation that it shows only in portrait
- [x] 1.2 Poll it in `Game.update()` (design §2) and add `e2e/mobile.spec.js` covering pause, return, LevelUp, taps and Esc on the prompt, starting in portrait, and a tall desktop window; verify `npm run check` and the spec pass

## 2. Side bars and safe areas

- [x] 2.1 Add `src/input/barTouches.js` and `pointerdownoutside` handling (design §5); extend the touch helper to page coordinates and add e2e for both bars, release, cancel, and no mode switch after a bar tap; verify they pass
- [x] 2.2 Clamp drawn sticks (design §6) with a unit test; verify `npm test`
- [x] 2.3 Safe-area and gesture CSS (design §7) with e2e for padding, refit and dragging in a bar; verify they pass

## 3. Touch layout

- [x] 3.1 Add `src/ui/layout.js` and `touch` overrides in config, with `tests/layout.test.js` and config tests (sizes, bounds, overlap); verify `npm test`
- [x] 3.2 Apply to `Button`, Title, Pause and GameOver, with e2e for sizes and taps; verify they pass
- [x] 3.3 Apply to LevelUp cards (constants move to config), with e2e; verify they pass
- [x] 3.4 Apply to the HUD with three powerups active, with e2e; verify they pass and the desktop e2e specs pass unmodified
- [x] 3.5 Update README and CHANGELOG; verify they describe the rotate prompt and touch layout

## 4. Integration and manual verification

- [x] 4.1 Verify `npm run check` passes and the full `npm run e2e` passes three times in a row, except for the known `shooting.spec.js` "exhausted pool" flake, which also fails on master (GH-27)
- [x] 4.2 Run `npm run dev` on desktop and compare every screen with master: no layout change
- [x] 4.3 Run `npm run dev -- --host` and play a full run on the Android phone (Chrome, landscape): read all text, tap every button, thumbs in the bars, rotate mid-run and at level-up, notch on either side, browser bar shown and hidden; tune config and note the device on GH-26
