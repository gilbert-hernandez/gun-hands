# Proposal

## Why

Vikunja: GH-10. The UI scene still shows a static placeholder line ("HP 100/100 XP 0 LV 1"). The player can't see how hurt they are, how close the next level is, how long they've survived, or how long a powerup has left. The only live numbers are in the dev-only debug readout. Every system the HUD needs is in place now (combat, XP, upgrades, powerups), along with its events and readable state, so the demo can get a real HUD.

## What Changes

- **HP bar** (top left): a bar frame with a red fill sized to current HP / max HP, and `hp/max` text next to it. It follows damage, heals (Health Pack, dev key J) and Max HP upgrades. The fill flashes briefly on every `player-hit`.
- **XP bar and level** (under the HP bar): a fill sized to XP into the current level / XP needed for the next, with `LV n` next to it. The level label pops briefly on `player-leveled`.
- **Survival timer** (top center) as `mm:ss` (e.g. `02:07`). It counts Game time, so it stops while LevelUp is open and at death.
- **Kill count** (top right), e.g. `KILLS 57`.
- **Active powerups** (a row under the bars): one 16×16 icon per active timed powerup (Rapid Fire, Spread Shot, Shield) with its whole seconds left (`8s`), always in that order. The icon blinks during the last 2 seconds. It disappears on expiry, and a refresh resets its countdown. Instant powerups (Health, Bomb, Magnet) show no icon.
- **Pixel-crisp at 960×540**: every HUD element sits on whole-pixel positions, and bar fills change width in whole pixels, so nothing is smoothed or blurred at the base resolution.
- Uses the existing GH-21 UI kit keys (`ui_bar_frame`, `ui_bar_fill_hp`, `ui_bar_fill_xp`, `ui_icon_*`). While they're placeholders, they get per-element tints (red HP, green XP, each powerup its pickup color), so the HUD reads clearly before david's art arrives.
- The HUD resets with every new session and is gone during GameOver (Combat already stops UI on death).
- Debug scene labels move so they don't overlap the HUD.
- All layout and timing numbers live in a new `HUD` config.

## Non-goals

- Real HUD art and a pixel/bitmap font (GH-21, wired in by GH-12). This uses the manifest keys with placeholders and the monospace font.
- Pause menu, boss bars, damage numbers, minimap, enemy-count or DPS readouts.
- Icons or toasts for instant powerups, or a list of upgrades taken.
- Sound, and HUD animations beyond the hit flash, level pop and powerup blink.
- Changing the GameOver stats screen (GH-11) or its `m:ss` time format.

## Capabilities

### New Capabilities

- `hud`: the in-game overlay. HP bar and text, XP bar and level, survival timer, kill count, active powerup icons with countdowns, their feedback on game events, pixel-crisp layout, placeholder tints, session reset, and configuration.

### Modified Capabilities

None. `project-setup` already requires a HUD overlay on top of the session, and the HUD only reads state and events that `combat`, `xp-leveling`, `upgrades` and `powerups` already provide.

## Impact

- New: `src/config/hud.js` (`HUD`), `src/hud/rules.js` (pure: bar fill width, active powerup list, icon blink, clock text), `tests/hud.test.js`, `tests/hudConfig.test.js`, `e2e/hud.spec.js`.
- Changed: `src/scenes/UIScene.js` (the real HUD), `src/util/format.js` (`formatClock` for `mm:ss`), `src/config/index.js`, `src/scenes/sceneLabel.js` or the label offsets (debug labels clear the HUD), `scripts/record.js`.
- No new dependencies and no manifest or ASSETS.md changes, because every UI kit key already exists.
