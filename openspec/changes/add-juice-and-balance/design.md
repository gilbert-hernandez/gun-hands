# Design

## Context

Feedback the game already has: the enemy hit flash (`COMBAT.hitFlashMs`), knockback, David's impact spark (`FxPool`, 24 at once), death animations (`FxPool`, 32), the muzzle flash, the level-up burst, and a 200 ms Bomb shake (`POWERUPS.bombShakeMs`). Every tunable lives in `src/config/`. Phaser can't run under Vitest, so pure logic goes in Phaser-free modules and the scene wiring is tested with Playwright, which records calls in the page. Headless swiftshader runs at about 49 FPS and stalls under parallel workers, so e2e tests assert on recorded calls and state, never on timing or frame rate.

## Goals / Non-Goals

**Goals:** hits, kills and damage read clearly at a glance. Reproducible evidence for the 5–8 min / level 10 target. A way to put 200+ enemies on screen and read the FPS. A balanced SFX mix.

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

### 6. Performance at 200+ enemies

- **Pool.** `ENEMIES.poolSize` goes from 160 to 256, and the steering scratch buffers follow it. Whether a late wave cap goes above 140 is up to the balance pass (§7). The stress key covers the 200+ check either way.
- **Stress key.** `K` (dev only) sets `director.capOverride = JUICE.debug.stressCount` (220) and spawns on the ring until that many are alive. Pressing it again clears the override.
- **Readout.** The debug line adds `fps ${game.loop.actualFps.toFixed(0)}`, plus the live particle and damage-number counts.
- **Measuring.** Run `npx vite build --mode development` (the dev keys need it) and serve it with `npx vite preview`. On a mid-range laptop: press `K` and fire continuously for 60 s. FPS must stay at 58 or above, apart from the moment the stress spawn happens.
- **If it misses, in order of cost:**
  1. Lower `particles.max` and `damageNumbers.poolSize`.
  2. Skip the death animation once more than N are playing (already pooled at 32).
  3. Throttle `separationPushes` to every other frame for enemies outside the camera view.
  4. Turn off `body.onWorldBounds` and collider work for enemies that are knocked back.

  Each step gets measured before the next one is tried.

### 7. Balance method

- **Targets** (the ticket's acceptance criteria): a typical run lasts 5–8 minutes, and a typical run reaches level ≥ 10.
- **Bot** (`scripts/bot.js`, run by `scripts/balance.js`). It drives the real game in headless Chromium at real time:
  - Each tick (100 ms), it reads enemy positions through `__GAME__`.
  - It moves along the sum of "away from enemies within 220 px, weighted by 1/d", plus a tangential term so it circles instead of backing into corners, plus wall avoidance from `arena.isSolidAt` probes 48 px ahead. The direction maps to WASD.
  - It aims at the nearest enemy and picks the first available card by the priority `damage > firerate > multishot > maxhp > pierce > movespeed > pickup`.
  - At GameOver it writes the summary (§8) to `balance/<timestamp>-<n>.json` and prints a table: median, min and max time and level.
  - `npm run balance -- 3` runs 3 games one after another (parallel runs stall swiftshader). The URL comes from `URL=`, default 5175, the fresh-server convention.
- **Calibration.** The bot is a proxy. Gilbert plays 3 runs on the same numbers and the summaries (§8) are compared. If the bot runs consistently longer or shorter than Gilbert, the bot's target band moves by that offset. The bot never changes to fit.
- **Knobs, in order of preference** (the least surprising to the feel first):
  1. XP curve and gem values (level-10 timing)
  2. wave keyframes (how fast the pressure ramps)
  3. contact damage
  4. enemy HP
  5. powerup drop chances, Health Pack heal
  6. upgrade steps

  Every round goes into a "Balance log" table appended to this design file: the change, the bot median, Gilbert's runs. That gives a record of why the shipped numbers are what they are.
- **First estimate.** Level 10 needs 283 XP: about 280 Grunt-equivalent kills, or fewer with Runner and Brute gems. At today's caps, a player who survives 6 minutes kills roughly 400–600 enemies, so level 10 probably arrives too early and the run probably ends too late or too early depending on whether the wave ramp outpaces the upgrades. The first bot runs settle which.

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
- **Scope vs schedule.** This is more than the 3-hour ticket slot. The juice parts (tasks 2–4) don't depend on balance, so they can land first. The balance rounds need playtime and can spread over the buffer days.

## Open Questions

- Does the late-game wave cap go above 140, so real runs show 200+ enemies? The balance pass decides, and the stress key covers the FPS check either way.
- Should the run log ship in production (anonymous, local only)? Proposed: dev builds only.
