# arena-map Specification

## Purpose
Defines the arena level the game is played in: a Tiled tile map with floor, walls/obstacles, and decor. Covers its size, where the player spawns, which tiles block movement and bullets, and how it looks before the real tileset arrives.

## Requirements

### Requirement: Tiled arena map
The arena SHALL be loaded from a Tiled JSON map in the repository that uses 32×32 px tiles and measures 60 tiles wide by 40 tiles high (1920×1280 px). The map SHALL contain tile layers named `floor`, `walls`, and `decor`, and an object layer named `spawns`. It SHALL use one tileset that is drawn from the `tiles_arena` asset key. The map file SHALL stay openable and editable in Tiled.

#### Scenario: Map structure
- **WHEN** the unit tests load the arena map file
- **THEN** it is 60×40 tiles of 32×32 px, has the `floor`, `walls`, `decor`, and `spawns` layers, and its single tileset matches the `tiles_arena` manifest entry (32×32 tiles, 8 columns, 64 tiles)

#### Scenario: Map drives the world size
- **WHEN** a game session starts
- **THEN** the physics world and camera bounds are both 1920×1280 px, which is the map's size in pixels

### Requirement: Enclosed arena with open floor
Every floor cell SHALL be covered by the `floor` layer. The outer ring of cells on the `walls` layer SHALL be wall tiles, so the arena is closed. The interior SHALL contain wall or obstacle tiles placed so that every non-wall cell is reachable from the player spawn, and every gap between obstacles SHALL be at least 2 tiles wide.

#### Scenario: Closed border
- **WHEN** the unit tests inspect the `walls` layer
- **THEN** every cell in the first and last row and the first and last column holds a wall tile

#### Scenario: Interior obstacles
- **WHEN** the unit tests inspect the `walls` layer
- **THEN** at least 8 separate obstacle groups exist inside the border

#### Scenario: No sealed pockets
- **WHEN** the unit tests flood-fill the non-wall cells starting from the player spawn
- **THEN** every non-wall cell in the map is reached

### Requirement: Player spawn point
The `spawns` layer SHALL contain one point named `player`. A game session SHALL start the player at that point. The spawn point and the area within 4 tiles of it SHALL be free of wall tiles.

#### Scenario: Player starts at the spawn
- **WHEN** a game session starts
- **THEN** the player's position equals the `player` spawn point from the map

#### Scenario: Clear start area
- **WHEN** the unit tests check the cells within 4 tiles of the player spawn
- **THEN** none of them holds a wall tile

### Requirement: Walls and obstacles block the player
Every tile on the `walls` layer SHALL be solid. Tiles on `floor` and `decor` SHALL NOT be solid. The player's hurtbox SHALL NOT overlap a solid tile.

#### Scenario: Walk into an obstacle
- **WHEN** the player holds a movement key toward an interior obstacle until it reaches it
- **THEN** the player stops flush against the obstacle, and its hurtbox does not overlap any solid tile

#### Scenario: Slide along a wall
- **WHEN** the player is flush against a wall on its left and holds A and W together
- **THEN** the player keeps moving up along the wall and does not move left

#### Scenario: Decor does not block
- **WHEN** the player walks across a cell that has a `decor` tile and no wall tile
- **THEN** its movement is not blocked

### Requirement: Bullets stop at walls and obstacles
A bullet SHALL despawn and free its pool slot on the first solid tile it touches, whatever pierce it has left.

#### Scenario: Shoot a wall
- **WHEN** the player fires toward a wall that is closer than the bullet's range
- **THEN** the bullet despawns where it reaches the wall's edge and does not appear on the far side

#### Scenario: Pierce does not pass walls
- **WHEN** a bullet with pierce 3 reaches a wall
- **THEN** it despawns at the wall

#### Scenario: Point-blank shot against a wall
- **WHEN** the player stands flush against a wall and fires into it, so that the gun tip is inside the wall
- **THEN** the shot hits the wall: no bullet appears beyond the wall, and the shot still counts as fired (muzzle flash and fired event)

### Requirement: Shared wall collision for other actors
The arena SHALL offer a single way for other moving objects (such as enemies added in later tickets) to collide with the same solid tiles as the player. It SHALL also offer a way to ask whether a world position lies on a solid tile.

#### Scenario: A new actor collides with walls
- **WHEN** a physics body is registered with the arena's wall collision and moved into a wall
- **THEN** it stops at the wall the same way the player does

#### Scenario: Solid-tile query
- **WHEN** code asks whether a world position inside a wall tile is solid, and then asks the same about a position on open floor
- **THEN** the answers are yes and no

### Requirement: Readable placeholder tiles
Until `gh_tiles_arena.png` is delivered, the placeholder tileset SHALL tint its tiles by row according to the GH-19 layout in ASSETS.md, so floor, wall, obstacle, and decor tiles look visibly different. Floor tiles SHALL be the lowest-contrast. Once the real tileset is added, the same map SHALL render with it without being edited.

#### Scenario: Placeholder layout is readable
- **WHEN** the game runs without `gh_tiles_arena.png`
- **THEN** walls and obstacles look clearly different from floor and decor tiles

#### Scenario: Real tileset drops in
- **WHEN** a correctly sized `gh_tiles_arena.png` is added and the game is reloaded
- **THEN** the map renders with the real tiles and the collision behavior is unchanged
