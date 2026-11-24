# Design

## Context

GH-2 left `Player` as an Arcade sprite (the body) plus a plain `guns` sprite that copies the body's position and `flipX` in `POST_UPDATE`. `GameScene.update()` calls `player.update()`, which reads WASD and the pointer. Pointer world position is already recomputed from screen coords each frame (`cameras.main.getWorldPoint`). Pure, Phaser-free logic lives in `src/player/movement.js` with unit tests; behavior in the browser is checked by Playwright through `window.__GAME__` (dev builds only). The manifest already has `fx_bullet` (8×8, 2 frames, points right) and `fx_muzzle` (16×16, 3 frames, pivot left-center), which become placeholders until GH-18. Frame timing in headless Chrome is uneven, so tests assert on rates within tolerances, not exact counts.

## Goals / Non-Goals

**Goals:**
- Keep the math (aim angle, spread fan, fire timing, pierce) in a pure module so it's unit-tested and reusable by later weapon/upgrade tickets.
- Give GH-4 (enemies) a ready hit API: each bullet exposes `damage` and a `hit()` that applies pierce.
- Give upgrade/powerup tickets one place to change: `player.weapon` (per-run stats).

**Non-Goals:**
- No weapon class hierarchy or multiple weapon types; one weapon, data-driven.
- No physics overlap setup (no enemy group exists yet).

## Decisions

### 1. Config: `src/config/weapon.js`
```js
export const WEAPON = {
  fireRate: 4,          // shots per second
  muzzleOffset: 14,     // px from player center to gun tip along the aim
  poolSize: 120,        // max bullets alive at once
  muzzleFlashMs: 60,
  bullet: { speed: 480, damage: 10, lifetime: 1200 /* ms */, pierce: 0, count: 1, spreadDeg: 15 },
};
```
`Player` copies it at construction: `this.weapon = structuredClone(WEAPON)`. A new session builds a new `Player`, so stats reset automatically. Starting values are tuning guesses; 480 px/s × 1.2 s ≈ 576 px reaches past the screen edge from the center (480 px) without crossing the whole arena.

### 2. Pure math: `src/weapon/aim.js`
- `aimAngle(from, to, fallback)` → radians via `Math.atan2`; returns `fallback` when the points coincide.
- `spreadAngles(aim, count, spreadDeg)` → `count` angles evenly from `aim − spread/2` to `aim + spread/2`; `[aim]` when count ≤ 1. "Spread angle" means total fan width (30° for 3 bullets → −15°, 0, +15°).
- `shotsDue(acc, dtMs, fireRate)` → `{ shots, acc }`: a time accumulator. `acc` is clamped to at most 2 shot intervals before dividing, so a long frame (tab switch, GC pause) yields at most 2 shots instead of a burst. Using scene `update(time, delta)` instead of a `time.addEvent` loop means pause stops it for free and a fire-rate change takes effect on the next shot with no timer rebuild.
- `applyHit(pierceLeft)` → `{ pierceLeft, alive }`.
- `gunsFlipY(angle)` → true when `|angle| > π/2`.

Alternative considered: `Phaser.Math.Angle.Between` inside Player. Rejected only for testability; the pure functions can call nothing from Phaser.

### 3. Pool: `src/weapon/Bullets.js`
An Arcade physics group: `scene.physics.add.group({ classType: Bullet, maxSize: WEAPON.poolSize, runChildUpdate: true })`. `Bullet extends Phaser.Physics.Arcade.Sprite` with `fire(x, y, angle, stats, now)` (enable body, set rotation, `velocityFromRotation`, store `damage`, `pierceLeft`, `expiresAt`), `update(time)` (despawn on `time >= expiresAt` or outside `physics.world.bounds`), `hit()` (uses `applyHit`, despawns when spent), and `despawn()` (`disableBody(true, true)`, which returns it to the pool). `Bullets.fire(...)` calls `group.get()`; `get()` returns `null` once `maxSize` objects exist and all are active, which is exactly the "skip without error" behavior.

Bullets are not world-bound colliders (`collideWorldBounds` off); the bounds check in `update` despawns them instead, so they don't bounce or stick on walls. Small circular body (radius 3) for later enemy overlaps. Depth: above floor, below body (0.5) so they appear to leave from under the guns.

Alternative considered: hand-rolled array pool. Rejected; the Arcade group already handles reuse, `maxSize`, and `runChildUpdate`, and GH-4 needs a group for `physics.add.overlap` anyway.

### 4. Player changes
- Constructor takes the pool: `new Player(scene, x, y, bullets)`. GameScene creates `Bullets` first.
- `update(time, delta)`: after movement, compute `aim` (pointer world point if `pointerUsed`, else facing: 0 or π), store `this.aim`. Run `shotsDue`; for each shot, compute the tip `(x + cos·muzzleOffset, y + sin·muzzleOffset)` and call `bullets.fire` for each `spreadAngles` angle, then `scene.events.emit('player-fired', { x, y, angle })` once per shot.
- `syncGuns` in `POST_UPDATE` sets position, `rotation = this.aim`, and `flipY = gunsFlipY(aim)`; it no longer copies `flipX` (rotation replaces it). The body's flipX/facing logic is untouched.
- Tip position uses the post-movement body position from this frame; the one-step difference from POST_UPDATE syncing is under 4 px at 200 px/s and not visible.

### 5. Muzzle flash placeholder
GameScene (not Player) subscribes to `player-fired` and positions a single reused `fx_muzzle` sprite (origin `0, 0.5`, matching the art's left-center pivot) at the tip with the shot's rotation, visible for `muzzleFlashMs`. One reused sprite is enough because flashes never overlap at 4–20 shots/s with a 60 ms flash. Keeping it in a subscriber proves the hook works and is where GH-12/GH-18 swap in the animated flash and sound.

### 6. Test hooks
No new globals: e2e tests reach `scene.player.weapon`, `scene.player.aim`, `scene.player.guns.rotation`, and `scene.bullets.group` through the existing `window.__GAME__`. Tests count shots by subscribing to `player-fired` from `page.evaluate`.

## Risks / Trade-offs

- [Uneven frame timing in headless Chrome makes fire-rate tests flaky] → assert counts over 2 s within ±1 shot (as the spec allows) and the pool size as an upper bound, not exact frame counts.
- [Pool too small at high fire rate × count × lifetime once upgrades stack] → worst case today is 4/s × 1 × 1.2 s ≈ 5 alive; 120 leaves room for ~20/s × 5 projectiles. Skipping shots is the graceful failure; revisit in the upgrades ticket.
- [Vertical flip at exactly ±90° could flicker when aiming straight up/down] → use strict `>`; the flip only changes on crossing the vertical, which matches what the player sees.
- [Auto-fire runs during the whole session, including while testing movement] → expected by design; existing movement e2e tests don't touch bullets and remain valid.
