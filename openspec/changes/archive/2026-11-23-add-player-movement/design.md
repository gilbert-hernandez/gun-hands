# Design

## Context

GH-1 left `GameScene` showing a static player and brute, with `DISPLAY` and `DEBUG` tunables in `src/config/`. The asset manifest gives keys `player_body_idle`, `player_body_run` (32×32 strips) and `player_guns_idle`, with generated placeholders when art is missing. Arcade Physics is already the default physics. There is no map yet; the Tiled arena comes with a later ticket. Playwright e2e and `npm run record` exist and read the game through `window.__GAME__` in dev builds.

## Goals / Non-Goals

**Goals:**
- Keep movement math in a pure, unit-testable module, separate from Phaser.
- Make the arena size and the player's tunables config-only, so the later Tiled map can just set the world bounds.

**Non-Goals:**
- A reusable entity/component framework. One `Player` class is enough for now.

## Decisions

1. **Pure movement module (`src/player/movement.js`).** `velocityFrom({up,down,left,right}, speed)` returns `{x, y}` with diagonals normalized; `facingFrom({vx, aimX, playerX, pointerUsed, current})` returns `'left' | 'right'`. Vitest covers both. *Alternative:* `body.velocity.normalize().scale()` inline in the scene. It works but can't be unit-tested without Phaser.

2. **`Player` as a container-less pair: an Arcade physics sprite for the body plus a plain sprite for the guns** that copies the body's position in `preUpdate`/scene update. *Alternative:* a `Phaser.GameObjects.Container`. Containers complicate Arcade bodies (offsets are relative to the container) and the guns need to rotate independently later, so two sprites are simpler.

3. **Hurtbox via `body.setSize(w, h)` + `setOffset(x, y)` from `PLAYER.hurtbox`.** Default 16×20 offset to the lower-middle of the sprite (around the torso and feet), which suits top-down 3/4 art. Not a circle, because a rectangle fits a standing character better.

4. **Bounds via `physics.world.setBounds(0, 0, WORLD.width, WORLD.height)` + `setCollideWorldBounds(true)`.** Arcade clamps the body (the hurtbox), so the sprite may overlap the border by a few pixels. That's fine since the border is a wall. The camera uses `cameras.main.setBounds(...)` with the same numbers and `startFollow(player, true, lerp, lerp)` (round pixels on to avoid shimmer in pixel art).

5. **World size 2400×1600 (75×50 tiles of 32 px)** in `src/config/world.js`, about 2.5×3 screens. Large enough to show scrolling, small enough to reach the walls in a short video.

6. **Stand-in floor:** one small generated texture (a 32×32 tile with a 1 px grid line) drawn as a `TileSprite` covering the world, plus a rectangle border. Generated at runtime, so nothing is added to the manifest or ASSETS.md. It is removed when the Tiled map lands.

7. **Aim facing uses `pointer.worldX`.** "Pointer used" turns true on the first `pointermove` inside the canvas. Until then facing follows movement. This means the body won't flip to wherever the mouse happens to be at the start.

8. **Test hook.** In dev builds, `GameScene` sets `this.player` and tests read `__GAME__.scene.getScene('Game').player.body` / `.cameras.main`. No extra global. E2E holds keys for set times and checks positions/velocity, with tolerances because of frame timing in headless swiftshader.

## Risks / Trade-offs

- [Headless frame timing is uneven, so distance-based e2e checks are flaky] → assert on `body.velocity` magnitude (exact) and on direction/bounds, not on exact distance travelled.
- [Camera lerp + round pixels can jitter at low lerp] → lerp 0.1 default in config. Tune by eye while recording.
- [Placeholder body is symmetric, so flipX is invisible in the video] → the placeholder generator already draws a facing mark if present; if not, the e2e asserts `flipX` and the video still shows camera and bounds.
