# Tasks

## 1. Config and button widget

- [x] 1.1 Add `src/config/flow.js` (`FLOW` per design §6) and export it from `src/config/index.js`; add `tests/flowConfig.test.js` (positive delays, GameOver delay ≥ Pause delay, on-screen and ordered layout Ys, GameOver buttons fit the panel, the four UI keys exist in the manifest); verify `npm test` passes
- [x] 1.2 Add `src/ui/Button.js` (design §2: sheet frames normal/hover/pressed, centered label, act on release over the button only when the press started on it, `buttonState` getter, placeholder state tints); verify `npm run check` passes

## 2. Screens

- [x] 2.1 Rewrite `TitleScene` (design §3): background or dark fill, logo or "GUN HANDS" text for placeholders, Start button, controls hint, Enter/Space start, no start on off-button clicks, `started` guard; verify `npm run check` passes and in `npm run dev` Start, Enter and Space each start a run while a click elsewhere does nothing
- [x] 2.2 Add `PauseScene` and register it after LevelUp in `src/main.js`; add `openPause()`, `pauseOpen`, Esc and the blur listener (when `FLOW.pauseOnBlur`, removed on SHUTDOWN) to `GameScene` (design §1); Resume / Esc resume, Quit to Title stops Game + UI + Pause; verify `npm run check` passes and in `npm run dev` Esc freezes the timer, enemies and powerup countdowns, Esc is ignored on LevelUp and after death, and Quit returns to a title with no HUD
- [x] 2.3 Rewrite `GameOverScene` (design §4): panel, GAME OVER, stats (or "—" without stats), Restart and Title buttons, Enter = Restart, Esc = Title, `ready` after the input delay, `left` guard; verify `npm run check` passes and in `npm run dev` dying (dev key G) then Enter starts a fresh run directly

## 3. Browser tests and recording

- [x] 3.1 Update the e2e specs that leave GameOver with Enter → Title → Enter (`combat`, `hud`, `levelup`, `powerups`, `shooting`) to wait for `GameOver.ready` and restart with Enter, and add `e2e/support.js` `ignoreWindowBlur(page)` to every non-flow spec so focus changes can't pause them; verify the full existing suite passes
- [x] 3.2 Add `e2e/flow.spec.js` covering every `game-flow` scenario (title start by button, Enter and Space, off-button click, placeholder logo text; button hover/pressed/normal frames and drag-off; pause/resume with frozen survival time, Resume button, Esc ignored on LevelUp and after death, blur pauses; Quit mid-run then a clean start; GameOver stats, Restart by button and Enter, Title by button and Esc, input delay; clean session after an upgraded run with Rapid Fire; no build-up of listeners or colliders over three sessions); verify `npm run e2e` passes three full runs in a row
- [x] 3.3 Update `scripts/record.js` (design §7: title → Start click → play → pause ~2 s → resume → death → GameOver → Restart → new run); verify `npm run record -- videos/gh-11-add-game-flow.webm 45` writes .webm and .mp4

## 4. Manual verification

- [x] 4.1 Run `npm run dev` and check in the browser: the title shows the "GUN HANDS" text, Start button and hint, and the button highlights on hover and darkens on press; Start/Enter/Space start a run, a click elsewhere doesn't; Esc shows PAUSED over the HUD with everything frozen (timer, enemies, powerup countdowns), and Esc/Resume continue; alt-tabbing away pauses; Esc does nothing on LevelUp or while dying; Quit to Title leaves no HUD and the next run starts fresh; GameOver shows time, kills and level on the panel and ignores an instant Enter; Restart (button and Enter) starts a clean run (full HP, LV 1, 00:00, KILLS 0, no powerup icons); Title (button and Esc) goes to the title; no console errors
