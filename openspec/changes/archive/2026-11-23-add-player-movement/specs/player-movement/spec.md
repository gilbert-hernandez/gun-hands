# Spec Delta

## Purpose

Defines how the player character moves around the arena, which way it faces, how it is kept inside the arena, how the camera follows it, and the size of its hurtbox.

## ADDED Requirements

### Requirement: WASD movement at configured speed
The player SHALL move with W (up), A (left), S (down) and D (right) at the move speed defined in the player config. Pressing opposite keys together SHALL cancel out on that axis. With no keys held the player SHALL stop.

#### Scenario: Move right
- **WHEN** the player holds D during a game session
- **THEN** the player moves right at the configured move speed

#### Scenario: Release keys
- **WHEN** the player releases all movement keys
- **THEN** the player stops moving

#### Scenario: Opposite keys
- **WHEN** the player holds A and D at the same time
- **THEN** the player does not move horizontally

### Requirement: Normalized diagonal movement
Moving diagonally SHALL NOT be faster than moving along one axis. The speed when two perpendicular keys are held SHALL equal the configured move speed.

#### Scenario: Move diagonally
- **WHEN** the player holds W and D together
- **THEN** the player moves up and to the right, and its total speed equals the configured move speed (within 1%)

### Requirement: Facing direction
The player body SHALL face left or right. When the mouse pointer has been moved over the game, the body SHALL face the side of the player the pointer is on. Before that, it SHALL face the last horizontal direction moved. Moving only vertically SHALL keep the current facing. The body SHALL play its run animation while moving and its idle animation while still.

#### Scenario: Face by movement
- **WHEN** the pointer has not been used and the player moves left
- **THEN** the body faces left

#### Scenario: Face by aim
- **WHEN** the pointer is to the left of the player while the player moves right
- **THEN** the body faces left

#### Scenario: Run and idle animation
- **WHEN** the player starts moving and then stops
- **THEN** the body plays the run animation while moving and returns to the idle animation when stopped

### Requirement: Arena bounds
The arena SHALL be a fixed world size from config, larger than the screen. The player SHALL NOT be able to move any part of its hurtbox outside the arena.

#### Scenario: Walk into a wall
- **WHEN** the player holds A long enough to reach the left edge of the arena
- **THEN** the player stops at the edge and stays fully inside the arena

### Requirement: Camera follow clamped to the arena
The camera SHALL follow the player with smoothing (lerp from config) and SHALL never show anything outside the arena.

#### Scenario: Camera follows
- **WHEN** the player moves away from the arena center
- **THEN** the camera scrolls after the player and the player stays near the middle of the screen

#### Scenario: Camera at the edge
- **WHEN** the player stands in a corner of the arena
- **THEN** the camera stops at the arena edge, so the player is off-center and no area outside the arena is visible

### Requirement: Hurtbox smaller than the sprite
The player SHALL have a physics hurtbox smaller than its 32×32 sprite, with size and offset set in the player config, so that later hits only count when they touch the character's body.

#### Scenario: Hurtbox size
- **WHEN** a game session starts
- **THEN** the player's hurtbox width and height are both smaller than 32 px and match the player config
