# powerups Specification

## Purpose
Defines loot powerups: how killed enemies drop them, how pickups behave on the floor, what each of the six powerups does, how timed powerups run and refresh, and the events and configuration behind them.

## Requirements

### Requirement: Drop table
When an enemy dies from damage, it SHALL drop a powerup with a configured probability for its type. Brutes SHALL have a higher drop chance than Grunts and Runners. When a drop happens, the powerup SHALL be picked from a configured weighted table of the six powerups (Rapid Fire, Spread Shot, Shield, Health Pack, Bomb, Magnet) and placed at the enemy's death position. An enemy SHALL drop at most one powerup. Enemies recycled for being far away SHALL NOT drop powerups. A powerup drop SHALL NOT replace the enemy's XP gem.

#### Scenario: Forced drop
- **WHEN** a Grunt is killed at (400, 300) while the Grunt drop chance is 1
- **THEN** one powerup pickup appears at (400, 300), and so does the Grunt's XP gem

#### Scenario: No drop
- **WHEN** a Grunt is killed while the Grunt drop chance is 0
- **THEN** no powerup pickup appears

#### Scenario: Drop rates
- **WHEN** the unit tests roll 10,000 drops per enemy type with a seeded random source
- **THEN** each type drops in about its configured fraction of rolls (within 1 percentage point), and the Brute drops most often

#### Scenario: Weighted pick
- **WHEN** the unit tests pick 12,000 powerups with a seeded random source
- **THEN** each powerup appears in about its weight's share of the total (within 2 percentage points)

### Requirement: Pickups on the floor
A powerup pickup SHALL be collected when the player's center comes within a configured collect radius of the pickup's center while the player is alive. The player's XP pickup radius and the Magnet powerup SHALL NOT move powerup pickups. A pickup not collected within its configured lifetime SHALL despawn, and for the last few seconds of its lifetime (a configured warning time) it SHALL blink. Each pickup SHALL show its own powerup's sprite sheet, and while that art is a placeholder, a per-powerup tint so the six are told apart.

#### Scenario: Collect
- **WHEN** the player walks over a Health Pack pickup
- **THEN** the pickup disappears and its effect is applied

#### Scenario: Not pulled
- **WHEN** a pickup lies inside the player's XP pickup radius but outside the collect radius
- **THEN** the pickup stays where it is

#### Scenario: Blink then despawn
- **WHEN** a pickup is left alone on the floor
- **THEN** it is steadily visible until the warning time before its lifetime ends, blinks during that time, and is gone once the lifetime has passed

### Requirement: Pickups come from a fixed pool
Powerup pickups SHALL come from a fixed-size pool from configuration and be reused after being collected or despawning. When every pickup in the pool is on the floor, a new drop SHALL be skipped.

#### Scenario: Pool full
- **WHEN** the pool is full and another enemy drops a powerup
- **THEN** no new pickup appears and no error occurs

### Requirement: Timed powerups
Rapid Fire, Spread Shot, and Shield SHALL be timed powerups, each lasting its own configured duration from the moment it is collected. Different timed powerups SHALL be able to be active at the same time. Collecting a timed powerup that is already active SHALL reset its remaining time to the full duration without making it stronger. When a timed powerup's time runs out, its effect SHALL end.
- **Rapid Fire** SHALL multiply the player's fire rate by a configured factor.
- **Spread Shot** SHALL add a configured number of projectiles per shot and widen the fan by a configured angle.
- **Shield** SHALL make enemy contact deal no damage. While it is active a shield aura SHALL follow the player, and the aura SHALL blink during the shield's last configured warning time.

Timed effects SHALL apply on top of the player's per-run weapon stats without changing them. Upgrades chosen while a timed powerup is active SHALL still apply, and SHALL remain after it ends.

#### Scenario: Rapid Fire
- **WHEN** the player's fire rate is 4 shots per second and Rapid Fire (×2) is collected
- **THEN** the player fires about 8 shots per second until it runs out, then 4 again

#### Scenario: Spread Shot
- **WHEN** the player fires one projectile per shot and Spread Shot (+2 projectiles, +30°) is collected
- **THEN** each shot fires 3 bullets fanned over the widened angle until it runs out, then 1 again

#### Scenario: Refresh
- **WHEN** Rapid Fire has 3 s left and another Rapid Fire is collected
- **THEN** its remaining time is the full configured duration and the fire rate is still the base rate times the factor (not times the factor twice)

#### Scenario: Two at once
- **WHEN** Rapid Fire and Spread Shot are both active
- **THEN** each shot fires the Spread Shot fan at the Rapid Fire rate

#### Scenario: Upgrade during a powerup
- **WHEN** the player picks Multishot while Spread Shot is active
- **THEN** Multishot's extra projectile applies at once, and when Spread Shot ends the player keeps the Multishot projectile

#### Scenario: Shield blocks contact
- **WHEN** a Brute touches a player with an active Shield
- **THEN** the player's HP does not change

#### Scenario: Shield ends
- **WHEN** the Shield runs out and a Grunt then touches the player
- **THEN** the player takes the Grunt's contact damage

### Requirement: Instant powerups
Health Pack, Bomb, and Magnet SHALL take effect once, when collected.
- **Health Pack** SHALL restore a configured amount of HP, capped at max HP.
- **Bomb** SHALL deal a configured amount of damage to every live enemy whose position is inside the camera view, pushing survivors away from the player the same way a bullet hit does (hit flash and their type's knockback). Enemies it kills SHALL die exactly like enemies killed by bullets (death puff, kill count, `enemy-killed`, XP gem, and the drop roll). Enemies outside the camera view SHALL NOT be affected. It SHALL play a blast effect and a short camera shake.
- **Magnet** SHALL make every XP gem in the arena fly to the player and be collected, as if each had entered the pickup radius.

#### Scenario: Health Pack
- **WHEN** a player with 50/100 HP collects a Health Pack that heals 30
- **THEN** the player has 80/100 HP; a player with 90/100 HP ends at 100/100

#### Scenario: Bomb on screen
- **WHEN** the Bomb (100 damage) is collected with four Grunts on screen and one Grunt off screen
- **THEN** the four on-screen Grunts die, the kill count rises by 4, four XP gems drop, and the off-screen Grunt is unharmed

#### Scenario: Bomb on a Brute
- **WHEN** the Bomb (100 damage) is collected with a full-HP Brute (120 HP) on screen
- **THEN** the Brute survives with 20 HP and is pushed away from the player

#### Scenario: Magnet
- **WHEN** Magnet is collected while XP gems lie far outside the pickup radius
- **THEN** every gem flies to the player and its XP is collected

### Requirement: Powerups follow Game time
Powerup timers and pickup lifetimes SHALL count only while the Game scene is running, so they SHALL stop while it is paused (for example during LevelUp). After the player dies, pickups SHALL NOT be collected and powerup timers SHALL NOT end. Every new session SHALL start with no active powerups and no pickups on the floor.

#### Scenario: Paused during LevelUp
- **WHEN** the LevelUp scene is open for 3 s while Rapid Fire has 5 s left
- **THEN** Rapid Fire still has 5 s left when the Game scene resumes

#### Scenario: New session
- **WHEN** a new session starts after a run that ended with Shield active and pickups on the floor
- **THEN** no powerup is active and no pickup is on the floor

### Requirement: Powerup events and state
The Game scene SHALL emit these events on its event emitter, with names available as shared constants:
- `powerup-collected` when a pickup is collected, with the powerup id and, for timed powerups, the duration in ms;
- `powerup-expired` when a timed powerup's time runs out, with the powerup id.
Refreshing an active timed powerup SHALL emit `powerup-collected` again and SHALL NOT emit `powerup-expired`. The remaining time of each active timed powerup SHALL be readable from the Game scene so the HUD can show it.

#### Scenario: Collect and expire
- **WHEN** Spread Shot is collected and later runs out
- **THEN** `powerup-collected` is emitted with id spread and its duration, then `powerup-expired` is emitted with id spread

### Requirement: Developer drop key
With the debug flag on, pressing P during a session SHALL drop the next powerup, cycling through all six in order, a short distance in front of the player along the aim, through the normal pickup path. The debug readout SHALL show each active timed powerup and its remaining time. With the debug flag off, P SHALL do nothing.

#### Scenario: Cycle drops
- **WHEN** the debug flag is on and P is pressed six times
- **THEN** one pickup of each of the six powerups appears in front of the player

### Requirement: Powerup numbers from configuration
The per-type drop chances, the drop weights, each timed powerup's duration and strength, the Health Pack heal, the Bomb damage, the pickup collect radius, lifetime and blink warning time, the shield warning time, the pickup pool size, and each powerup's sprite sheet key and placeholder tint SHALL come from configuration.

#### Scenario: Config sanity
- **WHEN** the unit tests read the powerup configuration
- **THEN** every enemy type has a drop chance between 0 and 1 with the Brute's the largest, every powerup has a positive weight, a positive duration if timed, and a sprite sheet key that exists in the asset manifest, and the warning time is shorter than the pickup lifetime
