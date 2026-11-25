# Tasks

## 1. Rotate prompt (shippable alone)

- [ ] 1.1 Add `src/input/orientation.js`, the `#rotate` element and CSS in `index.html`, and its event blocking (design §1); verify in device emulation that it shows only in portrait
- [ ] 1.2 Poll it in `Game.update()` (design §2) and add `e2e/mobile.spec.js` covering pause, return, LevelUp, taps and Esc on the prompt, starting in portrait, and a tall desktop window; verify `npm run check` and the spec pass

## 2. Side bars and safe areas

- [ ] 2.1 Add `src/input/barTouches.js` and `pointerdownoutside` handling (design §5); extend the touch helper to page coordinates and add e2e for both bars, release, cancel, and no mode switch after a bar tap; verify they pass
- [ ] 2.2 Clamp drawn sticks (design §6) with a unit test; verify `npm test`
- [ ] 2.3 Safe-area and gesture CSS (design §7) with e2e for padding, refit and dragging in a bar; verify they pass

## 3. Touch layout

- [ ] 3.1 Add `src/ui/layout.js` and `touch` overrides in config, with `tests/layout.test.js` and config tests (sizes, bounds, overlap); verify `npm test`
- [ ] 3.2 Apply to `Button`, Title, Pause and GameOver, with e2e for sizes and taps; verify they pass
- [ ] 3.3 Apply to LevelUp cards (constants move to config), with e2e; verify they pass
- [ ] 3.4 Apply to the HUD with three powerups active, with e2e; verify they pass and the desktop e2e specs pass unmodified
- [ ] 3.5 Update README and CHANGELOG; verify they describe the rotate prompt and touch layout

## 4. Integration and manual verification

- [ ] 4.1 Verify `npm run check` passes and the full `npm run e2e` passes three times in a row
- [ ] 4.2 Run `npm run dev` on desktop and compare every screen with master: no layout change
- [ ] 4.3 Run `npm run dev -- --host` and play a full run on the Android phone (Chrome, landscape): read all text, tap every button, thumbs in the bars, rotate mid-run and at level-up, notch on either side, browser bar shown and hidden; tune config and note the device on GH-26
