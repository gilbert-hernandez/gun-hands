# Design

## Context

See proposal.md for the motivation and specs/combat/spec.md for the requirements.

What already exists and shapes the approach:
- `Bullets` (GH-3): a pooled Arcade group. Each `Bullet` carries `damage` and `pierceLeft`, and `bullet.hit()` applies the pierce rule (`applyHit` in `aim.js`) and despawns when none is left. Walls already despawn bullets through `scene.bulletWalls`.
- `Enemies` (GH-5): a pooled Arcade group plus per-frame steering that sets every live enemy's velocity each frame. Each `Enemy` has `hp`, `maxHp`, `speed`, `typeId`, `spawn()` and `despawn()`, and a placeholder tint set in `spawn()`. Enemies collide with walls; there is no physics between enemies and the player.
- `Player` (GH-2/3): an Arcade sprite plus a separate guns sprite synced in `POST_UPDATE`. `update(time, delta)` reads input and fires.
- The manifest already has `fx_enemy_puff` (32 px, 6 frames) and `player_body_death` (32 px, 6 frames), both placeholders until GH-16/18.
- `GameScene.survivalMs` counts in `update()`, so it stops while the scene is paused. GameOver and UI are stubs; dev keys L and G exist.
- Headless e2e runs at about 49 fps, so browser tests track state in the page and avoid wall-clock or distance assertions.

## Goals / Non-Goals

**Goals:**
- Rules testable without a browser: damage, knockback velocity, invulnerability countdown, blink visibility, and the "hit once per bullet" bookkeeping are pure functions.
- All timers run on scene `delta`, so pausing the Game scene pauses them.
- One clear surface for GH-7/9/10/11: four scene events with documented payloads.

**Non-Goals:**
- Real art, sound, screen shake, damage numbers (GH-12 and later).

## Decisions

### 1. Module layout

- `src/config/combat.js` exports `COMBAT = { hitFlashMs, knockbackMs, puffPoolSize, gameOverDelayMs }`. Per-type numbers go on the types in `src/config/enemies.js` (`contactDamage`, `knockback` in px/s). Player numbers go in `src/config/player.js` (`maxHp`, `invulnerableMs`, `blinkMs`, `anims.death`).
- `src/combat/rules.js` (no Phaser): `applyDamage(hp, damage)` → `{ hp, dead }` (HP floored at 0 for the player; enemies keep the raw value so `hp <= 0` is the test), `knockbackVelocity(vx, vy, speed)` (unit direction of the bullet's velocity × speed; zero vector → zero), `tickTimer(msLeft, delta)` (never below 0), `blinkVisible(msLeft, period)`.
- `src/combat/events.js`: `ENEMY_HIT`, `ENEMY_KILLED`, `PLAYER_HIT`, `PLAYER_DIED`, with JSDoc payload typedefs.
- `src/combat/Combat.js`: created by `GameScene` after the player, bullets, and enemies. Registers the two overlaps, owns the kill count, emits the events, and starts the death sequence. Keeps scene code thin.
- `src/fx/Puffs.js`: a small pooled group of plain sprites playing `fx_enemy_puff` once.

*Alternative:* putting overlap callbacks inline in `GameScene`. It works but mixes wiring with rules and makes the scene file the dumping ground for GH-7/9 as well. Rejected.

### 2. Bullet → enemy hits

`physics.add.overlap(bullets.group, enemies.group, onBulletHit, processBulletHit)`.

- `processBulletHit(bullet, enemy)` returns false unless both are active, the player is alive, and the bullet hasn't hit this enemy yet. This guard is what makes "one bullet, one enemy" work: Arcade keeps iterating pairs in the same frame after a pierce-0 bullet despawns, and `bullet.active` is false by then.
- Hit-once bookkeeping: each `Bullet` gets a `hitEnemies` `Set`, cleared in `Bullet.fire()`. Pooled enemies are reused, so the set holds `Enemy` objects plus each enemy's `spawnId` (a counter bumped in `Enemy.spawn()`); an entry only matches when both are equal. In practice a bullet lives 1.2 s, so this is belt-and-braces.
- `onBulletHit`: record the enemy, `enemy.takeHit(damage, dirX, dirY)`, emit `enemy-hit`, then `bullet.hit()` (pierce). If the enemy died: `enemy.despawn()`, spawn a puff, increment kills, emit `enemy-killed`. The order (damage → events → pierce) means a killing hit on a pierce-0 bullet still reports everything before the bullet goes away.

### 3. Hit flash

Phaser 4 replaced `setTintFill` with tint modes: flash with `setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)`. `Enemy.restoreLook()` sets the mode back to `MULTIPLY` and reapplies the placeholder tint or `clearTint()`, the same choice `spawn()` makes (the placeholder flag is stored on the enemy at spawn). `flashMs` counts down in `Enemies.update(delta)`; a new hit resets it to `COMBAT.hitFlashMs` (80 ms). `spawn()` always resets mode, tint, and timers so a recycled enemy never comes back white.

### 4. Knockback

On a surviving hit, `knockMs = COMBAT.knockbackMs` (120 ms) and the velocity is set to `knockbackVelocity(bullet.body.velocity, type.knockback)`. `Enemies.steer()` skips enemies with `knockMs > 0` (it still counts them for separation so neighbours keep spreading). Walls stop them because the arena collider is unchanged. Defaults: Runner 320, Grunt 220, Brute 60 px/s, i.e. about 38, 26 and 7 px of push.

*Alternative:* adding a decaying impulse to the steering velocity. Smoother, but the chase at full speed largely cancels it and the result depends on angle. A short override reads clearly and is easy to test.

### 5. Enemy death and puffs

Death removes the enemy from play immediately (`despawn()`), which frees the pool slot and makes it unhittable, so the spec's "same frame" rule holds without a dying state. The visual is a puff sprite from `Puffs` (pool of `COMBAT.puffPoolSize` = 32), scaled by `type.size / 32` and placed at the enemy's center, which hides itself on `ANIMATION_COMPLETE`. `group.get()` returning null skips the puff.

The enemy death sheets in the manifest are deliberately unused here; GH-12 can swap the puff for them without changing behavior.

### 6. Contact damage and invulnerability

`physics.add.overlap(player, enemies.group, onContact, processContact)`. `processContact` returns false if the player is dead or `invulnerableMs > 0`, or the enemy is inactive. The first pair in a frame damages the player and sets invulnerability, so the guard rejects every later pair that frame: one hit per crowd.

`Player.takeDamage(amount)` → `{ hp, dead }` via `applyDamage`, sets `invulnerableMs = PLAYER.invulnerableMs` (1000 ms) unless dead. `Player.update` counts it down with `tickTimer` and sets `visible = blinkVisible(msLeft, PLAYER.blinkMs)` (80 ms period) on body and guns; when it reaches 0 both are visible. Defaults: max HP 100; contact damage Grunt 10, Runner 6, Brute 20. That's roughly 10 Grunt hits, about 10 s of constant contact given i-frames, which gives a new player room to learn.

### 7. Death sequence

`Combat` handles a dead result once (guarded by `player.dead`):
1. `player.die()`: `dead = true`, velocity 0, firing and input skipped in `update`, guns hidden, play `player_body_death` once (a non-looping anim created next to idle/run).
2. `GameScene` stops counting `survivalMs` once `player.dead` is set, so the stat is the time at death.
3. `enemies.freeze()`: director disabled and a `frozen` flag that zeroes velocities in `steer()` instead of chasing.
4. Emit `player-died` with `{ timeMs, kills, level }` (`level` from `player.level`, which is 1 until GH-8).
5. On the death animation's `ANIMATION_COMPLETE`, `time.delayedCall(COMBAT.gameOverDelayMs, …)` (600 ms) stops `UI` and starts `GameOver` with the stats. Both run on the scene clock, so Esc/LevelUp pauses can't skip them.

`GameOverScene.init(data)` stores the stats and `create()` adds three text lines (time as m:ss, kills, level). Opening GameOver without data (Title flow, or tests) shows no stats. The `formatTime` helper moves to a shared `src/util/format.js` so GameScene and GameOver both use it.

### 8. Dev shortcuts and readout

When `DEBUG.enabled`: H deals 10 damage (bypassing invulnerability, through the same `Combat` path so events fire), J restores max HP, and G now kills the player through the real death path instead of jumping straight to GameOver. The readout becomes `t m:ss  enemies n/cap  hp n/max  kills n`.

## Risks / Trade-offs

- [Overlap order is Arcade's iteration order, so which of two simultaneously touching enemies hurts the player or takes a pierce-0 bullet is arbitrary] → The spec only requires exactly one; tests assert counts, not which one.
- [Fast bullets (480 px/s ≈ 10 px per frame at 49 fps) could skip a 14 px Runner hurtbox] → 10 px per step is under the smallest hurtbox width, so no tunnelling at default speed. Upgrades that raise bullet speed past ~800 px/s should revisit this (noted in the weapon config comment).
- [Blinking toggles `visible`, which other code could also set] → Only `Player` touches its own visibility; `die()` takes over and the countdown stops once dead.
- [Freezing enemies leaves them overlapping the dead player] → `processContact` rejects everything once dead, so no extra `player-hit` events.

## Open Questions

None. Balance numbers are first guesses and get tuned during manual verification.
