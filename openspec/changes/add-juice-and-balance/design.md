# Design

## Context

Feedback the game already has: the enemy hit flash (`COMBAT.hitFlashMs`), knockback, David's impact spark (`FxPool`, 24 at once), death animations (`FxPool`, 32), the muzzle flash, the level-up burst, and a 200 ms Bomb shake (`POWERUPS.bombShakeMs`). Every tunable lives in `src/config/`. Phaser can't run under Vitest, so pure logic goes in Phaser-free modules and the scene wiring is tested with Playwright, which records calls in the page. Headless swiftshader runs at about 49 FPS and stalls under parallel workers, so e2e tests assert on recorded calls and state, never on timing or frame rate.

## Goals / Non-Goals

**Goals:**
- Hits, kills and damage read clearly at a glance.
- Runs last about 10 minutes, with a sharp, visible end game after 10:00 (revised 2026-11-27), backed by reproducible evidence.
- A way to put 300 enemies on screen and read the FPS.
- A balanced SFX mix.

**Non-goals:** see proposal.md.

## Decisions

### 1. One `JUICE` config and one `Juice` object per session

`src/config/juice.js` holds every number in this section:

- `shake`: `playerHit {ms, intensityPerDamage, maxIntensity}`, `bruteKill {ms, intensity}`, `bomb {ms, intensity}`
- `hitStop {ms, cooldownMs}`
- `particles {hit {count, speed, lifespanMs}, death {count, speed, lifespanMs, colors per type}, max}`
- `damageNumbers {poolSize, risePx, durationMs, color, killColor, fontSize}`

`POWERUPS.bombShakeMs` moves into it. `src/fx/Juice.js` is created in `GameScene.create` after `Combat`, listens to the existing events (`player-hit`, `enemy-hit`, `enemy-killed`, `powerup-collected` for `bomb`) and removes its listeners on `shutdown`, the same pattern as `GameAudio`. Combat and Powerups stay unaware of juice, except that the Bomb no longer calls `cam.shake` itself. Instead Juice reacts to `powerup-collected {id: 'bomb'}`.

Bomb hits don't emit `enemy-hit`, by design (GH-9). For Bomb damage numbers, `Combat.damageEnemy` gains an optional `source` and emits a new `enemy-damaged {x, y, damage, killed, source}` for both bullet and Bomb hits. `enemy-hit` keeps its meaning, so audio and its tests don't change. `enemy-damaged` is the only new event.

*Alternative considered:* calling juice directly from Combat. That ties visuals to rules, and the event-listener pattern already works for audio.

### 2. Shake

`shakeIntensity(kind, damage)` in `src/fx/rules.js` is pure: player-hit intensity = `min(maxIntensity, damage × intensityPerDamage)`. Juice calls `cam.shake(ms, intensity, force=false)`. Phaser ignores a new shake while one is running unless `force` is true, so a stronger shake (Brute kill, Bomb) passes `force` and a weaker one doesn't. That way a weak shake never cuts off a strong one. Reduced motion: `window.matchMedia('(prefers-reduced-motion: reduce)')` is read once per session, and when it matches, Juice skips every shake. Shake works on the camera only, never on the player or physics, so it can't change gameplay.

### 3. Hit-stop

`Juice.hitStop()` runs only if `canHitStop(nowMs, lastMs, cooldownMs)` (pure) allows it. It then does three things:

- sets `scene.hitStopMs = JUICE.hitStop.ms`
- pauses the physics world
- sets `scene.anims` and `scene.tweens` time scale to 0 (scene-local; it never touches the global `game.anims` manager, so the UI scene is unaffected)

`GameScene.update` counts `hitStopMs` down with the raw `delta`, and while it is above 0 it returns early: no survival time, no player, enemy, XP or powerup updates. When it reaches 0 the scene resumes physics and restores the time scales. Scene timers (`time.delayedCall`) are paused too, by setting `scene.time.paused` for the same window, so the GameOver delay and similar timers keep their meaning.

Hit-stop triggers only on Brute kills. If the killing blow is also the player's death frame, it is skipped (the player death sequence owns the freeze).

Edge cases:
- Esc or blur during a hit-stop: Pause pauses the whole scene. When it resumes, the remaining `hitStopMs` finishes normally.
- LevelUp opening on the same frame: also a scene pause, handled the same way.

*Risk:* e2e tests that kill Brutes and then wait on `game.loop.time` could be off by 70 ms. Mitigation: Juice copies `JUICE` into `juice.settings` at session start (like `player.weapon`), so those tests set `scene.juice.settings.hitStop.ms = 0` in the page. One new e2e test covers hit-stop itself.

### 4. Particles

One `ParticleEmitter` per session (Phaser 4 `scene.add.particles(0, 0, 'fx_dot', {...emitting: false})`). `fx_dot` is a 3×3 white square generated in `BootScene`. On a bullet hit: `emitter.explode(hit.count, x, y)` with a short lifespan. On an enemy death: `explode(death.count, x, y)` with `tint` set to the type's color. `maxParticles = JUICE.particles.max`, and Phaser skips particles past the cap. Depth sits between the death animations (0.75) and the sparks (0.8).

### 5. Damage numbers

- **Font.** `digitFont.js` draws `0123456789` on a canvas at boot (monospace, bold, 1 px dark outline) and registers it with `Phaser.GameObjects.RetroFont.Parse` as bitmap font `gh_digits`. Bitmap text then costs no canvas redraw per hit.
- **Pool.** `DamageNumbers` holds `poolSize` (48) `BitmapText` objects. `show(x, y, damage, killed)` takes a free one and sets its text, position and tint (`killColor` when the hit killed). One tween per number moves it up `risePx` while its alpha goes from 1 to 0 over `durationMs`. When the tween ends, the number goes back to the pool. With no free number, `show` returns null and nothing is drawn.
- **Decimals.** Damage is always shown rounded.

*Fallback:* if `RetroFont.Parse` misbehaves in Phaser 4.2.1, generate the font data by hand (`cache.bitmapFont.add` with per-character frames). Either way, the decision is a generated font plus `BitmapText`.

### 6. Performance at 300 enemies

- **Pool.** `ENEMIES.poolSize` goes from 160 to 320 (256 in the first commit), and the steering scratch buffers follow it. The top wave cap is 300 (§10), so real end-game runs put 200+ enemies on screen.
- **Stress key.** `K` (dev only) sets `director.capOverride = JUICE.debug.stressCount` (300, the top wave cap) and spawns on the ring, up to 40 per frame, until that many are alive. Contact damage is off while it runs (`combat.godMode`). Pressing it again clears both.
- **Readout.** The debug line adds `fps ${game.loop.actualFps.toFixed(0)}`, plus the live particle and damage-number counts.
- **Measuring.** Run `npx vite build --mode development` (the dev keys need it) and serve it with `npx vite preview`. On a mid-range laptop: press `K` and fire continuously for 60 s. FPS must stay at 58 or above, apart from the moment the stress spawn happens.
- **If it misses, in order of cost:**
  1. Lower `particles.max` and `damageNumbers.poolSize`.
  2. Skip the death animation once more than N are playing (already pooled at 32).
  3. Throttle `separationPushes` to every other frame for enemies outside the camera view.
  4. Turn off `body.onWorldBounds` and collider work for enemies that are knocked back.

  Each step gets measured before the next one is tried.

### 7. Balance method

- **Targets** (revised 2026-11-27, replacing 5–8 minutes; the ticket's acceptance criteria change to match):
  - median run 9:00–11:00
  - at most 10% of runs past 12:00 (in a 10-run bot round, at most 1)
  - no run reaching 15:00 (the bot cap is 16 minutes, so a capped run fails the round)
  - a typical run reaches level 10 or higher
- **Bot** (`scripts/bot.js`, run by `scripts/balance.js`). It drives the real game in headless Chromium at real time:
  - Each tick (100 ms), it reads enemy positions through `__GAME__`.
  - It moves along the sum of "away from enemies within 220 px, weighted by 1/d", plus a tangential term so it circles instead of backing into corners, plus wall avoidance from `arena.isSolidAt` probes 48 px ahead. The direction maps to WASD.
  - It aims at the nearest enemy and picks the first available card by the priority `damage > firerate > multishot > maxhp > pierce > movespeed > pickup`.
  - At GameOver it writes the summary (§8) to `balance/<timestamp>-<n>.json` and prints a table: median, min and max time and level.
  - `npm run balance -- 3` runs 3 games one after another (parallel runs stall swiftshader). The URL comes from `URL=`, default 5175, the fresh-server convention.
  - Each run is capped at `MAX_MINUTES` (default 16). Every minute it logs game time, HP, live enemies and active scenes, so a stall shows. The table adds the count of runs past 12:00 and of runs that reached 15:00.
  - Runs now last about 10 minutes of real time each, so a 5-run round takes about an hour. The final check is 10 runs.
- **Calibration.** The bot is a proxy. Gilbert plays 3 runs on the same numbers and the summaries (§8) are compared. If the bot runs consistently longer or shorter than Gilbert, the bot's target band moves by that offset. The bot never changes to fit.
- **Knobs, in order of preference** (the least surprising to the feel first):
  1. XP curve and gem values (level-10 timing)
  2. wave keyframes (how fast the pressure ramps), level scaling and overtime rates (§10)
  3. contact damage
  4. enemy HP
  5. powerup drop chances, Health Pack heal
  6. upgrade steps

  Every round goes into a "Balance log" table appended to this design file: the change, the bot median, Gilbert's runs. That gives a record of why the shipped numbers are what they are.
- **First estimate.** Superseded by the Balance log: level 10 came at about 3.5 minutes, and runs lasted 11 minutes or more.

### 10. Enemy scaling and overtime

Added 2026-11-27 for the 10-minute target. A player who keeps moving and kills fast can outlast flat difficulty forever, and the diagnostic bot run showed only 19–70 enemies alive at once. So difficulty has to grow with the player and keep growing with time.

- **Pure math** in `src/enemy/scaling.js`:
  - `spawnMultipliers(level, survivalS, cfg)` returns `{ hp, speed, damage }`, the product of a level factor and an overtime factor.
  - Level factor: `1 + perLevel.x · (level − 1)`, each capped at `1 + maxLevelBonus.x`.
  - Overtime factor: `1 + perMinute.x · max(0, survivalS − startS) / 60`, continuous and uncapped. Uncapped is what makes 15 minutes effectively impossible.
  - Unit tests cover level 1 (no change), the caps, overtime at exactly 10:00 (no change yet), 12:00 and 15:00.
- **Starting config** (`ENEMIES.scaling`, then tuned in rounds):
  - `perLevel { hp: 0.05, speed: 0.01, damage: 0 }`, `maxLevelBonus { hp: 1.0, speed: 0.15, damage: 0 }`
  - `overtime { startS: 600, perMinute { hp: 0.15, speed: 0.12, damage: 0.2 } }`
  - At level 14 and 15:00, a Runner moves at 130 × 1.13 × 1.6 ≈ 235 px/s (more than the base player's 200, less than a fully upgraded 280) and hits for 6 × 2 = 12. A Grunt has 30 × 1.65 × 1.75 ≈ 87 HP. Most of the pressure comes from the swarm (below), not single enemies.
- **Applied at spawn.** `Enemies.spawnAt` computes the multipliers from `player.level` and the survival time it is given, and `Enemy.spawn(typeId, x, y, placeholders, mult)` sets `maxHp = round(type.hp × hp)`, `speed = type.speed × speed` and `contactDamage = round(type.contactDamage × damage)`. `Combat.onContact` reads `enemy.contactDamage` instead of the type's. Enemies already alive keep their stats. Recycling means the field turns over in well under a minute in the end game anyway.
- **More pressure.** The wave keyframes go on to 15:00, keeping the rules (interval never grows, cap never shrinks):

  | Time | Interval | Cap | Mix (grunt / runner / brute) |
  | --- | --- | --- | --- |
  | 0:00 | 1400 ms | 12 | 1 / 0 / 0 |
  | 0:30 | 1100 ms | 20 | 1 / 0 / 0 |
  | 0:45 | 1000 ms | 25 | 0.8 / 0.2 / 0 |
  | 2:00 | 600 ms | 60 | 0.6 / 0.3 / 0.1 |
  | 4:00 | 350 ms | 120 | 0.5 / 0.3 / 0.2 |
  | 6:00 | 220 ms | 180 | 0.45 / 0.3 / 0.25 |
  | 8:00 | 160 ms | 220 | 0.45 / 0.3 / 0.25 |
  | 10:00 | 120 ms | 260 | 0.4 / 0.35 / 0.25 |
  | 12:00 | 80 ms | 300 | 0.35 / 0.4 / 0.25 |
  | 15:00 | 50 ms | 300 | 0.3 / 0.45 / 0.25 |

  Runners gain share in overtime because they are the type that catches a kiting player. The pool is 320, and the stress count is 300.
- **Specs.** A base type must still be slower than the player (the config test stays). A scaled enemy may be faster, and the enemies spec says so.

### 11. Overtime cue

At 10:00 survival time (`ENEMIES.scaling.overtime.startS`), the HUD timer text turns red (`HUD.overtime.color`) and an "OVERTIME" banner fades in under the timer, holds for about 2 s and fades out. It is shown once per run and drawn as Phaser text in the HUD's font, so it needs no art and no sound. The HUD reads survival time through `snapshot()` as before. The banner is a tween on a text object that `UIScene` creates once.

### 8. Run summary

`src/util/runLog.js` (pure plus a `localStorage` wrapper with try/catch, like `audio/storage.js`). The summary contains:

- `{ version, timeMs, level, kills, killsByType, upgrades: {id: rank}, damageTaken: {grunt, runner, brute}, powerups: {id: count}, endedAt }`
- `Combat` tracks `damageTakenByType` and `killsByType`. Run stats (`RunStats`) gain those fields, and the GameOver screen ignores them.
- Dev builds only: `GameOverScene.create` logs it with `console.info('[run]', json)` and appends it to `gunhands.runs` (keeping the last 20).
- The bot reads the same object from `scene.get('GameOver')` data, so the bot and humans report identical fields.

### 9. SFX mix

`scripts/loudness.js` (dev-only, not shipped) reads each WAV in `src/assets/sfx/` and prints its RMS and peak in dBFS. Initial `volume` per slug = `10^((targetDb - rmsDb)/20)`, clamped to `[0.2, 1]`. The target depends on the role:

| Role | Slugs | Target |
| --- | --- | --- |
| Frequent | shoot, enemy-hit, xp-pickup, bullet-wall | −24 dB |
| Events | deaths, pickups | −18 dB |
| Big moments | level-up, bomb, player-die, game-over | −14 dB |

`shoot.minIntervalMs` follows the highest reachable fire rate (base 4 + 5×0.8 = 8/s, ×2 with Rapid Fire = 16/s → 62 ms), so it stays about 60 ms but `maxVoices` drops to 3. Gilbert auditions in the dev server and adjusts. The final values are recorded in the Balance log.

## Risks / Trade-offs

- **Hit-stop interacting with pause and LevelUp.** Mitigated by counting on raw `delta` inside `update` (a paused scene doesn't run `update`) and by the e2e test in tasks 3.x.
- **Damage numbers cluttering a crowded screen.** Pool cap of 48 and short duration (450 ms). If it's still noisy, `minDamageShown` or a per-enemy merge can come later. Not planned now.
- **Bot not like a human.** Calibrated against Gilbert's runs (§7).
- **Rebalancing breaks e2e tests that assume today's numbers** (e.g. a Grunt dies in 3 hits). Those tests already read config values, so changed numbers flow through. Any test with a hard-coded number gets fixed to read config.
- **300 enemies on a laptop.** The stress check (§6) now runs at 300. If FPS misses, the §6 mitigations come first. Only after them would the top cap drop toward 260, and that goes in the Balance log.
- **Uncapped overtime.** An infinite ramp could, in theory, grow numbers past sane values in a very long run. In practice the player dies first. HP and damage are rounded, so floats can't creep in.
- **Scope vs schedule.** This is more than the 3-hour ticket slot. The juice parts (tasks 2–4) don't depend on balance, so they can land first. The balance rounds need playtime and can spread over the buffer days.

## Open Questions

- Resolved 2026-11-27: the late-game cap goes to 300 (§10).
- Should the overtime cue also play a sound? Proposed: no, because GH-28's pack has no fitting sound. `level-up` could be reused if Gilbert wants one.
- Should the run log ship in production (anonymous, local only)? Proposed: dev builds only.

## Balance log

Each row is one tuning round: what changed, the bot's result (`npm run balance -- 5`: median time and level, with min–max), and Gilbert's playtests on the same numbers. The calibration offset is Gilbert's median minus the bot's.

| # | Date | Change | Bot median (min–max) | Gilbert's runs | Notes |
| --- | --- | --- | --- | --- | --- |
| 0 | 11-27 | Baseline: shipped v0.2.3 numbers | 11:17+, level 32, 1 run, hit the 12 min cap (20 damage taken) | 11:52 / L33, 7:49 / L26, 11:06 / L32 (median 11:06 / L32) | Calibration offset: the bot levels like Gilbert and lives at least as long. Offset taken as 0 for now; revisit once the bot dies on its own. |

**Baseline findings (round 0):**
- **Runs are too long:** median 11 min against a 5–8 min target.
- **Levelling is far too fast:** level 10 comes at about 3.5 min, and every upgrade is maxed (rank total 30) by about level 31.
- **XP rate:** Gilbert's runs fit XP(t) ≈ 0.28 · t^1.5 (t in seconds). That works out to 2,892 XP by 7:49 and 5,134 by 11:52.
- **Loot is too common:** 59–84 powerups per long run, 11–14 of them Health Packs (330–420 HP healed). Most come from Brutes (25% drop chance, and 260–290 Brutes per run).
- **Damage taken is low:** 290–400 HP per run, mostly Grunt contact.

**Round 1 (XP curve) diagnostic, 2026-11-27:**
- The 5-run round stopped after run 1, which hit the 15-minute cap; the bot's cap handling then failed (fixed since).
- A single diagnostic run with heartbeats showed no stall: the bot survived to the cap, its HP only rose (80 → 180), and it reached level 10 at 7:16 and level 14 at 11:02.
- Only 19–70 enemies were alive at any heartbeat. Spawn rate, not the cap, limits pressure.
- That run led to the revised target and to §10. The round 1 curve stays in place and is re-checked against the new target.

**Plan for round 1 (XP curve, knob 1):** `curve` goes from {5, 4, 1.3} to {10, 12, 1.5}. At Gilbert's XP rate, level 10 then needs 1,098 XP (vs 283), which gives level 8 at 3 min, 11 at 5 min, 12 at 6.5 min and 14 at 8 min. Fewer upgrades should also shorten runs. Next is round 2 (wave ramp and drops), which tackles survival time head-on.

### SFX mix

Starting volumes come from `node scripts/loudness.js` (2026-11-27): RMS targets of −24 dB for frequent sounds, −18 dB for events and −14 dB for big moments, clamped to [0.2, 1]. `shoot` (−29.5 dB) and `bullet-wall` were already under their target, so they stay at 1. `shoot.maxVoices` went from 4 to 3. The by-ear pass is still to come.
