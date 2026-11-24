# Spec Delta

## MODIFIED Requirements

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
