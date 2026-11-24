# Proposal

## Why

Vikunja: GH-4. The arena is currently a generated grid floor with a drawn border. It has no obstacles, so there's no terrain to kite around and no real level data for david's tileset (GH-19) to fill in. A Tiled map with colliding walls and obstacles turns the empty rectangle into a real level. Enemies (the next M1 tickets) need it before they can path around anything.

## What Changes

- Add a Tiled JSON arena map, 60×40 tiles of 32×32 px (1920×1280 px), checked into `src/assets/maps/`. It has three tile layers (`floor`, `walls`, `decor`) and one object layer (`spawns`) with the player spawn point. The map stays editable in Tiled.
- The map uses the existing `tiles_arena` tileset key (GH-19). Until david delivers `gh_tiles_arena.png`, the placeholder tileset is tinted by row (floor, wall, obstacle, decor) so the layout reads clearly.
- Load the map in Preload. In Game, build the layers and replace the stand-in grid floor and border.
- Every tile on the `walls` layer collides; `floor` and `decor` never do. The player collides with walls. Bullets despawn on the first wall tile they hit. An arena helper lets later enemy code collide with the same layer in one call.
- **BREAKING (internal):** the world size now comes from the map instead of `WORLD.width`/`WORLD.height` in `src/config/world.js`. Those two values are removed; `cameraLerp` stays. Code and tests that read them switch to the map's size.
- The player starts at the map's `player` spawn point instead of the world center.
- Pin the GH-19 tile layout in ASSETS.md (which rows are floor, wall, obstacle, decor) so david's tileset drops into the existing map unchanged.

## Non-goals

- Enemy spawning, enemy movement, and enemy–wall collision wiring. The enemy tickets call the arena collision helper this change adds.
- Pathfinding or flow fields around obstacles.
- Bullet impact FX or sounds on wall hits (later polish; the wall hit is a single code path where they can be added).
- Several maps, map selection, or procedural layouts.
- Walls that hide actors (3/4 overlap and depth sorting). Every tile layer draws below the actors.
- Real tile art. That's GH-19 (david); this change works entirely on placeholders.

## Capabilities

### New Capabilities

- `arena-map`: the Tiled arena map, its layers and size, the player spawn point, wall collision for the player and bullets, the shared collision helper for later actors, and readable placeholder tiles.

### Modified Capabilities

- `player-movement`: "Arena bounds" now takes the world size from the map rather than config, and the player is also blocked by wall and obstacle tiles.
- `player-shooting`: "Bullet lifetime and despawn" adds despawning when a bullet hits a wall or obstacle tile.

## Impact

- New: `src/assets/maps/gh_arena.json` (Tiled map), `src/world/Arena.js` (builds layers and colliders), `src/world/arenaMap.js` (pure map helpers for tests), `tests/arenaMap.test.js`, `e2e/arena.spec.js`.
- Changed: `src/scenes/PreloadScene.js` (loads the map), `src/scenes/GameScene.js` (uses the arena; the stand-in floor is removed), `src/config/world.js` (width and height removed), `src/assets/placeholders.js` (row-tinted tileset), `ASSETS.md` (GH-19 tile layout), `e2e/movement.spec.js` and `e2e/shooting.spec.js` (map size and wall edges instead of `WORLD` and the world edge).
- No new dependencies. Phaser's built-in Tilemap and Arcade tile collision are enough. Tiled is optional and only needed to edit the map by hand.
