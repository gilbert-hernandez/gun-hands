# player-movement Specification

## Purpose
Defines how the player character moves around the arena, which way it faces, how it is kept inside the arena, how the camera follows it, and the size of its hurtbox.

## Requirements

### Requirement: WASD movement at configured speed
The player SHALL move with W (up), A (left), S (down) and D (right) at the player's current move speed. Each session SHALL start the player's move speed at the value defined in the player config; raising it during the run (as upgrades do) SHALL NOT change the configuration. Pressing opposite keys together SHALL cancel out on that axis. In touch mode the player SHALL instead move in the direction of the move stick, at any angle, at the full current move speed once the thumb is past the dead zone. With no keys held and no move stick past its dead zone, the player SHALL stop.

#### Scenario: Move right
- **WHEN** the player holds D during a game session
- **THEN** the player moves right at the configured move speed

#### Scenario: Raised speed
- **WHEN** the player's move speed has been raised to 240 px/s during the run and the player holds D
- **THEN** the player moves right at 240 px/s, and a new session starts again at the configured move speed

#### Scenario: Release keys
- **WHEN** the player releases all movement keys
- **THEN** the player stops moving

#### Scenario: Opposite keys
- **WHEN** the player holds A and D at the same time
- **THEN** the player does not move horizontally

#### Scenario: Move by stick
- **WHEN** the move stick is dragged past the dead zone at 30° below right
- **THEN** the player moves at that angle at its current move speed (within 1%)

#### Scenario: Inside the dead zone
- **WHEN** the move stick is held inside the dead zone
- **THEN** the player stands still

### Requirement: Normalized diagonal movement
Moving diagonally SHALL NOT be faster than moving along one axis. The speed when two perpendicular keys are held SHALL equal the player's current move speed.

#### Scenario: Move diagonally
- **WHEN** the player holds W and D together
- **THEN** the player moves up and to the right, and its total speed equals the player's current move speed (within 1%)

### Requirement: Facing direction
The player body SHALL face left or right. When the mouse pointer has been moved over the game, the body SHALL face the side of the player the pointer is on. In touch mode, once the aim stick has been used, the body SHALL face the side the aim points to; an exactly vertical aim SHALL follow the horizontal movement, or keep the current facing. Before any aim, it SHALL face the last horizontal direction moved. Moving only vertically SHALL keep the current facing. The body SHALL play its run animation while moving and its idle animation while still.

#### Scenario: Face by movement
- **WHEN** the pointer has not been used and the player moves left
- **THEN** the body faces left

#### Scenario: Face by aim
- **WHEN** the pointer is to the left of the player while the player moves right
- **THEN** the body faces left

#### Scenario: Run and idle animation
- **WHEN** the player starts moving and then stops
- **THEN** the body plays the run animation while moving and returns to the idle animation when stopped

#### Scenario: Face by aim stick
- **WHEN** the aim stick points left while the move stick points right
- **THEN** the body faces left

### Requirement: Arena bounds
The arena SHALL be a fixed world size taken from the arena map, larger than the screen. The player SHALL NOT be able to move any part of its hurtbox outside the arena, and SHALL NOT be able to overlap any wall or obstacle tile.

#### Scenario: Walk into a wall
- **WHEN** the player holds A long enough to reach the left edge of the arena
- **THEN** the player stops flush against the border wall and stays fully inside the arena

#### Scenario: World size comes from the map
- **WHEN** a game session starts
- **THEN** the arena's width and height equal the map's width and height in pixels

### Requirement: Camera follow clamped to the arena
The camera SHALL follow the player with smoothing (lerp from config) and SHALL never show anything outside the arena.

#### Scenario: Camera follows
- **WHEN** the player moves away from the arena center
- **THEN** the camera scrolls after the player and the player stays near the middle of the screen

#### Scenario: Camera at the edge
- **WHEN** the player stands in a corner of the arena
- **THEN** the camera stops at the arena edge, so the player is off-center and no area outside the arena is visible

### Requirement: Hurtbox smaller than the sprite
The player SHALL have a physics hurtbox smaller than its 32×32 sprite, with size and offset set in the player config, so that later hits only count when they touch the character's body. The configured offset SHALL place the hurtbox on the body as drawn facing right. When the body faces left, the hurtbox SHALL be mirrored across the sprite's vertical center line so it stays on the drawn body. Facing SHALL NOT change the hurtbox's size.

#### Scenario: Hurtbox size
- **WHEN** a game session starts
- **THEN** the player's hurtbox width and height are both smaller than 32 px and match the player config

#### Scenario: Hurtbox follows the facing
- **WHEN** the player turns from facing right to facing left
- **THEN** the hurtbox's horizontal offset inside the sprite becomes 32 minus the configured offset minus the hurtbox width, and its size and vertical offset are unchanged
