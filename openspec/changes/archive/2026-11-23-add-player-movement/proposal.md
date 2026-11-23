# Proposal

## Why

Vikunja: GH-2. Right now the Game scene only shows a static player. Every later feature (shooting, enemies, pickups) needs a player who can move around a bounded arena with the camera following, so this comes first.

## What Changes

- The player moves with WASD at a speed set in a new player config module. Diagonal movement is normalized, so it is no faster than straight movement.
- The body sprite faces left or right. It follows the mouse aim when the pointer is in use, and otherwise the last horizontal movement direction. It plays the run animation while moving and idle while still.
- The gun-hands layer stays attached to the body (it does not rotate yet; that comes with shooting).
- The arena is a fixed-size world (larger than the screen) with a visible floor grid and border, so movement and camera scrolling can be seen before the real Tiled map arrives.
- The player cannot leave the world bounds.
- The camera follows the player with a small lerp and never shows outside the world.
- The player gets an Arcade Physics body whose hurtbox is smaller than the 32×32 sprite, sized and offset from config.
- A Playwright e2e test checks movement, diagonal speed, bounds, and camera clamping. The `npm run record` script drives the new movement so the demo video shows it.

## Non-goals

- Shooting, aiming the guns, or rotating the gun-hands sprite (later GH tickets).
- Enemies, collisions with enemies, damage, or i-frames.
- The real Tiled arena map and collision tiles (the floor grid is a stand-in).
- Gamepad or touch controls, and remappable keys.
- Dash, acceleration curves, or knockback.

## Capabilities

### New Capabilities
- `player-movement`: how the player moves, faces, stays inside the arena, how the camera follows, and the player's hurtbox.

### Modified Capabilities
<!-- none -->

## Impact

- New: `src/config/player.js`, `src/config/world.js`, `src/player/movement.js` (pure logic), `src/player/Player.js`, unit tests, `e2e/movement.spec.js`.
- Changed: `src/config/index.js` (exports), `src/scenes/GameScene.js` (builds world, player, camera; drops the static demo sprites), `scripts/record.js` (movement route).
- In dev builds, Game exposes a small read-only state on `window.__GAME__` for tests (already the pattern for scenes). No new dependencies.
