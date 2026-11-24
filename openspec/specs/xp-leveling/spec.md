# xp-leveling Specification

## Purpose
Defines how kills turn into progression: XP gems dropped by enemies, the pickup radius and magnet that collect them, the XP curve and levels, and the queued level-up flow that pauses the game for the LevelUp screen.

## Requirements

### Requirement: Enemies drop XP gems
When an enemy dies from damage, exactly one XP gem SHALL appear at the enemy's position. Each gem SHALL have one of 3 tiers (small, medium, large), and the enemy's type SHALL determine the tier and the gem's XP value: Grunt drops small, Runner drops medium, and Brute drops large. A small gem's value SHALL be lower than a medium gem's, and a medium gem's lower than a large gem's. Enemies removed by far-away recycling SHALL NOT drop gems. Each tier SHALL be visually distinct, including while its art is a generated placeholder.

#### Scenario: Grunt drop
- **WHEN** a Grunt is killed by a bullet at (400, 300)
- **THEN** one small gem with the small tier's XP value appears at (400, 300)

#### Scenario: Brute drop
- **WHEN** a Brute is killed
- **THEN** one large gem with the large tier's XP value appears where it died

#### Scenario: Recycled enemies drop nothing
- **WHEN** an enemy is recycled for being too far from the player
- **THEN** no gem appears

#### Scenario: Tier values ordered
- **WHEN** the unit tests read the XP configuration
- **THEN** small value < medium value < large value, and each enemy type maps to a tier

### Requirement: Pickup radius and magnet
The player SHALL have a pickup radius, starting at the configured value each session and stored per run so upgrades can change it. A gem whose center comes within the pickup radius of the player's center SHALL start homing: it SHALL fly toward the player's current position, starting at a configured speed and accelerating up to a configured maximum speed that is faster than the player's move speed. A homing gem SHALL keep homing even if the player moves out of range. Gems outside the radius that are not homing SHALL stay where they are, with no time limit. Gems SHALL NOT be blocked by walls while homing.

#### Scenario: Gem inside the radius
- **WHEN** a gem lies 40 px from the player and the pickup radius is 80 px
- **THEN** the gem moves toward the player and is collected

#### Scenario: Gem outside the radius
- **WHEN** a gem lies 200 px from a player standing still and the pickup radius is 80 px
- **THEN** the gem stays where it is

#### Scenario: Player runs away
- **WHEN** a gem has started homing and the player then runs away at full speed
- **THEN** the gem keeps following and catches the player

#### Scenario: Larger radius
- **WHEN** the player's pickup radius is raised to 250 px during a run
- **THEN** a gem 200 px away starts homing

### Requirement: Collecting gems
A homing gem that comes within a configured collect distance of the player's center SHALL be collected: it SHALL leave play, and its XP value SHALL be added to the player's XP. Each gem SHALL be collected at most once. A dead player SHALL NOT collect gems.

#### Scenario: Collect
- **WHEN** a player with 0 XP collects a medium gem
- **THEN** the gem disappears and the player's XP equals the medium value

#### Scenario: Dead player
- **WHEN** the player has died and a gem lies within the pickup radius
- **THEN** the gem is not collected and the XP total does not change

### Requirement: Gems come from a fixed pool
Gems SHALL come from a fixed-size pool. When a gem drops while every pooled gem is in play, its XP value SHALL be added to the gem in play nearest to the drop position instead, and that gem SHALL show the highest tier whose value its new total reaches. No XP SHALL be lost to the pool limit, and no error SHALL occur.

#### Scenario: Pool full
- **WHEN** every pooled gem is on the floor and a Brute dies
- **THEN** no new gem appears, the nearest gem's value grows by the large value and it shows the large tier, and the total XP on the floor grows by the large value

#### Scenario: Many deaths
- **WHEN** more enemies die than there are pooled gems and the player then collects every gem
- **THEN** the player's XP gain equals the sum of every dropped value

### Requirement: XP curve and levels
Each session SHALL start at level 1 with 0 XP. The XP needed to go from each level to the next SHALL come from a configured curve, SHALL be a positive whole number, and SHALL NOT decrease as the level rises. XP beyond what a level needs SHALL carry over into the next level. A single pickup that covers several levels SHALL grant all of them.

#### Scenario: Level up with carry-over
- **WHEN** level 1 needs 5 XP and a player with 4 XP collects a 3-XP gem
- **THEN** the player is level 2 with 2 XP toward level 3

#### Scenario: Several levels at once
- **WHEN** a player collects enough XP in one pickup to cover the next two levels
- **THEN** the player gains two levels

#### Scenario: Curve shape
- **WHEN** the unit tests read the configured curve for levels 1 to 50
- **THEN** every value is a positive integer and none is smaller than the one before

### Requirement: Level-up flow
Every level gained SHALL add one pending level-up. While the player is alive and at least one level-up is pending, the Game scene SHALL pause and the LevelUp scene SHALL open. Closing the LevelUp scene SHALL consume one pending level-up; if more are pending, the LevelUp scene SHALL open again without the Game scene resuming in between; otherwise the Game scene SHALL resume. While paused for a level-up, survival time, spawning, enemies, gems, and combat timers SHALL NOT advance.

#### Scenario: Single level-up
- **WHEN** the player gains one level
- **THEN** the Game scene pauses and the LevelUp scene opens, and after it is closed the Game scene resumes

#### Scenario: Queued level-ups
- **WHEN** the player gains two levels in one pickup
- **THEN** the LevelUp scene opens, and after it is closed it opens a second time before the Game scene resumes

#### Scenario: Paused while choosing
- **WHEN** the LevelUp scene is open for 2 s
- **THEN** survival time and every gem's position are unchanged when the Game scene resumes

### Requirement: XP events
The Game scene SHALL emit these events on its event emitter, with names available as shared constants:
- `xp-changed` whenever the player's XP changes, with the total XP collected this session, the level, the XP into the current level, and the XP needed for the next level;
- `player-leveled` once per level gained, with the new level.
When one pickup grants a level, `player-leveled` SHALL be emitted before the `xp-changed` that reports the new level.

#### Scenario: Level-up events
- **WHEN** a pickup takes the player from level 1 to level 2
- **THEN** `player-leveled` is emitted with level 2, then `xp-changed` is emitted with level 2 and the carried-over XP

### Requirement: XP numbers from configuration
Each tier's XP value and placeholder look, each enemy type's tier, the starting pickup radius, the homing start speed, acceleration and maximum speed, the collect distance, the gem pool size, and the XP curve SHALL come from configuration.

#### Scenario: Config drives the curve
- **WHEN** the configured XP curve is changed so level 1 needs 1 XP and the game reloads
- **THEN** the first gem collected in a new session levels the player up

### Requirement: Developer level-up key
When debug mode is enabled, a debug key SHALL grant the player exactly the XP needed to reach the next level, going through the normal collection, event, and level-up flow.

#### Scenario: Debug level-up
- **WHEN** debug mode is enabled and the developer presses the level-up key at level 3
- **THEN** the player reaches level 4 with 0 XP toward level 5, `player-leveled` is emitted, and the LevelUp scene opens
