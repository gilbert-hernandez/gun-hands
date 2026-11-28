# Proposal

## Why

The demo plays correctly, but hits feel weightless and nobody has checked the numbers against the demo target. Bullets land with only a white flash and a spark, a Brute dies the same way a Grunt does, and getting hit is easy to miss. The wave, XP and drop numbers are still the first guesses from GH-5 to GH-9. The first playtests (yours and the autoplay bot's, 2026-11-27) show runs lasting 11 minutes or more, with level 10 at about 3.5 minutes. The bot survived to a 15-minute cap with only 19–70 enemies alive, because it kills faster than the director spawns. Pressure stops growing after the last wave keyframe at 6 minutes (140 enemies, one spawn per 300 ms), and enemies never get tougher, so a player who keeps moving can survive for as long as they like.

**Revised target (2026-11-27):** a typical run lasts about 10 minutes. After 10 minutes the enemies get faster and more aggressive every minute, so fewer than 10% of runs pass 12 minutes and 15 minutes is effectively impossible. Enemies also level up with the player: each spawns with slightly more HP and speed the higher the player's level. Pressure keeps climbing past 6 minutes, to far more than 140 enemies on screen. GH-29 added one more item to this pass: tune the SFX levels and throttles. Vikunja: GH-13.

## What Changes

- **Screen shake.** A small shake when the player takes damage (scaled by the damage) and a medium one on Brute kills. The existing Bomb shake is retuned and moves to the same config. Ordinary bullet hits on enemies don't shake, because auto-fire would shake the screen non-stop. Shake is off when the browser reports `prefers-reduced-motion: reduce`.
- **Hit-stop on Brute kills.** Game freezes for about 70 ms: physics, animations, enemy steering, timers and the survival clock all stop. The HUD keeps drawing. Hit-stops don't stack, and a short cooldown means a Bomb that kills five Brutes freezes the game once.
- **Impact particles.** A few small particles burst on each bullet hit, on top of David's impact spark. A larger burst plays on each enemy death, colored per enemy type. They use one Phaser particle emitter with a generated texture, so they need no new art. A particle cap keeps the cost fixed.
- **Damage numbers.** A number rises and fades above an enemy on every bullet or Bomb hit. A killing hit shows in a brighter color. The numbers come from a fixed pool, and a hit that finds the pool empty shows no number. They use a digits-only bitmap font generated at boot, because a Phaser `Text` would re-render a canvas on every hit.
- **Enemies level up with the player.** Each enemy's HP and speed are scaled when it spawns, by the player's level at that moment: about +5% HP and +1% speed per level, with configured caps. Enemies already on the field keep their stats.
- **Overtime after 10:00.** From 10 minutes of survival time, every minute adds speed, HP and contact damage to newly spawned enemies (starting at +12% speed, +15% HP and +20% contact damage per minute, then tuned). The wave keyframes keep tightening through 15 minutes. With overtime and level scaling together, enemies can end up faster than the player, which no longer has to hold for scaled enemies. A base type's speed still does.
- **Overtime cue.** At 10:00 the HUD timer turns red and a short "OVERTIME" banner shows, so the player knows why it's getting harder. This is drawn text with no new art and no new sound.
- **More pressure.** The wave keyframes are extended past 6 minutes: about 180 enemies at 6:00, 260 at 10:00 and 300 from 12:00, with the spawn interval falling to about 120 ms at 10:00 and 50 ms at 15:00. The diagnostic run showed spawn rate, not the cap, was what limited pressure. The enemy pool grows to 320.
- **Balance pass.** Tune the wave keyframes, scaling and overtime rates, enemy HP, speed and damage, the XP curve and gem values, powerup drop chances and upgrade steps. Targets:
  - median run length 9–11 minutes
  - at most 10% of runs past 12:00
  - no run reaching 15:00
  - level 10 or higher by the end of a typical run
- **Playtest tools** (for measuring the balance and performance):
  - `npm run balance`: a Playwright autoplay bot. It kites away from the crowd, aims at the nearest enemy and picks cards by a fixed priority. It plays N full runs in real time and writes each run's time, level, kills, upgrades and damage taken by enemy type to `balance/` (gitignored).
  - In dev builds, every GameOver logs the same run summary to the console and keeps the last 20 summaries in `localStorage`, so your own playtests produce data.
  - Dev keys: `K` fills the arena to a stress count of enemies (300, the top wave cap), and the debug readout shows FPS and the live count of particles and damage numbers.
  - The bot's cap moves to 16 minutes, and the summary table reports how many runs passed 12:00 and whether any reached 15:00.
- **Performance.** The enemy pool grows to 320 so the top wave cap of 300 fits. You check 60 FPS with the stress key (300 enemies) on a mid-range laptop against a production build. If it misses, the fixes are planned in design.md §6 and come in order of cost.
- **SFX mix.** Even out the per-sound volumes from each WAV's measured loudness, then retune the throttles and pitch jitter for the new fire rates. You make the final call by ear. The sounds themselves don't change.

## Non-goals

- New enemy types, weapons, upgrades or powerups. The only new mechanics are enemy scaling and overtime, and both work on existing stats (HP, speed, contact damage). "More aggressive" means faster, tougher, harder-hitting and more numerous. Enemies get no new behaviors such as lunges or ranged attacks.
- New art or new sounds. Particles use a generated texture and the font is generated, so nothing waits on David or on Arcade `/sfx`.
- An options screen or settings for shake or damage numbers. Reduced motion follows the browser setting only.
- Meeting 60 FPS in headless CI (swiftshader runs at about 49 FPS with no enemies). The FPS target is checked by hand on a real laptop.
- Making the bot play like a human. It is a repeatable proxy, and your playtests decide the final numbers.
- Music.

## Capabilities

### New Capabilities

- `game-feel`: screen shake, hit-stop, impact and death particles, damage numbers, the reduced-motion rule, and their config.
- `playtest-tools`: the autoplay balance bot, the dev run-summary log, the stress key, the FPS readout, and the demo run-length target.

### Modified Capabilities

- `powerups`: the Bomb's shake comes from the shared shake config (the Bomb requirement still says "a short camera shake", so its wording doesn't change). Bomb hits also show damage numbers. Both are covered in `game-feel`, so `powerups` gets no delta.
- `enemies`:
  - A base type must still be slower than the player, but a scaled enemy may be faster.
  - New requirements: enemies scale with the player's level, and overtime starts after 10 minutes.
  - The pool still has to hold the largest wave cap; it grows to 320.
- `hud`: the overtime cue (red timer and an "OVERTIME" banner at 10:00).

## Impact

- **New code:**
  - `src/fx/Juice.js` (shake, hit-stop and particles for one session)
  - `src/fx/DamageNumbers.js`
  - `src/fx/digitFont.js` (generated bitmap font)
  - `src/fx/rules.js` (pure shake scaling and hit-stop gating, unit-tested)
  - `src/config/juice.js`
  - `scripts/balance.js` and `scripts/bot.js` (the autoplay bot)
  - `src/util/runLog.js`
  - `src/enemy/scaling.js` (pure stat multipliers for player level and overtime, unit-tested)
- **Touched code:**
  - `GameScene` creates the juice and skips its update while hit-stopped, and gets the `K` key and the FPS readout.
  - `Combat` triggers shake and hit-stop.
  - `Powerups.bomb` uses the shared shake.
  - `BootScene` generates the font.
  - `GameOverScene` writes the run log.
  - `Enemy.spawn` takes scaled stats. Contact damage moves from the type to the enemy instance, which `Combat.onContact` reads.
  - `Enemies` passes the player's level and the survival time into each spawn.
  - `UIScene` gets the overtime cue.
  - Config: `enemies.js` (waves to 15 min, `scaling`, `overtime`, pool 320) and `juice.js` (stress count 300). Tuning touches `xp.js`, `powerups.js`, `upgrades.js` and `audio.js`.
  - `openspec/config.yaml`: the demo target becomes about 10 minutes.
  - The GH-13 acceptance criteria in Vikunja change from 5–8 minutes to the new run-length target.
- **Tests:**
  - unit tests for the juice rules and config ranges
  - unit tests for the scaling and overtime math, and config tests: base speeds below the player, keyframes reaching 15 minutes, pool ≥ the top cap
  - e2e tests: a spawn at level 8 gets scaled stats, a spawn after 10:00 gets overtime stats, and the HUD cue appears at 10:00
  - e2e tests for shake, hit-stop, damage numbers, particles and the stress key, recorded in the page as in earlier changes
  - existing e2e tests that kill Brutes must tolerate the 70 ms freeze
- **Schedule:** GH-13's slot is 12/5 20:00–23:00, which is too short for this scope. Starting now in the 11/27 buffer leaves the 12/3–12/4 buffer days for playtests.
- **Build:** no new dependencies and no new assets.
