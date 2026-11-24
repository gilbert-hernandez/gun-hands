# Design

## Context

Hooks that earlier changes left for this one:

- `Combat.killEnemy(enemy)` is the single kill path: it handles the puff, the kill count, and `enemy-killed { typeId, x, y, kills }`. `Xp` already listens for `enemy-killed` to drop gems, and Powerups can listen the same way. `Enemy.takeHit(damage, dirX, dirY)` applies damage, the flash, and knockback along a direction, and returns `true` on a kill.
- `Combat.canContact(enemy)` is the overlap guard for contact damage (alive, not invulnerable), so a shield check fits there.
- `Gems.magnetizeAll()` already exists for the Magnet (GH-7). `Player.heal(amount)` caps at max HP (GH-8).
- `Player.fire()` reads `this.weapon` (`fireRate`, `bullet.count`, `bullet.spreadDeg`, …) on every shot. Upgrades change that per-run copy in place, through `applyUpgrade`.
- Gems are plain pooled sprites with no physics body, collected by distance in a per-frame loop (`Gems.update`). They're cheap and easy to test.
- The manifest already has `pickup_{rapidfire,spread,shield,health,bomb,magnet}` (24×24, 4 frames), `fx_shield` (48×48, 4 frames), and `fx_bomb_blast` (64×64, 6 frames). Their placeholders are all one category color, so per-powerup tints are needed (as gems and enemies do).
- Game-time timers count on the scene `delta` inside `GameScene.update`, so they stop while Game is paused for LevelUp.

## Goals / Non-Goals

**Goals:**
- Keep the drop roll, weighted pick, effective-weapon math, timer ticking, and blink logic pure and unit-testable in `src/powerups/rules.js`, like `xp/rules.js` and `upgrades/rules.js`.
- Timed effects must never fight with upgrades: no "undo" arithmetic on `player.weapon`.
- One per-session object on the Game scene (`scene.powerups`), so state resets with the session and e2e tests can reach it.

**Non-Goals:**
- A general stat-modifier system for every stat. Only the two weapon boosts need layering. Shield is a flag, and instant powerups act once.

## Decisions

### 1. Config: `src/config/powerups.js`

```js
export const POWERUPS = {
  dropChance: { grunt: 0.02, runner: 0.03, brute: 0.25 },
  weights: { rapidfire: 3, spread: 3, shield: 2, health: 3, bomb: 1, magnet: 2 },
  types: {
    rapidfire: { sheet: 'pickup_rapidfire', placeholderTint: 0xf97316, durationMs: 10000, fireRateMult: 2 },
    spread:    { sheet: 'pickup_spread',    placeholderTint: 0x38bdf8, durationMs: 10000, extraCount: 2, extraSpreadDeg: 30 },
    shield:    { sheet: 'pickup_shield',    placeholderTint: 0x60a5fa, durationMs: 8000 },
    health:    { sheet: 'pickup_health',    placeholderTint: 0xef4444, heal: 30 },
    bomb:      { sheet: 'pickup_bomb',      placeholderTint: 0x1f2937, damage: 100 },
    magnet:    { sheet: 'pickup_magnet',    placeholderTint: 0xa3e635 },
  },
  animFps: 8,
  collectRadius: 20,        // px, player center to pickup center
  lifetimeMs: 12000,
  warnMs: 3000,             // pickup blinks for its last 3 s
  blinkMs: 120,             // blink half-period (pickups and shield aura)
  shieldWarnMs: 2000,       // aura blinks for the shield's last 2 s
  poolSize: 12,
  bombShakeMs: 200,
  bombBlastScale: 6,        // fx_bomb_blast is 64 px, so the blast is drawn ~384 px across
};
```

Timed means "has `durationMs`". The rules derive the timed and instant split from that, so the two can't disagree.

*Rates:* early on, kills come at about 1 per second, so 2–3% gives a pickup roughly every 40–50 s. Brutes appear later and drop at 25%. That puts a typical 6-minute run at around 10–15 pickups. It gets tuned in the manual check.

*Bomb damage 100:* that's above Grunt (30) and Runner (12) HP, and below Brute (120), which matches the ticket's "kills or damages". It's flat, so damage upgrades don't change it.

### 2. Pure rules: `src/powerups/rules.js`

- `rollDrop(typeId, dropChance, rng)` → boolean.
- `pickWeighted(weights, rng)` → id (cumulative weights in a fixed key order).
- `isTimed(id, types)`.
- `effectiveWeapon(weapon, active, types)` → a new weapon-shaped object: `fireRate × fireRateMult` when Rapid Fire is active, and `bullet.count + extraCount`, `bullet.spreadDeg + extraSpreadDeg` when Spread Shot is active. It never mutates `weapon`. When nothing is active, it returns `weapon` itself, so there's no allocation on the common path.
- `tickTimers(active, delta)` → `{ active, expired: id[] }`: counts each active timer down (never below 0) and lists the ones that just reached 0.
- `pickupVisible(msLeft, warnMs, blinkMs)`: visible when `msLeft > warnMs`, otherwise it alternates. The shield aura uses the same function.

### 3. Layered weapon instead of mutating `player.weapon`

`Player` gains `boosts: () => weapon` (by default it returns `this.weapon`). `Player.fire()` takes `fireRate`, `muzzleOffset`, and `bullet` from `this.boosts()` instead of `this.weapon`. Powerups sets `player.boosts = () => effectiveWeapon(player.weapon, this.active, POWERUPS.types)`.

*Alternative considered:* adding the boost to `player.weapon` on collect and subtracting it on expiry. That breaks when an upgrade lands in between (Multishot rescales spread, and float rounding builds up), and it makes "refresh doesn't stack" hard to guarantee. With layering, the boost goes away just by being dropped from `active`.

*Also considered:* a `structuredClone` per shot. It isn't needed. `effectiveWeapon` makes one shallow object with a shallow `bullet`, and only while a weapon boost is active. Each bullet already copies the `damage`/`pierce` it needs when fired.

The `Bullet stats` and `Automatic fire` spec text changes to match this (see the player-shooting delta). Bullets keep reading speed, damage, lifetime, and pierce from the same object, so the effective weapon passes them through unchanged.

### 4. Pickups: `src/powerups/Pickups.js`

This mirrors `Gems`. A `Pickup extends Phaser.GameObjects.Sprite` with `id` and `msLeft`, sits in a `group` with `maxSize: POWERUPS.poolSize`, and has depth `-0.5` (above gems at -1, below enemies at 0). Methods:
- `drop(x, y, id)`: returns `null` when the pool is full (the drop is skipped, with no merge, unlike gems). Sets the sheet, the shimmer animation (`ensureAnim`), and the placeholder tint.
- `update(delta, player)`: ticks lifetimes, sets visibility from `pickupVisible`, despawns expired pickups, and returns the ids collected this frame (distance² ≤ `collectRadius²` to the player's center). When `player.dead`, it does nothing (the whole `Powerups.update` is skipped).

### 5. Session wiring: `src/powerups/Powerups.js`

This is created in `GameScene.create()` after `Xp`, as `scene.powerups = new Powerups(scene, { player, combat, gems: xp.gems, enemies })`.

- **Drops:** listens for `ENEMY_KILLED` (off on shutdown). If `rollDrop(typeId)` passes, it calls `pickups.drop(x, y, pickWeighted(weights, this.rng))`. `this.rng` can be replaced, as with Upgrades. Because Xp subscribes first, the gem drops before the pickup. The pickup sits slightly above the gem in depth, so both stay visible.
- **State:** `active: Partial<Record<TimedId, number>>` (ms left). It's readable by the HUD and tests.
- **Collect:** `collect(id)`. Timed: `active[id] = durationMs` (a refresh is the same assignment), then emit `powerup-collected { id, durationMs }`. Instant: apply the effect, then emit `{ id }`.
  - Health: `player.heal(heal)`.
  - Magnet: `gems.magnetizeAll()`.
  - Bomb: see §6.
- **update(delta):** runs from `GameScene.update` after `xp.update`, and only while the player is alive. It ticks the timers, emits `powerup-expired` for each expired id and deletes it, updates the pickups and collects their ids, and updates the shield aura.
- **Shield:** `isShielded()` is `active.shield > 0`. `Combat` gets an optional `shielded: () => boolean` in its constructor parts. `canContact` returns false while shielded, so the overlap callback never runs: no damage, no i-frames, no `player-hit`. `damagePlayer(…, { force })` doesn't check the shield, so the dev keys still hurt. The aura is one reused `fx_shield` sprite at depth 0.9 (under the guns at 1, above the body). It follows the player in `POST_UPDATE` like the guns, and its visibility comes from `pickupVisible(active.shield, shieldWarnMs, blinkMs)`.

*Why a guard on the overlap and not inside damagePlayer:* the guard already decides whether contact counts. Putting the check there keeps `damagePlayer` meaning "really take damage", and the debug keys stay predictable.

### 6. Bomb

`Combat` gains `damageEnemy(enemy, damage, dirX, dirY)`, which shares its body with `onBulletHit` minus the bullet: `takeHit`, then `killEnemy` on a kill. It doesn't emit `enemy-hit`, whose spec defines it as a bullet hit. Powerups' bomb does the following:
1. It reads `scene.cameras.main.worldView` and snapshots the active enemies whose `(x, y)` is inside it. The snapshot is taken first because a kill despawns enemies while iterating the group.
2. For each enemy, it calls `combat.damageEnemy(e, damage, e.x - player.x, e.y - player.y)`. If an enemy is exactly on the player, the direction is (0, 0), so it gets no knockback (`knockbackVelocity` handles zero).
3. It shows one reused `fx_bomb_blast` sprite at the player, scaled `bombBlastScale` and played once, and calls `camera.shake(bombShakeMs, 0.01)`.

The kills go through `killEnemy`, so the puffs, kill count, XP gems, and powerup drop rolls all happen as normal. A bomb kill can drop another bomb, which is rare (1/14 of a ~2% roll) and harmless.

### 7. Bullet pool 120 → 160

The worst case is 8 shots/s × 2 (Rapid Fire) × 7 projectiles (5 Multishot + 2 Spread) × 1.2 s = 134 bullets. `tests/powerupsConfig.test.js` asserts that this worst case fits `WEAPON.poolSize`, replacing the upgrade-only bound in spirit (the existing upgrades check stays).

### 8. Debug

With `DEBUG.enabled`, `keydown-P` calls `powerups.debugDrop()`. That drops `ORDER[i++ % 6]` 60 px from the player along `player.aim`, clamped inside the arena bounds. It's outside the 20 px collect radius, so the player walks onto it, which tests the real path. The readout gets a line like `pw rf 7.2 sp 3.0 sh -`.

## Risks / Trade-offs

- [The bomb only hits enemies whose center is on screen, so a 64 px Brute half on screen may be missed] → Acceptable and easy to read. The spec says "position inside the camera view".
- [`player.boosts` is a function hook on Player that only Powerups sets] → Keep the default `() => this.weapon` so Player works and unit-tests on its own. Document it in a JSDoc comment.
- [E2E flakiness from timers under swiftshader (GH-4/GH-6 notes)] → Tests set `active[id]` directly and wait on the field (`active.rapidfire === undefined`), never on wall-clock durations. Drops are forced with `dropChance` overrides or `pickups.drop()`, and the weighted pick uses a seeded `rng`.
- [Pickups can land on top of the gem the enemy also dropped] → Different sizes and depths keep both visible. No offset is needed.
- [Health Pack at full HP is wasted] → Intended. No auto-skip.

## Open Questions

- The final drop rates and durations. They're tuned in the manual run (task 5.1) by editing `POWERUPS` only.
