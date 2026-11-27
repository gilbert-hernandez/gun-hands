# Proposal

## Why

Vikunja: GH-31. The HUD only shows icons for timed powerups (Rapid Fire, Spread Shot, Shield), so `gh_ui_icon_health.png`, `gh_ui_icon_bomb.png` and `gh_ui_icon_magnet.png` are loaded on every boot but never drawn. Gilbert chose option 3 on the ticket: stop loading them, keep the files in the repo. That makes it clear they aren't used and saves three small loads.

## What Changes

- Remove the three `ui_icon_health` / `ui_icon_bomb` / `ui_icon_magnet` entries from the asset manifest (`src/assets/manifest.js`).
- Remove their three rows from the ASSETS.md table. (`tests/manifest.test.js` requires ASSETS.md and the manifest to match exactly.)
- Move the three PNGs from `src/assets/img/` to `art/unused/` with `git mv`, so history is kept.
  - They can't stay in `src/assets/img/`. `src/assets/available.js` globs `./img/*.png` eagerly, so Vite would still bundle them, and the "every PNG has a manifest entry" test (assets spec, "Unknown file is caught") would fail.
  - `art/` is already documented in the README as "optional source/draft art (not loaded by the game)", and ART-LICENSE.md already covers it, so neither file needs to change.
- Add a short note to ASSETS.md next to the GH-21 rows saying the instant-powerup icons were delivered, are kept in `art/unused/`, and aren't loaded (GH-31).
- Add a CHANGELOG `Unreleased` entry under GH-31.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No requirement changes: the hud spec already says instant powerups show no icon, and the assets spec still holds (every PNG in the assets folder has a manifest entry, and ASSETS.md matches the manifest). The change sets `skip_specs: true`.

## Non-goals

- No gameplay or HUD behavior change. Instant powerups keep showing no icon (option 2, a pickup flash, was not chosen).
- The pickup sprites `gh_pickup_health/bomb/magnet.png` stay: they're displayed in the arena.
- The PNGs aren't deleted, and no art is requested from david.
- No release in this change. It ships in the next patch or in v0.3.0.

## Impact

- Code: `src/assets/manifest.js` (3 lines removed).
- Docs: `ASSETS.md` (3 rows removed, 1 note added), `CHANGELOG.md`.
- Files: 3 PNGs moved to `art/unused/`. The `dist/` build gets 3 fewer images.
- Tests: no test changes expected. `manifest.test.js`, `hudConfig.test.js` (it checks only the timed powerups' icons) and the HUD e2e run as they are.
- Design: skipped (`design.md` is optional, and the one decision, where the files go, is recorded above).
