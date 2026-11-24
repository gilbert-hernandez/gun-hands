# Tasks

## 1. Config and pure logic

- [ ] 1.1 Add `src/config/hud.js` (`HUD` per design §2) and export it from `src/config/index.js`; add `tests/hudConfig.test.js` (every `powerupOrder` id has a `ui_icon_*` key in the manifest; `powerupOrder` is exactly the timed powerups in `POWERUPS`; `powerupWarnMs` is below every timed duration; three slots fit on screen; positive integer sizes and offsets); verify `npm test` passes
- [ ] 1.2 Add `src/hud/rules.js` (`fillWidth`, `activePowerups`, `iconVisible`) and `formatClock` in `src/util/format.js` (design §3) with `tests/hud.test.js` covering the cases in design §7; verify `npm test` passes and `formatTime` tests are unchanged

## 2. HUD scene

- [ ] 2.1 Rewrite `UIScene` (design §1, §4, §5): `snapshot()` from the Game scene (null until ready), HP bar and text, XP bar and `LV n`, `mm:ss` timer, `KILLS n`, all on whole pixels with crop-based fills and change-only text updates, plus placeholder tints; verify `npm run check` passes and in `npm run dev` the HUD shows live HP (dev keys H/J), XP and level (dev key L), timer and kills
- [ ] 2.2 Add the powerup row (3 pooled slots in fixed order, ceil seconds, blink in the warning window, hidden when inactive) and the event feedback (`player-hit` → HP fill flash, `player-leveled` → level pop), with listeners removed on UI shutdown; move the debug scene labels out of the HUD (design §6); verify `npm run check` passes and in `npm run dev` the P key powerups show icons that count down, blink and vanish, H flashes the HP bar, and L pops the level

## 3. Browser tests and recording

- [ ] 3.1 Add `e2e/hud.spec.js` covering every `hud` spec scenario (session-start state, fixed under camera movement, damage/heal/Max HP upgrade/death HP readouts with integer fill widths, XP half-fill and level-up label, `02:07` from a set `survivalMs`, timer frozen while LevelUp is open and stopped at death matching GameOver, kills including a Bomb kill, two powerups in order, ceil countdown and blink and expiry, refresh keeps one icon, Magnet shows none, placeholder icon tint, fresh HUD after death → title → start); verify `npm run e2e` passes three full runs in a row
- [ ] 3.2 Update `scripts/record.js` so the recording lingers on the HUD through damage, a heal, a level-up, and two powerups counting down; verify `npm run record -- videos/gh-10-add-hud.webm 40` writes .webm and .mp4

## 4. Manual verification

- [ ] 4.1 Run `npm run dev`, press Enter, and check in the browser: HUD at session start reads full HP, `LV 1`, `00:00`, `KILLS 0`; HP bar drops and flashes on hits and refills on Health Pack/J; XP bar fills and resets on level-up with the level popping; timer counts `mm:ss`, freezes on LevelUp, stops at death and matches GameOver; kills match; powerup icons appear in Rapid Fire/Spread/Shield order with second countdowns, blink in the last 2 s, and vanish; the LevelUp screen covers the HUD; nothing overlaps the debug labels; at 960×540 (browser zoom 100%, window sized to the canvas) text and bars look sharp; restart gives a fresh HUD; no console errors
