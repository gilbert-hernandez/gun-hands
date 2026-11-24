# Design

## Context

See proposal.md for the motivation and specs/xp-leveling/spec.md for the requirements.

What already exists and shapes the approach:
- `Combat` (GH-6) emits `enemy-killed` with `{ typeId, x, y, kills }` on the Game scene's emitter, only for deaths by damage (recycling doesn't emit it). Gems can hang off that event without touching combat code.
- `Puffs` (GH-6) is the pattern for a pool of plain (non-physics) sprites: `scene.add.group({ defaultKey, maxSize })` and `group.get()` returning null when full.
- `Enemy` shows how placeholder art is tinted per type: the `placeholders` registry set plus a `placeholderTint` in config, cleared when real art exists. The three gem sheets (`pickup_xp_small|medium|large`, 16×16, 4 frames) are already in the manifest, and all pickups share one green placeholder color, so tiers need their own tint the same way.
- `Player.level` exists (always 1) and `Combat.playerDied()` reads it for the run stats.
- `LevelUpScene` is a stub: click or Enter resumes Game and stops itself. The dev key L pauses Game and launches it directly.
- `GameScene.survivalMs`, enemy timers, and invulnerability all count on scene `delta`, so pausing the Game scene freezes them. Gems must do the same.
- Headless e2e runs at about 49 fps and lags under parallel workers (see the GH-4/GH-6 notes), so tests wait on state, not on time or distance.

## Goals / Non-Goals

**Goals:**
- The curve, level gain with carry-over, tier choice for merged values, and one homing step are pure functions with unit tests.
- One surface for GH-8/9/10: `player.pickupRadius`, a way to make every gem home (GH-9 Magnet), the two XP events, and a single "level-up closed" call the LevelUp scene makes.
- No physics bodies for gems: hundreds can lie on the floor at almost no cost.

**Non-Goals:**
- Choosing or applying upgrades (GH-8), the HUD bar (GH-10), real art and effects (GH-12).

## Decisions

### 1. Module layout

- `src/config/xp.js` exports `XP`:
  - `tiers`: `{ small: { value: 1, sheet: 'pickup_xp_small', placeholderTint: 0x38bdf8 }, medium: { value: 3, …, 0x22c55e }, large: { value: 10, …, 0xf472b6 } }` (sky blue, green, pink), plus `animFps: 8`.
  - `drops`: `{ grunt: 'small', runner: 'medium', brute: 'large' }`. Kept apart from `ENEMIES.types` so all XP numbers sit in one file; a unit test checks every enemy type has a drop.
  - `magnet`: `{ startSpeed: 120, accel: 1200, maxSpeed: 520 }` (px/s, px/s²; max is well above `PLAYER.speed` 200), `collectDistance: 12`, `poolSize: 300`.
  - `curve`: `{ base: 5, growth: 4, exponent: 1.3 }`, meaning the XP to go from level L to L+1 is `round(base + growth × (L − 1)^exponent)`: 5, 9, 15, 21, 29, … ≈ 75 at level 10 and ≈ 190 at level 20. About 1,500 XP reaches level 20, which matches a 6-minute run's rough kill count (several hundred kills, averaging 2–3 XP as Runners and Brutes join), so a demo run sees roughly 15–20 level-ups. Tuned by playing (task 4.1).
- `PLAYER.pickupRadius = 80` in `src/config/player.js`; `Player` copies it to `this.pickupRadius` each session, next to the existing per-run `weapon` copy.
- `src/xp/rules.js` (no Phaser): `xpToNext(level, curve)`, `addXp(state, amount, curve)` → `{ level, xpInto, gained }` (loops while `xpInto >= xpToNext`), `tierForValue(value, tiers)` (highest tier whose value ≤ the total; at least small), `homeStep(gem, target, dtMs, magnet, collectDistance)` → new position and speed plus `collected` (true when within the collect distance or when this step would reach the player, so fast gems never orbit).
- `src/xp/Progression.js` (no Phaser): `totalXp`, `level`, `xpInto`, `pending`, `get xpNeeded`, `add(amount)` → levels gained (adds them to `pending`), `consume()`.
- `src/xp/Gems.js`: the gem pool and per-frame magnet/collection (§2–3).
- `src/xp/events.js`: `XP_CHANGED`, `PLAYER_LEVELED`, with payload typedefs.
- `src/xp/Xp.js`: per-session wiring, created by `GameScene` after `Combat` (like `Combat` itself): listens to `enemy-killed`, owns `Gems` and `Progression`, emits the events, keeps `player.level` in sync, and runs the level-up queue (§4). `GameScene` calls `xp.update(delta)` and exposes `scene.xp`.

*Alternative:* putting XP fields on `Player`. It would work, but the queue needs the scene, and keeping progression out of `Player` keeps it testable without Phaser. Rejected.

### 2. Gem pool and drops

Gems are plain sprites in `scene.add.group({ maxSize: XP.poolSize })`, each with `value`, `tier`, `homing`, and `speed` fields. On `enemy-killed`, `Gems.drop(x, y, value)`:
- `group.get(x, y)` gives a free gem: set value, tier from `XP.drops[typeId]`, texture and looping shimmer animation for that tier, tint if the sheet is a placeholder, `homing = false`.
- When the pool is full (null), find the nearest active gem (a linear scan of at most 300 gems, only on kills while full), add the value, and switch it to `tierForValue(total)`'s look. Merging into a homing gem is fine: it just arrives worth more.

Depth sits between the map layers (negative depths in `Arena`) and enemies (0), so enemies walk over gems.

*Alternative:* a cap that drops new gems once full, or that removes the oldest. Either loses XP, which the spec forbids. *Alternative:* merging nearby gems periodically. More work every frame for the same result.

### 3. Magnet and collection

`Gems.update(delta, player)` runs every frame while the player is alive (a dead player skips it, so nothing is collected and gems stand still):
- Non-homing gems: if the squared distance to the player's center is < `pickupRadius²` (strict, so a radius of 0 turns the magnet off), set `homing = true`, `speed = startSpeed`.
- Homing gems: `homeStep` moves them straight at the player's current position, adding `accel × dt` to the speed up to `maxSpeed`. Walls are ignored (no body, no collider).
- Collected gems are hidden and deactivated, and their values are summed. After the loop, `Gems.update` returns the total, and `Xp` adds it once. One `add` per frame keeps events tidy when several gems land together.
- `Gems.magnetizeAll()` sets every active gem homing (for GH-9's Magnet).

The player's center is the sprite's (x, y), the same point combat and aim use.

### 4. Levels and the level-up queue

`Xp.collect(amount)` calls `progression.add(amount)`, sets `player.level`, emits one `player-leveled` per level gained, then one `xp-changed`. If levels were gained, it calls `openLevelUp()`.

`openLevelUp()` does nothing if the player is dead, no level-up is pending, or LevelUp is already open; otherwise it pauses Game and launches LevelUp. Pausing from inside `Game.update` is safe: the rest of the frame finishes, and the next frame skips Game's update.

`finishLevelUp()` is the one call the LevelUp scene makes when the player is done with it. It consumes one pending level-up and returns whether more are pending. The stub then either restarts itself (`this.scene.restart()`, Game stays paused) or resumes Game and stops itself. GH-8 keeps this hand-off and replaces the stub's body with the cards. If LevelUp is opened with no Game session (it can't be in normal play), it just resumes as today.

Because `xp-changed` and `player-leveled` are emitted before the pause takes effect, the HUD sees the new level while the overlay is up.

### 5. Run stats

`Combat.playerDied()` already reads `player.level`; keeping that field in sync is all the combat change needs.

### 6. Dev readout and key L

The readout adds `lv <level> xp <into>/<needed>`. L now calls `xp.collect(progression.xpNeeded − progression.xpInto)`, which runs the real event and queue path.

## Risks / Trade-offs

- [Existing e2e tests kill enemies near the player, so gems could now be collected and pause Game mid-test] → The setup helpers in `combat`, `enemies`, and `shooting` specs set `player.pickupRadius = 0`, which turns the magnet off. Task 3.2 runs the whole suite three times.
- [The curve is a guess; level-ups every few seconds early on could feel choppy] → All numbers in `XP.curve`; tuned in manual verification (task 4.1). The first level at 5 XP is about five Grunts, roughly 10–15 s in.
- [Pausing inside the frame that collected the gem] → Phaser applies `pause` by status, so the rest of that update still runs; nothing later in `GameScene.update` depends on the game still running.
- [Gems pass through walls while homing] → Intentional; the arena has thin walls, and gems that stop at walls would get stuck behind them.
- [Merging always picks the nearest gem, which may sit far from the drop on a full pool] → Acceptable: XP isn't lost, and a full 300-gem floor is an edge case.
