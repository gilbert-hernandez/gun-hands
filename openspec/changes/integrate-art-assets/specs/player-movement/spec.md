## MODIFIED Requirements

### Requirement: Hurtbox smaller than the sprite
The player SHALL have a physics hurtbox smaller than its 32×32 sprite, with size and offset set in the player config, so that later hits only count when they touch the character's body. The configured offset SHALL place the hurtbox on the body as drawn facing right. When the body faces left, the hurtbox SHALL be mirrored across the sprite's vertical center line so it stays on the drawn body. Facing SHALL NOT change the hurtbox's size.

#### Scenario: Hurtbox size
- **WHEN** a game session starts
- **THEN** the player's hurtbox width and height are both smaller than 32 px and match the player config

#### Scenario: Hurtbox follows the facing
- **WHEN** the player turns from facing right to facing left
- **THEN** the hurtbox's horizontal offset inside the sprite becomes 32 minus the configured offset minus the hurtbox width, and its size and vertical offset are unchanged
