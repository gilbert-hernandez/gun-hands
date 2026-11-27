# Tasks

## 1. Stop loading the unused icons

- [ ] 1.1 Remove the `gh_ui_icon_health.png`, `gh_ui_icon_bomb.png` and `gh_ui_icon_magnet.png` entries from `src/assets/manifest.js`, and verify that `grep -rn "icon_health\|icon_bomb\|icon_magnet" src` finds nothing
- [ ] 1.2 `git mv` the three PNGs from `src/assets/img/` to `art/unused/`, and verify that `git status` shows them as renames
- [ ] 1.3 Remove the three rows from the ASSETS.md table and add the GH-31 note (kept in `art/unused/`, not loaded), then verify that `npx vitest run tests/manifest.test.js tests/hudConfig.test.js` passes
- [ ] 1.4 Add a GH-31 entry under `Unreleased` in CHANGELOG.md, and verify `npm run check` passes (lint, format, types, unit tests, build), with 3 fewer `gh_ui_icon_*` images in `dist/`

## 2. Verify

- [ ] 2.1 Run the HUD and asset e2e specs against a fresh dev server on port 5175 (`e2e/hud.spec.js` plus any spec that asserts no placeholders), and verify they pass
- [ ] 2.2 Manual check: run `npm run dev`, open the game, and confirm that no placeholder warning appears in the console, that collecting Rapid Fire / Spread / Shield still shows their HUD icons, and that collecting Health / Bomb / Magnet still shows no icon and causes no errors
