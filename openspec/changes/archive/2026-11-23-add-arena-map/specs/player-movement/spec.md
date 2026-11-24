# Spec Delta

## MODIFIED Requirements

### Requirement: Arena bounds
The arena SHALL be a fixed world size taken from the arena map, larger than the screen. The player SHALL NOT be able to move any part of its hurtbox outside the arena, and SHALL NOT be able to overlap any wall or obstacle tile.

#### Scenario: Walk into a wall
- **WHEN** the player holds A long enough to reach the left edge of the arena
- **THEN** the player stops flush against the border wall and stays fully inside the arena

#### Scenario: World size comes from the map
- **WHEN** a game session starts
- **THEN** the arena's width and height equal the map's width and height in pixels
