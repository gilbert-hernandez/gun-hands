# enemies Specification

## Purpose

Defines the enemies the player fights: their types, where and when they spawn, how they chase the player, and how spawning ramps up with survival time over a run.

## Requirements

### Requirement: Enemy types from configuration
The game SHALL define three enemy types, Grunt, Runner, and Brute, entirely in configuration. Each type SHALL set its move speed, max HP, hurtbox size, sprite size, walk animation key, and walk frame rate. Relative to the Grunt, the Runner SHALL be faster with lower HP, and the Brute SHALL be slower with higher HP and use 64×64 sprites. Every enemy type SHALL be slower than the player. An enemy SHALL start each spawn at its type's max HP.

#### Scenario: Type stats are consistent
- **WHEN** the unit tests read the enemy configuration
- **THEN** Grunt, Runner, and Brute are defined; Runner speed > Grunt speed > Brute speed; Runner HP < Grunt HP < Brute HP; every speed is below the player's speed; and the Brute's sprite is 64×64 while the others are 32×32

#### Scenario: Sprite keys exist
- **WHEN** the unit tests compare each type's walk animation key with the asset manifest
- **THEN** every key has a manifest entry with the type's sprite size

#### Scenario: Spawned enemy uses its type
- **WHEN** a Brute is spawned
- **THEN** it shows the Brute walk sprite, moves at the Brute speed, has the Brute hurtbox, and its HP equals the Brute max HP

### Requirement: Off-screen ring spawning
Enemies SHALL spawn on a ring centered on the camera view, whose radius puts every spawn point outside the visible area by at least a configured margin. The spawn angle SHALL be random and uniform, so enemies arrive from every direction. A spawn point SHALL be rejected if any part of the enemy's hurtbox would lie on a wall tile or outside the map; the spawner SHALL then try other angles up to a configured number of attempts and skip the spawn if none fits.

#### Scenario: Spawn is out of view
- **WHEN** an enemy spawns
- **THEN** its whole sprite lies outside the camera's visible area

#### Scenario: Spawn is never in a wall
- **WHEN** many enemies spawn with the player at various positions, including next to map corners and obstacles
- **THEN** no spawned enemy's hurtbox overlaps a wall tile or extends outside the map

#### Scenario: Every direction
- **WHEN** the unit tests generate many spawn points around a player in the open middle of the arena
- **THEN** points appear in each of the four quadrants around the camera center

#### Scenario: No room to spawn
- **WHEN** every attempted angle lands on a wall or outside the map
- **THEN** no enemy spawns that tick and no error occurs

### Requirement: Chase movement with separation
Every live enemy SHALL move toward the player's current position at its type's speed, except while it is being knocked back (its knockback movement replaces chasing for that time) and after the player has died (all enemies stop moving). Each enemy SHALL also be pushed away from other enemies within a configured separation radius, with a configured strength, so that enemies chasing the same player spread out instead of overlapping exactly. The combined movement SHALL NOT exceed the enemy's speed. Enemies SHALL face the direction they move horizontally.

#### Scenario: Enemy chases the player
- **WHEN** a single enemy is placed in open floor to the left of the player
- **THEN** it moves right toward the player at its type's speed and faces right

#### Scenario: Crowd does not stack
- **WHEN** ten enemies are placed at the same point and chase a stationary player for two seconds
- **THEN** no two enemies are at exactly the same position and they spread over an area wider than one enemy

#### Scenario: Speed limit
- **WHEN** the unit tests combine a chase direction with a strong separation push
- **THEN** the resulting speed is no more than the enemy's speed

#### Scenario: No steering while knocked back
- **WHEN** an enemy is knocked back away from the player
- **THEN** it moves away from the player for the knockback time and then chases again

#### Scenario: Enemies stop when the player dies
- **WHEN** the player dies
- **THEN** every live enemy's velocity is zero and stays zero until the session ends

### Requirement: Enemies collide with walls
Enemies SHALL collide with the arena's solid tiles through the arena's shared wall collision. An enemy's hurtbox SHALL NOT overlap a solid tile. Enemies SHALL NOT collide with each other or with the player physically (contact effects are defined elsewhere).

#### Scenario: Enemy blocked by an obstacle
- **WHEN** an enemy chases the player and an obstacle lies between them
- **THEN** the enemy stops at the obstacle or slides along it, and its hurtbox never overlaps a wall tile

#### Scenario: No pushing the player
- **WHEN** an enemy reaches the player
- **THEN** the player's position is not changed by the enemy

### Requirement: Wave director ramps with survival time
Survival time SHALL count the time the Game scene has been running in the current session, and SHALL NOT advance while the Game scene is paused. A wave configuration SHALL list keyframes by survival time, each with a spawn interval, a live-enemy cap, and a weight per enemy type. At any survival time, the director SHALL use values linearly interpolated between the surrounding keyframes, holding the first keyframe's values before it and the last keyframe's values after it. The director SHALL spawn one enemy per elapsed spawn interval, picking its type at random by weight, and SHALL NOT spawn while the number of live enemies is at the cap. Over the keyframes, the interval SHALL NOT increase and the cap SHALL NOT decrease.

#### Scenario: Interpolated values
- **WHEN** the unit tests ask for the wave values halfway between two keyframes
- **THEN** the interval, cap, and type weights are halfway between those keyframes' values (the cap rounded down)

#### Scenario: Ramp is monotonic
- **WHEN** the unit tests read the wave keyframes in order
- **THEN** each interval is no greater than the one before, each cap is no less than the one before, and survival times strictly increase

#### Scenario: Only Grunts at the start
- **WHEN** a session starts with the shipped wave configuration
- **THEN** only Grunts spawn until survival time passes the last keyframe in which Runners and Brutes have zero weight, and Brutes never spawn before Runners can

#### Scenario: Cap respected
- **WHEN** the number of live enemies reaches the current cap
- **THEN** no more enemies spawn until the count drops below the cap

#### Scenario: Pause stops the clock
- **WHEN** the Game scene is paused for several seconds and then resumed
- **THEN** survival time has not advanced during the pause and no enemies spawned during it

### Requirement: Enemies come from a fixed pool
All enemies SHALL come from one pool whose size is set in configuration and is at least the largest cap in the wave configuration. Spawning SHALL reuse a free pooled enemy. When the pool is exhausted, the spawn SHALL be skipped without error. Removing an enemy from play SHALL free its pool slot.

#### Scenario: Pool reuse
- **WHEN** an enemy is removed from play and another spawns
- **THEN** the number of enemy objects in the pool does not grow

#### Scenario: Pool exhausted
- **WHEN** every pooled enemy is in play and a spawn is due
- **THEN** no enemy spawns and no error occurs

### Requirement: Far-away enemies are recycled
An enemy whose distance from the player exceeds a configured recycle distance (larger than the spawn ring radius) SHALL be removed from play and its pool slot freed, so that stuck or left-behind enemies do not hold the cap.

#### Scenario: Left behind
- **WHEN** an enemy is placed farther from the player than the recycle distance
- **THEN** it is removed from play on the next frame and the live enemy count drops by one

### Requirement: Distinguishable placeholder enemies
While an enemy type's walk art is a placeholder, each type SHALL be drawn with its own configured tint, so Grunt, Runner, and Brute look different on screen. When the real art for a type is present, it SHALL be drawn untinted.

#### Scenario: Placeholders differ
- **WHEN** the game runs without the GH-17 enemy art and a Grunt and a Runner are on screen
- **THEN** they are drawn in visibly different colors

#### Scenario: Real art untinted
- **WHEN** a correctly sized `gh_enemy_grunt_walk.png` is added and the game is reloaded
- **THEN** Grunts are drawn with that art and no tint
