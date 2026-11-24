# Design

## Context

See proposal.md for the motivation and specs/enemies/spec.md for the requirements.

What already exists and shapes the approach:
- `Arena` (GH-4) offers `collide(target, onHit?)` and `isSolidAt(x, y)`, the map is 1920×1280 (60×40 tiles of 32 px), and the view is 960×540, so the camera covers about a quarter of the map.
- `Bullets` is the pattern for pooling: an Arcade group with `classType`, `maxSize`, and objects that `enableBody`/`disableBody` themselves. Pure logic sits in Phaser-free modules (`aim.js`, `movement.js`, `arenaMap.js`) with vitest unit tests; scene behavior is covered by Playwright through `window.__GAME__`.
- The manifest already declares `enemy_grunt_walk`, `enemy_runner_walk`, `enemy_brute_walk` (and death sheets for GH-6), each 6 frames. Placeholders are colored by category, so all enemies are the same red today.
- Headless e2e runs at about 49 fps on swiftshader, so browser tests must not depend on exact timing.

## Goals / Non-Goals

**Goals:**
- Logic that can be tuned and tested without a browser: spawn-point choice, steering, and wave interpolation are pure functions.
- Handle around 150 live enemies at 60 fps on a mid-range laptop.
- Give GH-6 and GH-7 a clean surface: one enemies group to collide or overlap with, an `hp` field, a `type` field, and a method to remove an enemy from play.

**Non-Goals:**
- Any interaction with bullets or the player (GH-6).
- Real art or death animations.

## Decisions

### 1. Module layout

- `src/config/enemies.js` exports `ENEMIES = { types, waves, spawn, separation, poolSize, recycleDistance }`. Everything numeric lives here.
- `src/enemy/waves.js`: `waveAt(seconds, keyframes)` → `{ interval, cap, weights }` and `pickType(weights, rand)`.
- `src/enemy/spawn.js`: `ringRadius(view, margin, maxHalfSprite)` and `findSpawnPoint({ center, radius, halfBox, isSolid, worldW, worldH, attempts, rand })` → `{x, y} | null`.
- `src/enemy/steering.js`: `chaseVelocity(enemy, target, speed, push, strength)` and `separationPushes(positions, radius)` (spatial-hash neighbor search; returns one push vector per position).
- `src/enemy/Enemy.js`: pooled `Phaser.Physics.Arcade.Sprite` with `spawn(type, x, y)` and `despawn()`, like `Bullet`.
- `src/enemy/Enemies.js`: owns the group, the director state (spawn accumulator), and the per-frame `update(delta, survivalMs, player)`, which runs the director, steering, and recycling.

Pure modules take `rand` as a parameter so tests are deterministic. *Alternative:* one big `EnemyManager` with logic inline, which is harder to unit test and against the project's pattern.

### 2. Spawn ring

Ring center = the camera's `worldView` center (not the player, since the camera is clamped at map edges). Radius = half the view diagonal (√(480² + 270²) ≈ 551 px) + the largest half sprite size (32 px for a Brute) + `spawn.margin` (default 32). Any point on that circle is outside the view rectangle with the whole sprite off-screen.

For each attempt: pick θ uniformly in [0, 2π), compute the point, and reject it if any of the hurtbox's four corners plus its center is on a solid tile or outside the map (`isSolidAt` already returns true outside the map). The corners are inset by 1 px. The largest hurtbox (Brute, about 40 px) is narrower than two tiles, so five sample points can't miss a wall tile between them. Default `spawn.attempts` = 12.

When the player is near a map corner, most of the ring lies outside the map and many attempts fail. The arena is 1920 px wide and the ring diameter is about 1230 px, so some arc is always inside the map. Twelve attempts makes a skipped tick rare and harmless (the director tries again next interval).

*Alternative:* precomputing a list of valid spawn tiles, then filtering by distance. That's more robust near corners, but it's extra state and the ring approach is enough here.

### 3. Steering and separation

Each frame, for live enemies only:
1. Build a spatial hash (cell size = separation radius, default 28 px) of enemy centers.
2. For each enemy, sum `(self − other) / dist` over neighbors closer than the radius, weighted by `(1 − dist / radius)`. For exactly coincident positions, use a deterministic per-index angle so stacked enemies still separate.
3. Velocity = normalize(dirToPlayer + push × `separation.strength`) × speed. The result is a unit vector times speed, so it never exceeds the speed, which satisfies the speed-limit scenario.

Cost is O(n) on average with the hash, and the arrays are reused between frames to avoid garbage.

*Alternative:* an Arcade collider between enemies in the group. It's O(n²) in the worst case, it jitters in dense crowds, and Brutes would shove smaller enemies around. Rejected.

Facing: `setFlipX(vx < 0)` with a small dead zone (|vx| < 1 keeps the current facing) so enemies directly above or below the player don't flicker.

### 4. Wall collision

`arena.collide(enemies.group)` once. Arcade slides a body along a wall when the velocity has a tangent component, so straight chase plus collision gives acceptable behavior around the convex obstacles in the shipped map. Enemies directly behind an obstacle may stall; the recycle distance (decision 6) and the player's own movement clear them.

No collider with the player and none between enemies (spec: no pushing).

### 5. Wave director

Keyframes (defaults, tuned during manual verification):

| t (s) | interval (ms) | cap | grunt | runner | brute |
|------:|--------------:|----:|------:|-------:|------:|
|     0 |          1400 |  12 |  1    |  0     |  0    |
|    30 |          1100 |  20 |  1    |  0     |  0    |
|    45 |          1000 |  25 |  0.8  |  0.2   |  0    |
|   120 |           700 |  50 |  0.6  |  0.3   |  0.1  |
|   240 |           450 |  90 |  0.5  |  0.3   |  0.2  |
|   360 |           300 | 140 |  0.45 |  0.3   |  0.25 |

`waveAt` interpolates the interval, cap (floored), and each weight linearly. Weights are normalized at pick time, so they don't need to sum to 1. Because weights interpolate, a type starts appearing just after the last keyframe where it has zero weight. The t = 30 keyframe keeps the first 30 s Grunt-only, and Runners fade in between 30 s and 45 s.

Spawning uses an accumulator, like `shotsDue`: `acc += delta`; while `acc >= interval` and live < cap, spawn and subtract the interval. If at the cap, clamp `acc` to `interval` so there's no burst when the count drops. First spawn after `spawn.startDelayMs` (default 1000).

Survival time: `GameScene` keeps `this.survivalMs`, adding `delta` in `update()`. Phaser doesn't call `update` on a paused scene, so pauses are excluded for free. GH-10's HUD timer will read the same field.

### 6. Pooling and recycling

One Arcade group, `classType: Enemy`, `maxSize: ENEMIES.poolSize` (default 160, at least the largest cap, which a config unit test checks). `runChildUpdate: false`: `Enemies.update` iterates `group.getChildren()` once to steer, so there's no second per-child pass.

`Enemy.spawn(type, x, y)`: `enableBody(true, x, y, true, true)`, set texture and animation, `body.setSize` + `setOffset` from the type's hurtbox (centered horizontally, bottom-aligned like the player's), `hp = type.hp`, `speed = type.speed`, `typeId`. Changing body size on reuse is fine because the body is reset by `enableBody`.

Recycle: each frame, if the squared distance to the player > `recycleDistance²` (default 900 px, beyond the ~615 px ring), `despawn()`.

### 7. Placeholder tints

`PreloadScene` already collects placeholder keys; it will also store them in `this.registry.set('placeholders', keys)`. `Enemy.spawn` applies `type.placeholderTint` only when the walk key is in that list, otherwise `clearTint()`. Defaults: Grunt `0xef4444` (red), Runner `0xfacc15` (yellow), Brute `0xa855f7` (purple).

Phaser tints multiply, and multiplying the current red placeholder can't make yellow. So the `enemy` category's placeholder base color changes from red to light gray (`#e5e7eb`), and the per-type tint supplies the hue. The `assets` spec only requires placeholders to be "colored by asset category", and enemies still have their own category color. Death sheets (used from GH-6) get the same base color and will reuse the type tint.

*Alternative:* per-key colors in the manifest. That spreads gameplay concerns into the asset manifest; rejected.

### 8. Debug readout

When `DEBUG.enabled`, `GameScene` adds a fixed-to-camera text at the bottom left: `t 1:23  enemies 34/50`, updated every frame. It's not part of the HUD and is gone in production builds.

### 9. Test hooks

E2E reaches everything through `scene.enemies` (`group`, `director.enabled`, `spawnAt(typeId, x, y)`, `spawnRing(typeId)`), plus `scene.survivalMs`. `director.enabled = false` lets tests place enemies without random spawns interfering. These are normal public methods, not test-only code paths.

## Risks / Trade-offs

- [Enemies stall behind obstacles with straight chase] → Arcade sliding handles most cases; recycling frees stuck ones; pathfinding is a possible later ticket if playtests show it matters.
- [Performance with 140+ enemies on swiftshader e2e] → e2e tests keep enemy counts small (≤ 20) and disable the director; manual verification checks fps at a high cap with dev tools.
- [Spawn ring near map corners fails often] → bounded retries; a skipped spawn only delays the next one by one interval.
- [Placeholder base color change for the enemy category] → only affects placeholders; the `placeholders.test.js` expectations for the enemy color are updated in the same task.
- [Wave numbers feel wrong] → all in config; manual verification includes a tuning pass, and later tickets (GH-6 adds damage) will likely retune.

## Open Questions

- Final wave numbers and per-type stats. They'll be tuned once GH-6 adds damage and the player can actually die; changing them doesn't affect the specs or tasks.
