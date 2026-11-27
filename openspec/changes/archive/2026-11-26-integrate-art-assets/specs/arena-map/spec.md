## MODIFIED Requirements

### Requirement: Tiled arena map
The arena SHALL be loaded from a Tiled JSON map in the repository that uses 32×32 px tiles and measures 60 tiles wide by 40 tiles high (1920×1280 px). The map SHALL contain tile layers named `floor`, `walls`, and `decor`, and an object layer named `spawns`. It SHALL use one tileset that is drawn from the `tiles_arena` asset key: 8 columns × 6 rows of 32×32 tiles (48 tiles, 256×192 px) with no spacing or margin. The map file SHALL stay openable and editable in Tiled.

#### Scenario: Map structure
- **WHEN** the unit tests load the arena map file
- **THEN** it is 60×40 tiles of 32×32 px, has the `floor`, `walls`, `decor`, and `spawns` layers, and its single tileset matches the `tiles_arena` manifest entry (32×32 tiles, 8 columns, 48 tiles)

#### Scenario: Map drives the world size
- **WHEN** a game session starts
- **THEN** the physics world and camera bounds are both 1920×1280 px, which is the map's size in pixels

## ADDED Requirements

### Requirement: Arena tile dressing
Each layer SHALL use only tiles meant for it. `floor` SHALL use floor tiles, `decor` SHALL use walk-over prop tiles, and `walls` SHALL use wall and obstacle tiles. The outer ring SHALL use the matching straight edge on each side and the matching corner tile in each of the four corners. Interior obstacles SHALL be drawn as complete obstacles: a 2×2 obstacle SHALL use all four tiles of one 2×2 obstacle, in order, and a single cell SHALL use a 1×1 obstacle tile. Re-skinning the map SHALL NOT change which cells are solid or where the player spawns.

#### Scenario: Corners and edges
- **WHEN** the unit tests inspect the `walls` layer
- **THEN** the four corner cells hold the NW, NE, SW and SE corner tiles, and every other cell of the top, bottom, left and right rows or columns holds that side's edge tile

#### Scenario: Whole 2×2 obstacles
- **WHEN** the unit tests inspect each 2×2 interior obstacle group
- **THEN** its four cells hold the top-left, top-right, bottom-left and bottom-right tiles of the same 2×2 obstacle

#### Scenario: Layers use their own tiles
- **WHEN** the unit tests check every non-empty cell against the tile names in the map's tileset
- **THEN** `floor` cells are floor tiles, `decor` cells are prop tiles, and `walls` cells are wall or obstacle tiles

#### Scenario: Same solid cells as before
- **WHEN** the map is re-skinned from the previous map
- **THEN** the non-empty `walls` cells are exactly the same cells as before and the player spawn point is unchanged; the re-skin fails without writing the map if either differs
