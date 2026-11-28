# Tasks

## 1. Config and pure rules

- [x] 1.1 Add `src/config/juice.js` (`JUICE`: shake, hitStop, particles with per-type colors, damageNumbers, debug.stressCount, per design §1) and export it from `src/config/index.js`. Move `POWERUPS.bombShakeMs` into `JUICE.shake.bomb`. Add `tests/juiceConfig.test.js` for value ranges, a color for every enemy type, and `ENEMIES.poolSize >= stressCount`. Raise `ENEMIES.poolSize` to 256. Verify `npm test`.
- [x] 1.2 Add `src/fx/rules.js` (`shakeIntensity`, `canHitStop`, `shouldShake`) and `tests/juiceRules.test.js`. Verify `npm test`.

## 2. Shake and hit-stop

- [x] 2.1 Add the `enemy-damaged` event: `Combat.onBulletHit` emits it with source `bullet`, and `Combat.damageEnemy` gains a `source` argument and emits it (the Bomb passes `bomb`). Add a typedef in `combat/events.js`. Track `killsByType` and `damageTakenByType` on Combat for §8. Verify `npm test` and the existing combat/powerups e2e tests.
- [x] 2.2 Add `src/fx/Juice.js` with shake (player-hit, Brute kill, Bomb through `powerup-collected`, `force` for stronger shakes, reduced motion), `settings` copied from `JUICE`, and listener cleanup on `shutdown`. Remove `cam.shake` from `Powerups.bomb`. Create it in `GameScene.create`. Add `e2e/juice.spec.js`, which wraps `cameras.main.shake` and records calls: a player hit shakes with the scaled intensity, a Brute kill and a Bomb shake, a Grunt hit doesn't, and `page.emulateMedia({ reducedMotion: 'reduce' })` disables all of it.
- [x] 2.3 Add hit-stop (`Juice.hitStop`, `GameScene.hitStopMs` early return, physics, anims, tweens and time paused and restored, cooldown, no hit-stop after player death). Set `juice.settings.hitStop.ms = 0` in existing e2e tests that kill Brutes, if any of them fail because of it (none did: combat, powerups, audio, xp and hud all passed unchanged). Extend `e2e/juice.spec.js`: a Brute kill holds `survivalMs` and enemy positions for the window and then resumes; a Bomb on 3 Brutes produces one hit-stop; Esc during a hit-stop resumes cleanly. Run `npx playwright test e2e/juice.spec.js` 3 runs in a row.

## 3. Particles and damage numbers

- [x] 3.1 Generate `fx_dot` in `BootScene`, then add the particle emitter to `Juice`: a hit burst on `enemy-damaged` with source `bullet`, and a tinted death burst on `enemy-killed`, with `maxParticles`. Extend e2e: the bursts are called with the right counts and tint, and a Bomb in a crowd of 100 stays at or under max with no page errors.
- [x] 3.2 Add `src/fx/digitFont.js` (canvas digits → `RetroFont` bitmap font `gh_digits`, generated in `BootScene`; use the manual `cache.bitmapFont` fallback if Parse fails) and `src/fx/DamageNumbers.js` (pool, tween, kill color, rounding). Wire it from `Juice` on `enemy-damaged`. Extend e2e: a hit shows the rounded number, a kill uses the kill color, numbers return to the pool, and a full pool shows nothing new without error.

## 4. Playtest tools

- [x] 4.1 Add `src/util/runLog.js` (summary builder plus a try/catch `localStorage` ring of 20) with `tests/runLog.test.js` (shape, ring cap, storage that throws). Extend `RunStats` and log from `GameOverScene` in dev builds. E2E: a debug-G death puts one entry in `gunhands.runs`.
- [x] 4.2 Add the dev `K` stress key (capOverride toggle and ring fill) and the FPS, particle and number counts in the debug readout. E2E: `K` reaches 200+ alive with no page errors, and a second `K` restores the wave cap.
- [x] 4.3 Add `scripts/bot.js` and `scripts/balance.js` (design §7), the `npm run balance` script, and `balance/` in `.gitignore`. Add `scripts/` entries to eslint if needed. Smoke test: `npm run balance -- 1` against a fresh server on 5175 finishes and writes a summary.

## 5. Enemy scaling, overtime and more pressure (added 2026-11-27)

- [x] 5.1 Add `src/enemy/scaling.js` (`spawnMultipliers(level, survivalS, cfg)`, design §10) with `tests/scaling.test.js`: level 1 and 9:59 give 1×; per-level growth; each bonus cap; overtime at 10:00, 12:00 and 15:00; both factors multiply. Add `ENEMIES.scaling` (`perLevel`, `maxLevelBonus`, `overtime`) to `src/config/enemies.js`. Extend `tests/enemiesConfig.test.js`: base speeds still below the player, a Runner at level 10 and 15:00 faster than `PLAYER.speed`, and the config ranges. Verify `npm test`.
- [x] 5.2 Apply the multipliers at spawn: `Enemies` gets the player and survival time, `Enemy.spawn(..., mult)` sets `maxHp`, `speed` and a new `contactDamage` (rounded), and `Combat.onContact` reads `enemy.contactDamage`. Extend `e2e/enemies.spec.js`: a spawn at player level 9 has scaled HP and speed; a spawn with `survivalMs` set past 12:00 has overtime stats; an enemy already alive keeps its stats when the player levels up. Extend `e2e/combat.spec.js` for the scaled contact damage. Run the enemies, combat and xp specs.
- [x] 5.3 Extend the wave keyframes to 15:00 (design §10 table). Raise `ENEMIES.poolSize` to 320 and `JUICE.debug.stressCount` to 300. Update `tests/enemiesConfig.test.js` (last keyframe ≥ 15:00) and `tests/juiceConfig.test.js`. Verify `npm test` and `e2e/playtest.spec.js` (K now fills to 300).
- [x] 5.4 Overtime cue: add `HUD.overtime` (color, banner text, timings) to `src/config/hud.js`. `UIScene` turns the timer red and plays the banner once when survival time passes `ENEMIES.scaling.overtime.startS`. Extend `e2e/hud.spec.js`: before 10:00, normal color and no banner; after it, red and one banner; a restart is fresh. Run the hud spec.

## 6. Balance and mix

- [x] 6.1 Baseline: `npm run balance -- 5` on today's numbers (done with 1 run: it hit the 12 min cap, so more runs would only have hit it too). Start the Balance log table at the end of design.md with the median and range.
- [x] 6.2 Gilbert plays 3 runs and pastes the summaries from `localStorage` / the console. Record them in the log, along with the bot calibration offset.
- [x] 6.3 Bot fixes: guard the state probe once Game has shut down, default `MAX_MINUTES` to 16, print the counts past 12:00 and at 15:00, and keep the per-minute heartbeat. Smoke test with `npm run balance -- 1`.
- [x] 6.4 Tuning rounds (each about an hour: one knob group, `npm run balance -- 5`, logged), in the knob order of design §7 (XP curve, then waves, scaling and overtime, then damage, HP, drops, upgrade steps). Continue until the bot median is 10:00–12:00 (9:00–11:00 before round 5) with no capped run. Then run the 10-run final check: at most 1 run past 12:00, none at 15:00, median level ≥ 10. Re-run `npm run check` and the e2e suite after the last round, and fix any test that hard-codes an old number so it reads config. Done 2026-11-27 after rounds 1–5: Gilbert kept the first 10 minutes from round 1, round 2 failed the clock targets, and rounds 3–5 steepened overtime only (design §10 and the balance log).
- [x] 6.5 Gilbert confirms the feel with 3 playtests (the bot carries the clock targets). Record them in the log. Done 2026-11-27: 10:24 / 12:38 / 16:06, "a good feel".
- [x] 6.7 Final check: `npm run balance -- 10` on the shipped numbers (median 10:00–12:00, at most 1 past 12:00, none at 15:00, median level ≥ 10). Record it in the log. If it misses, run another tuning round (6.4) and repeat. Done 2026-11-27 (round 5): median 10:52 / level 11, 0 of 10 past 12:00, none at 15:00.
- [x] 6.6 Add `scripts/loudness.js` and set the initial SFX volumes and throttles (design §9, done 2026-11-27), then Gilbert's by-ear pass. Update `tests/audioConfig.test.js` only if ranges change. Record the final values in the log. Done 2026-11-27: Gilbert's by-ear pass found nothing to change, so the measured starting volumes ship.

## 7. Performance and wrap-up

- [x] 7.1 Gilbert runs the stress check on a mid-range laptop (`NODE_ENV=development npx vite build --mode development && npx vite preview`, `K` for 300 enemies, fire for 60 s). If it reads below 58 FPS, apply design §6 mitigations one at a time and re-measure. Record the result in the log. Done 2026-11-27 on Gilbert's desktop (i5-11400, RTX 4060, Firefox): lowest 60 FPS with 300 enemies. The mid-range laptop check is deferred until there are users (Gilbert's call).
- [ ] 7.2 Run the full suite: `npm run check`, `npx vite build`, `npm run e2e` against a fresh server on 5175 with no SplatAttack run in parallel.
- [x] 7.3 Manual check in the browser (`npm run dev`): Done 2026-11-27: all checks passed (Gilbert).
  - Hits show rising numbers and small sparks.
  - Getting hit shakes a little.
  - A Brute kill freezes briefly, shakes and bursts purple.
  - A Bomb shakes once and freezes once.
  - With OS reduced motion on, nothing shakes.
  - Esc and LevelUp during a hit-stop resume cleanly.
  - The mix sounds balanced with nothing clipping.
  - At 10:00 the timer turns red and OVERTIME shows once; after that, enemies are visibly faster and the screen fills up.
