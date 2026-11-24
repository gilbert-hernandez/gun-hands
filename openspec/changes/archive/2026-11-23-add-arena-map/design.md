# Design

## Context

Today `GameScene.createStandInFloor()` draws a generated grid `tileSprite` and a rectangle border over a 2400×1600 world sized by `WORLD.width`/`WORLD.height`. The player stays inside only through `setCollideWorldBounds`. Bullets despawn on lifetime or on leaving `physics.world.bounds`. The manifest already declares the GH-19 tileset (`tiles_arena`, type `tileset`, 8×8 grid of 32×32, 64 tiles), and the placeholder for it is a brown checkerboard in which every tile looks alike. There's no `src/world/` folder and nothing loads JSON yet. The e2e tests import `WORLD` to find the world edges.

See proposal.md (Why) for motivation and specs/ for the required behavior.

## Goals / Non-Goals

**Goals:**
- One committed map file that is both what the game loads and what a person opens in Tiled.
- Collision that doesn't depend on how david draws or arranges the tiles.
- One small `Arena` object that GameScene and the later enemy code talk to, so they never touch Phaser tilemap APIs directly.
- Map rules (size, closed border, reachability, clear spawn) checked by fast unit tests, not by eye.

**Non-Goals:**
- Autotiling wall corners and edges. The map uses one generic wall tile; david or Gilbert can pick corner tiles in Tiled later, and collision is unaffected.
- Spatial or nav-mesh data for enemies (see proposal Non-goals).

## Decisions

### 1. The map JSON is the source of truth, imported as a module
`src/assets/maps/gh_arena.json` is a normal Tiled map (orthogonal, 60×40, 32 px, CSV-style `data` arrays, embedded tileset). PreloadScene `import`s it and calls `this.load.tilemapTiledJSON('map_arena', arenaJson)` with the parsed object. The unit tests import the same file.
- *Alternative: load by URL (`?url` + fetch at runtime).* Rejected. It adds a network request and an async path, and the tests would have to read the file a different way. The map is about 30 KB, so bundling it costs nothing.
- The first layout is written by a throwaway Node script during apply. The script isn't committed: after that the JSON is the only source, and edits happen in Tiled or by hand. That avoids having a generator and a map that drift apart.

### 2. The tileset is embedded, with the image path pointing at the real PNG
Phaser can't load external `.tsx` tilesets, so the tileset is embedded in the map: `name: "gh_tiles_arena"`, `tilewidth/height 32`, `columns 8`, `tilecount 64`, `image: "../img/gh_tiles_arena.png"`, `imagewidth/height 256`. In Tiled, the map shows real art as soon as david's PNG is in `src/assets/img/`. In the game, `map.addTilesetImage('gh_tiles_arena', 'tiles_arena')` binds it to the manifest key. That key is either the real PNG or the generated placeholder, so missing art is handled by the existing pipeline with no special case.

### 3. Collision is per layer, not per tile property
`wallsLayer.setCollisionByExclusion([-1])`: every non-empty cell on `walls` is solid. `floor` and `decor` get no collision.
- *Alternative: a Tiled `collides` property on individual tiles.* Rejected. It ties collision to the tileset metadata, so a re-exported tileset or a decor tile accidentally placed on `walls` would silently change gameplay. With per-layer collision, which layer a tile is on is the only thing that matters, and anyone can see that in Tiled.

### 4. A pinned tile layout in ASSETS.md (resolves an existing conflict)
ASSETS.md currently suggests "row 5 obstacles (a 2×2 obstacle uses a 2×2 block of cells), row 6 walk-over props". A 2×2 block can't fit in one row. The layout becomes:

| Rows | Tile ids | Use |
| ---- | -------- | --- |
| 1–2  | 0–15     | floor and floor details (low contrast) |
| 3–4  | 16–31    | walls and wall corners |
| 5–6  | 32–47    | obstacles (2×2 blocks span rows 5–6) |
| 7    | 48–55    | walk-over decor / props |
| 8    | 56–63    | spare (transparent) |

The map uses: floor 0 (with 1–3 scattered as variants), wall 16, 2×2 obstacle 32/33/40/41, and decor 48–51. Tiled stores these as gids (id + 1, `firstgid` 1). The placeholder tints by the same rows, so the layout is readable now and matches what david will deliver.

### 5. An `Arena` wrapper plus pure helpers
- `src/world/arenaMap.js` (no Phaser): `getLayer(json, name)`, `cellAt(layer, col, row)`, `isWallCell`, `findSpawn(json, 'player')`, `reachableCells(json, start)` (flood fill), and `countObstacleGroups`. The unit tests and `Arena` both use these.
- `src/world/Arena.js`: `new Arena(scene)` builds the tilemap and layers with depths floor −10, decor −9, walls −8 (all below actors at ≥ 0), and enables wall collision. It exposes:
  - `width`, `height`: pixel size of the map.
  - `spawn`: `{x, y}` of the player point.
  - `collide(target, onHit?)`: adds an Arcade collider between `target` (a sprite or group) and the walls layer, and returns it.
  - `isSolidAt(x, y)`: true if the walls layer has a tile at that world position.
- GameScene: `this.arena = new Arena(this)`. It sets the world and camera bounds from `arena.width`/`height`, spawns the player at `arena.spawn`, then calls `arena.collide(this.player)` and `arena.collide(this.bullets.group, (b) => b.despawn())`. `createStandInFloor` and the `stand_in_floor` texture are deleted.

### 6. Bullets: a collider callback, with world bounds kept as a fallback
The bullet–wall collider calls `despawn()`. The bullet is separated from the tile in the same step, so it never shows inside the wall. Pierce is not consulted (spec: walls always stop bullets). The world-bounds check in `Bullet.update` stays as a fallback for bullets spawned outside the walls, for example by test code or by a future spawn bug. At 480 px/s a bullet moves about 8 px per 60 Hz physics step, well under the 32 px tile, so it can't tunnel through.

### 6a. Point-blank shots are checked before spawning
The gun tip is 14 px from the player's center, but against a wall the center is only 8 px from the face. The tip is then inside the wall, and Arcade only stops bodies that cross a tile face from outside, so those bullets passed straight through (found in manual testing). Before spawning a shot, `Player.fire` samples the segment from the player's center along the aim for `muzzleOffset` plus the bullet radius, every 4 px, using `arena.isSolidAt` (the pure `pathBlocked` helper in `aim.js`). If any sample is solid, the shot hits the wall: no bullets spawn, and `player-fired` is still emitted with `blocked: true` so the muzzle flash shows and a later impact effect can hook it.
- *Alternative: shorten the muzzle offset, or push the spawn point back out of the wall.* Rejected. A shorter offset changes how the guns look and only moves the problem. Pushing the spawn out of the wall would let a point-blank shot appear on the near side and fly away, which reads as the bullet bouncing.

### 7. `WORLD` loses width and height
`src/config/world.js` keeps only `cameraLerp`. The world size is data in the map, not a tunable. A second copy in config could disagree with the map, and nothing would notice. The e2e tests read the size from the imported map JSON (`width * tilewidth`), and wall-edge checks use the inner edge of the border (32 px in) instead of 0 or the world width.

### 8. Layout rules
- Border: a 1-tile wall ring.
- 10–12 obstacle groups: 2×2 rocks plus a few straight 1-tile-thick wall runs of 4–8 tiles and one or two L-shapes. Roughly mirror-symmetric, so no side of the map is safer than another.
- Obstacles stay at least 3 tiles from the border, leaving a loop to run along the outside.
- At least 3-tile gaps between obstacles, above the spec minimum of 2, so a 64 px Brute fits through easily.
- The spawn is at the map center (tile 30, 20) with nothing solid within 4 tiles.

## Risks / Trade-offs

- [The pinned tile layout changes ASSETS.md guidance before david starts (11/26)] → Change it now, while GH-19 hasn't started, and note it in the GH-19 ticket so david sees it.
- [Faster bullets from later upgrades could tunnel through 1-tile walls] → The current maximum is far below the limit (~1900 px/s at 60 Hz). Note the limit in `weapon.js` beside `speed`.
- [Existing e2e tests assume walls at 0 and the world width] → Update them in the same change (task list). `npm run e2e` must pass before archive.
- [Hand-editing JSON is error-prone] → Unit tests cover structure, closed border, reachability, and clear spawn, so a bad edit in Tiled or by hand fails `npm test` and CI.
- [Every layer sits under the actors, so 3/4 walls never overlap sprites] → An accepted look for the demo; listed in proposal Non-goals.

## Migration Plan

Internal only: no saved data and nothing deployed depends on the world size. To roll back, revert the branch.
