# Proposal

## Why

The demo plays correctly, but hits feel weightless and nobody has checked the numbers against the demo target. Bullets land with only a white flash and a spark, a Brute dies the same way a Grunt does, and getting hit is easy to miss. The wave, XP and drop numbers are still the first guesses from GH-5 to GH-9, so we don't know whether a typical run lasts 5–8 minutes and reaches level 10. The game also hasn't been checked at the 200+ enemies the ticket asks for: the enemy pool holds 160 and the last wave caps at 140. GH-29 added one more item to this pass: tune the SFX levels and throttles. Vikunja: GH-13.

## What Changes

- **Screen shake.** A small shake when the player takes damage (scaled by the damage) and a medium one on Brute kills. The existing Bomb shake is retuned and moves to the same config. Ordinary bullet hits on enemies don't shake, because auto-fire would shake the screen non-stop. Shake is off when the browser reports `prefers-reduced-motion: reduce`.
- **Hit-stop on Brute kills.** Game freezes for about 70 ms: physics, animations, enemy steering, timers and the survival clock all stop. The HUD keeps drawing. Hit-stops don't stack, and a short cooldown means a Bomb that kills five Brutes freezes the game once.
- **Impact particles.** A few small particles burst on each bullet hit, on top of David's impact spark. A larger burst plays on each enemy death, colored per enemy type. They use one Phaser particle emitter with a generated texture, so they need no new art. A particle cap keeps the cost fixed.
- **Damage numbers.** A number rises and fades above an enemy on every bullet or Bomb hit. A killing hit shows in a brighter color. The numbers come from a fixed pool, and a hit that finds the pool empty shows no number. They use a digits-only bitmap font generated at boot, because a Phaser `Text` would re-render a canvas on every hit.
- **Balance pass.** Tune the wave keyframes, enemy HP, speed and damage, the XP curve and gem values, powerup drop chances and upgrade steps. The targets: a typical run lasts 5–8 minutes and reaches level 10 or higher (283 XP with the current curve). Only numbers in `src/config/` change; no new mechanics.
- **Playtest tools** (for measuring the balance and performance):
  - `npm run balance`: a Playwright autoplay bot. It kites away from the crowd, aims at the nearest enemy and picks cards by a fixed priority. It plays N full runs in real time and writes each run's time, level, kills, upgrades and damage taken by enemy type to `balance/` (gitignored).
  - In dev builds, every GameOver logs the same run summary to the console and keeps the last 20 summaries in `localStorage`, so your own playtests produce data.
  - Dev keys: `K` fills the arena to a stress count of enemies (220 by default), and the debug readout shows FPS and the live count of particles and damage numbers.
- **Performance.** The enemy pool grows to 256 so 200+ enemies can be on screen at once. You check 60 FPS with the stress key on a mid-range laptop against a production build. If it misses, the fixes are planned in design.md §6 and come in order of cost.
- **SFX mix.** Even out the per-sound volumes from each WAV's measured loudness, then retune the throttles and pitch jitter for the new fire rates. You make the final call by ear. The sounds themselves don't change.

## Non-goals

- New enemies, weapons, upgrades, powerups, or any new mechanic. The balance pass changes config numbers only.
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
- `enemies`: none. The pool must still be at least the largest wave cap, and it grows to 256 in config.

## Impact

- **New code:**
  - `src/fx/Juice.js` (shake, hit-stop and particles for one session)
  - `src/fx/DamageNumbers.js`
  - `src/fx/digitFont.js` (generated bitmap font)
  - `src/fx/rules.js` (pure shake scaling and hit-stop gating, unit-tested)
  - `src/config/juice.js`
  - `scripts/balance.js` and `scripts/bot.js` (the autoplay bot)
  - `src/util/runLog.js`
- **Touched code:**
  - `GameScene` creates the juice and skips its update while hit-stopped, and gets the `K` key and the FPS readout.
  - `Combat` triggers shake and hit-stop.
  - `Powerups.bomb` uses the shared shake.
  - `BootScene` generates the font.
  - `GameOverScene` writes the run log.
  - Config numbers change in `enemies.js`, `xp.js`, `powerups.js`, `upgrades.js` and `audio.js`.
- **Tests:**
  - unit tests for the juice rules and config ranges
  - e2e tests for shake, hit-stop, damage numbers, particles and the stress key, recorded in the page as in earlier changes
  - existing e2e tests that kill Brutes must tolerate the 70 ms freeze
- **Schedule:** GH-13's slot is 12/5 20:00–23:00, which is too short for this scope. Starting now in the 11/27 buffer leaves the 12/3–12/4 buffer days for playtests.
- **Build:** no new dependencies and no new assets.
