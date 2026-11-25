# player-movement Specification

## MODIFIED Requirements

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
