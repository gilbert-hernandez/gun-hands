# player-shooting Specification

## Purpose
Defines how the player's gun-hands aim at the mouse pointer and fire automatically, what stats bullets have and how long they live, how bullets are pooled, and the hook that fires on every shot.

## Requirements

### Requirement: Gun-hands aim at the pointer
The gun-hands SHALL be drawn as a separate sprite on top of the body, centered on the player, and SHALL rotate to point from the player toward the mouse pointer's position in world coordinates. Aim SHALL stay correct while the camera scrolls, even if the mouse does not move. When the aim points to the left half (angle beyond ±90°), the guns SHALL be mirrored vertically so they are not drawn upside down. Before the pointer has been moved over the game, the guns SHALL point in the direction the body faces.

#### Scenario: Aim at the pointer
- **WHEN** the pointer is above and to the right of the player
- **THEN** the guns' rotation equals the angle from the player to the pointer's world position (within 1°)

#### Scenario: Camera scrolls under a still mouse
- **WHEN** the mouse stays still while the player walks and the camera scrolls
- **THEN** the guns keep pointing at the world position under the pointer, recomputed every frame

#### Scenario: Aim to the left
- **WHEN** the pointer is to the left of the player
- **THEN** the guns point left and are mirrored vertically, so their top side stays up

#### Scenario: Pointer not used yet
- **WHEN** a session starts and the mouse has not moved over the game
- **THEN** the guns point in the body's facing direction (right at spawn)

### Requirement: Automatic fire at the configured rate
While a game session is running, the guns SHALL fire automatically, with no button held, toward the current aim, at the effective fire rate in shots per second: the fire rate from the player's weapon stats, multiplied by any active fire-rate powerup. Firing SHALL stop while the Game scene is paused (for example during LevelUp) and resume when it resumes. A slow frame SHALL NOT produce a burst of more than one extra shot.

#### Scenario: Fire rate
- **WHEN** the player stands still for 2 seconds with a fire rate of 4 shots per second and one projectile per shot
- **THEN** about 8 shots are fired (within ±1), all toward the aim direction

#### Scenario: Boosted fire rate
- **WHEN** the player stands still for 2 seconds with a fire rate of 4 shots per second while a ×2 fire-rate powerup is active
- **THEN** about 16 shots are fired (within ±2), and the player's own fire rate stat is still 4

#### Scenario: Paused
- **WHEN** the Game scene is paused
- **THEN** no shots are fired until it resumes

### Requirement: Bullet stats from configuration
Bullet speed, damage, lifetime, pierce, projectile count and spread angle SHALL come from the weapon configuration. Each session SHALL start the player with its own copy of these stats, and changing that copy (as upgrades do) SHALL affect the next shot without changing the configuration. Active timed powerups SHALL add to the projectile count and spread angle (and multiply the fire rate) used for each shot without changing that copy. Each bullet SHALL carry the damage and pierce it was fired with.

#### Scenario: Speed and damage
- **WHEN** a bullet is fired with the default config
- **THEN** it travels in the aim direction at the configured speed and carries the configured damage

#### Scenario: Stats changed during a run
- **WHEN** the player's bullet speed is doubled during a session
- **THEN** the next bullet fired travels at twice the configured speed, and a new session starts again at the configured speed

#### Scenario: Powerup boost leaves the stats alone
- **WHEN** a powerup adding 2 projectiles and 30° of spread is active while the player's stats say 1 projectile and 15°
- **THEN** each shot fires 3 bullets fanned over 45°, and the player's stats still say 1 projectile and 15°

### Requirement: Multishot spread
When the projectile count is greater than one, each shot SHALL fire that many bullets at once, fanned evenly across the spread angle and centered on the aim direction. With a count of one, the single bullet SHALL go straight along the aim.

#### Scenario: Three projectiles
- **WHEN** the projectile count is 3 and the spread angle is 30°
- **THEN** each shot fires three bullets at aim −15°, aim, and aim +15°

#### Scenario: One projectile
- **WHEN** the projectile count is 1
- **THEN** each shot fires one bullet exactly along the aim, regardless of the spread angle

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

### Requirement: Pierce
Each bullet SHALL track how many more enemies it can pass through, starting at the pierce stat. A hit on a bullet with pierce remaining SHALL use one pierce and keep the bullet in flight; a hit on a bullet with no pierce remaining SHALL despawn it.

#### Scenario: Pierce 1
- **WHEN** a bullet fired with pierce 1 hits two enemies in turn
- **THEN** it passes through the first and despawns on the second

#### Scenario: Pierce 0
- **WHEN** a bullet fired with pierce 0 hits an enemy
- **THEN** it despawns on that hit

### Requirement: Bullets come from a fixed pool
Bullets SHALL come from a pool whose size is set in the weapon config. Firing SHALL reuse free pooled bullets and SHALL NOT create bullet objects beyond the pool size. When every pooled bullet is in flight, shots that need more bullets SHALL be skipped without error.

#### Scenario: Long firing
- **WHEN** the guns fire continuously for 10 seconds
- **THEN** the number of bullet objects never exceeds the configured pool size and no errors are logged

#### Scenario: Pool exhausted
- **WHEN** a shot needs more bullets than are free in the pool
- **THEN** it fires as many as are free, skips the rest, and the game keeps running

### Requirement: Muzzle flash hook
Every shot SHALL emit one event carrying the gun-tip position and aim angle, so effects and sound can subscribe. A placeholder muzzle flash SHALL appear at the gun tip, pointed along the aim, for a short moment on each shot.

#### Scenario: Shot fired
- **WHEN** the guns fire
- **THEN** one fired event is emitted with the gun-tip position and angle, and a muzzle flash is visible at the gun tip until it fades
