## MODIFIED Requirements

### Requirement: Enemy death
When an enemy's HP reaches 0 or below, it SHALL be removed from play in the same frame, freeing its pool slot, so it can no longer be hit, block bullets, or hurt the player. That enemy type's death animation SHALL play once at the enemy's position, facing the way the enemy faced, and disappear when it finishes. It SHALL be purely visual and SHALL NOT collide with or damage anything. Death animations SHALL come from a fixed pool; when the pool is exhausted, the animation SHALL be skipped without error and the death still counts.

#### Scenario: Kill
- **WHEN** a Grunt with 10 HP is hit by a 10-damage bullet
- **THEN** the Grunt is removed from play that frame, the live enemy count drops by one, and the Grunt death animation plays at its position

#### Scenario: Runner explosion is only a look
- **WHEN** a Runner dies next to the player and other enemies
- **THEN** its explosion death animation plays, and no HP changes for the player or any enemy because of it

#### Scenario: Faces the way it walked
- **WHEN** an enemy walking left dies
- **THEN** its death animation is mirrored to face left

#### Scenario: Puff pool exhausted
- **WHEN** more enemies die at once than there are pooled death animations
- **THEN** every death is counted and removed from play, and no error occurs

## ADDED Requirements

### Requirement: Impact sparks
When a bullet hits an enemy or a solid tile, an impact spark SHALL play once at the point of the hit and then disappear. Sparks SHALL come from a fixed pool; when the pool is exhausted, the spark SHALL be skipped without error, and the hit itself SHALL be unaffected.

#### Scenario: Bullet hits a wall
- **WHEN** a bullet despawns on a wall
- **THEN** an impact spark plays where the bullet reached the wall

#### Scenario: Bullet hits an enemy
- **WHEN** a bullet damages an enemy
- **THEN** an impact spark plays at the bullet's position

### Requirement: Player hurt animation
When the player takes damage and survives, the body SHALL play its hurt animation once, then return to its run or idle animation. The hurt animation SHALL NOT change invulnerability, blinking, movement or firing.

#### Scenario: Hit and recover
- **WHEN** the player at 100 HP is touched by a Grunt while standing still
- **THEN** the body plays the hurt animation once and then returns to idle, and the invulnerability time is the same as without the animation

#### Scenario: Killing hit
- **WHEN** a hit takes the player to 0 HP
- **THEN** the death animation plays, not the hurt animation
