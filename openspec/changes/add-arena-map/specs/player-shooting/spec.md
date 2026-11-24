# Spec Delta

## MODIFIED Requirements

### Requirement: Bullet lifetime and despawn
Bullets SHALL leave from the gun tip, a configured distance from the player along the aim. A bullet SHALL despawn and return to the pool when the first of these happens: its lifetime ends, it hits a wall or obstacle tile, or it leaves the arena.

#### Scenario: Lifetime ends
- **WHEN** a bullet has been in flight for its configured lifetime without hitting a wall or leaving the arena
- **THEN** it is removed from play and its pool slot becomes free

#### Scenario: Hits a wall
- **WHEN** a bullet reaches a wall or obstacle tile before its lifetime ends
- **THEN** it is removed from play at the wall and its pool slot becomes free

#### Scenario: Leaves the arena
- **WHEN** a bullet crosses the arena edge before its lifetime ends (for example, after being spawned outside the walls)
- **THEN** it is removed from play and its pool slot becomes free
