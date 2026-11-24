# combat Specification

## Purpose
Defines how the player and enemies hurt each other: bullet hits on enemies with hit feedback and death, contact damage to the player with invulnerability, the player's HP and death sequence into GameOver with run stats, and the events other systems use to react to combat.

## Requirements

### Requirement: Bullets damage enemies
When a live bullet overlaps a live enemy's hurtbox, the enemy SHALL lose HP equal to the bullet's damage, and the bullet SHALL then apply its pierce rule (use one pierce and stay in flight, or despawn). A bullet SHALL damage a given enemy at most once during its flight, even if it overlaps that enemy over several frames. A bullet that has despawned SHALL NOT damage anything.

#### Scenario: Damage applied
- **WHEN** a bullet with damage 10 hits a Grunt with 30 HP
- **THEN** the Grunt has 20 HP and the bullet (pierce 0) is removed from play

#### Scenario: Piercing bullet hits once per enemy
- **WHEN** a bullet with pierce 1 passes through a Brute over several frames and then reaches a second enemy
- **THEN** the Brute loses HP exactly once, the second enemy loses HP once, and the bullet despawns on the second enemy

#### Scenario: One bullet, one enemy
- **WHEN** a bullet with pierce 0 reaches two overlapping enemies in the same frame
- **THEN** exactly one of them takes damage

### Requirement: Hit flash
A damaged enemy that survives the hit SHALL be drawn solid white for a configured flash time and then return to its normal look (its placeholder tint, or untinted when real art is present). Another hit during the flash SHALL restart the flash time.

#### Scenario: Flash and restore
- **WHEN** a Runner using placeholder art is hit and survives
- **THEN** it is drawn solid white right after the hit, and after the flash time it is drawn with its placeholder tint again

### Requirement: Knockback
A damaged enemy that survives the hit SHALL be pushed along the hitting bullet's direction of travel at a speed set by its type, for a configured knockback time. While knocked back, the enemy SHALL NOT steer toward the player, and walls SHALL still stop it. Relative to the Grunt, the Runner's knockback SHALL be stronger and the Brute's weaker.

#### Scenario: Pushed away
- **WHEN** a bullet travelling right hits a Grunt that survives
- **THEN** the Grunt moves right during the knockback time and then resumes chasing the player

#### Scenario: Knockback into a wall
- **WHEN** an enemy standing next to a wall is knocked back toward it
- **THEN** its hurtbox does not overlap a wall tile

#### Scenario: Knockback order by type
- **WHEN** the unit tests read the enemy configuration
- **THEN** Runner knockback > Grunt knockback > Brute knockback > 0

### Requirement: Enemy death
When an enemy's HP reaches 0 or below, it SHALL be removed from play in the same frame, freeing its pool slot, so it can no longer be hit, block bullets, or hurt the player. A death puff effect SHALL play once at the enemy's position, scaled to the enemy's sprite size, and disappear when it finishes. Puff effects SHALL come from a fixed pool; when the pool is exhausted, the puff SHALL be skipped without error and the death still counts.

#### Scenario: Kill
- **WHEN** a Grunt with 10 HP is hit by a 10-damage bullet
- **THEN** the Grunt is removed from play that frame, the live enemy count drops by one, and a puff plays at its position

#### Scenario: Puff pool exhausted
- **WHEN** more enemies die at once than there are pooled puffs
- **THEN** every death is counted and removed from play, and no error occurs

### Requirement: Contact damage and invulnerability
When a live enemy's hurtbox overlaps the player's hurtbox while the player is alive and not invulnerable, the player SHALL lose HP equal to that enemy type's contact damage and SHALL become invulnerable for a configured time. Only one enemy SHALL damage the player per hit, even if several overlap at once. While invulnerable, the player SHALL blink (alternate visible and hidden at a configured period, guns included) and SHALL be fully visible again when invulnerability ends. Enemies SHALL NOT be pushed by, or push, the player.

#### Scenario: Contact hit
- **WHEN** a Grunt reaches a player with 100 HP who is not invulnerable
- **THEN** the player's HP drops by the Grunt's contact damage and the player becomes invulnerable and starts blinking

#### Scenario: Invulnerable
- **WHEN** enemies stay in contact with the player during the invulnerability time
- **THEN** the player's HP does not change until the invulnerability time has passed

#### Scenario: Crowd contact
- **WHEN** five enemies overlap a player who is not invulnerable in the same frame
- **THEN** the player takes damage from exactly one of them

#### Scenario: Blink ends visible
- **WHEN** the invulnerability time ends
- **THEN** the player and guns are visible

#### Scenario: Contact damage per type
- **WHEN** the unit tests read the enemy configuration
- **THEN** every type has a positive contact damage below the player's max HP, and the Brute's is the largest

### Requirement: Player HP
The player SHALL start each session with the configured max HP. HP SHALL NOT go below 0. Pausing the Game scene SHALL pause invulnerability and blink timing.

#### Scenario: Fresh session
- **WHEN** a session starts after a previous one ended in death
- **THEN** the player has full max HP

#### Scenario: Overkill
- **WHEN** a player with 5 HP takes a 20-damage hit
- **THEN** the player's HP is 0

### Requirement: Player death sequence
When the player's HP reaches 0, the player SHALL die exactly once: player input and firing SHALL stop, the player SHALL stop moving, enemy spawning SHALL stop, all enemies SHALL stop moving, and no further damage SHALL be dealt or taken. The player death animation SHALL play once. After it finishes and a configured delay passes, the Game and UI scenes SHALL stop and the GameOver scene SHALL start with the run stats: survival time in milliseconds (as of the moment of death), kills, and the level the player had reached.

#### Scenario: Death to GameOver
- **WHEN** the player's HP reaches 0 at level 3 after killing 7 enemies
- **THEN** firing stops, enemies stop, the death animation plays, and then GameOver starts with kills 7, level 3, and the survival time at death

#### Scenario: Survival time stops at death
- **WHEN** the player dies at 42.0 s of survival time and GameOver starts a second later
- **THEN** the reported survival time is 42.0 s (not 43.0 s)

#### Scenario: Dies once
- **WHEN** the player at 0 HP is still overlapped by enemies during the death animation
- **THEN** only one `player-died` event is emitted and GameOver starts once

#### Scenario: GameOver shows stats
- **WHEN** GameOver starts with run stats
- **THEN** it shows the survival time as m:ss, the kills, and the level

### Requirement: Kill count
The session SHALL count every enemy killed by damage. Enemies removed by far-away recycling SHALL NOT count as kills.

#### Scenario: Recycled is not a kill
- **WHEN** one enemy is killed by bullets and another is recycled for being too far away
- **THEN** the kill count is 1

### Requirement: Combat events
The Game scene SHALL emit these events on its event emitter, with names available as shared constants:
- `enemy-hit` when a bullet damages an enemy, with the enemy, its type, the damage, the HP left, and the hit position;
- `enemy-killed` when an enemy dies from damage, with its type, its position, and the kill count so far;
- `player-hit` when the player takes damage, with the damage, the HP left, and max HP;
- `player-died` once when the player dies, with the run stats (survival time in ms, kills, level).
A killing hit SHALL emit `enemy-hit` before `enemy-killed`. Recycled enemies SHALL NOT emit `enemy-killed`.

#### Scenario: Kill events
- **WHEN** a bullet kills a Runner at (300, 200)
- **THEN** `enemy-hit` is emitted with type runner and HP left 0 or less, then `enemy-killed` is emitted with type runner, position (300, 200), and the new kill count

#### Scenario: Player hit event
- **WHEN** a Grunt deals contact damage to a player with 100 HP
- **THEN** `player-hit` is emitted with the Grunt's contact damage, the HP left, and max HP

#### Scenario: Player died event
- **WHEN** the player's HP reaches 0
- **THEN** `player-died` is emitted once with the run stats that GameOver later receives

### Requirement: Combat numbers from configuration
Player max HP, invulnerability time, blink period, each enemy type's contact damage and knockback speed, knockback time, hit flash time, puff pool size, and the delay before GameOver SHALL come from configuration.

#### Scenario: Config drives HP
- **WHEN** the configured player max HP is changed and the game reloads
- **THEN** a new session starts with the new max HP
