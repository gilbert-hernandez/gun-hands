# Spec Delta

## MODIFIED Requirements

### Requirement: WASD movement at configured speed
The player SHALL move with W (up), A (left), S (down) and D (right) at the player's current move speed. Each session SHALL start the player's move speed at the value defined in the player config; raising it during the run (as upgrades do) SHALL NOT change the configuration. Pressing opposite keys together SHALL cancel out on that axis. With no keys held the player SHALL stop.

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

### Requirement: Normalized diagonal movement
Moving diagonally SHALL NOT be faster than moving along one axis. The speed when two perpendicular keys are held SHALL equal the player's current move speed.

#### Scenario: Move diagonally
- **WHEN** the player holds W and D together
- **THEN** the player moves up and to the right, and its total speed equals the player's current move speed (within 1%)
