# Spec Delta

## Purpose

Enemies level up with the player and become more dangerous every minute after 10:00, and the wave ramp keeps building pressure to 15 minutes, so a typical run lasts about 10 minutes (GH-13).

## MODIFIED Requirements

### Requirement: Enemy types from configuration
The game SHALL define three enemy types, Grunt, Runner, and Brute, entirely in configuration. Each type SHALL set its move speed, max HP, contact damage, hurtbox size, sprite size, walk animation key, and walk frame rate. Relative to the Grunt, the Runner SHALL be faster with lower HP, and the Brute SHALL be slower with higher HP and use 64×64 sprites. Every enemy type's base speed SHALL be slower than the player's base speed; an enemy scaled at spawn (see "Enemies scale with the player's level" and "Overtime after ten minutes") MAY be faster. An enemy SHALL start each spawn at its max HP.

#### Scenario: Type stats are consistent
- **WHEN** the unit tests read the enemy configuration
- **THEN** Grunt, Runner, and Brute are defined; Runner speed > Grunt speed > Brute speed; Runner HP < Grunt HP < Brute HP; every base speed is below the player's speed; and the Brute's sprite is 64×64 while the others are 32×32

#### Scenario: Sprite keys exist
- **WHEN** the unit tests compare each type's walk animation key with the asset manifest
- **THEN** every key has a manifest entry with the type's sprite size

#### Scenario: Spawned enemy uses its type
- **WHEN** a Brute is spawned at player level 1 before overtime
- **THEN** it shows the Brute walk sprite, moves at the Brute speed, has the Brute hurtbox, and its HP equals the Brute max HP

## ADDED Requirements

### Requirement: Enemies scale with the player's level
When an enemy spawns, its max HP and move speed SHALL be its type's values times a level factor that depends on the player's level at that moment: for each stat, 1 plus a configured per-level amount times (level − 1), capped at 1 plus a configured maximum bonus. A configured per-level amount SHALL also apply to contact damage (it may be zero). HP and contact damage SHALL be rounded to whole numbers. An enemy already in play SHALL keep the stats it spawned with when the player levels up.

#### Scenario: Level 1
- **WHEN** an enemy spawns while the player is level 1, before overtime
- **THEN** its HP, speed and contact damage equal its type's

#### Scenario: Higher level
- **WHEN** a Grunt spawns while the player is level 9 and the per-level HP amount is 0.05
- **THEN** its max HP is the Grunt's HP × 1.4, rounded, and its speed is scaled by the per-level speed amount the same way

#### Scenario: Bonus cap
- **WHEN** an enemy spawns at a player level high enough to pass a stat's maximum bonus
- **THEN** that stat is scaled by exactly 1 plus the maximum bonus

#### Scenario: Existing enemies keep their stats
- **WHEN** the player levels up while enemies are in play
- **THEN** those enemies' HP, speed and contact damage do not change

### Requirement: Overtime after ten minutes
From a configured survival time (10:00 in the shipped configuration), every newly spawned enemy's max HP, move speed and contact damage SHALL be scaled by an overtime factor: for each stat, 1 plus a configured per-minute amount times the minutes of survival time past the start, counted continuously and without a cap. The overtime factor SHALL multiply the level factor. The wave keyframes SHALL continue to 15:00, with the interval falling and the cap rising as before. Under the shipped configuration, scaled enemies SHALL be able to outpace a player with no Move Speed upgrades before 15:00.

#### Scenario: Before overtime
- **WHEN** an enemy spawns at 9:59 survival time
- **THEN** no overtime factor applies

#### Scenario: Two minutes in
- **WHEN** an enemy spawns at 12:00 with a per-minute speed amount of 0.12
- **THEN** its speed is its level-scaled speed × 1.24

#### Scenario: Keyframes reach 15 minutes
- **WHEN** the unit tests read the wave keyframes
- **THEN** the last keyframe is at 15:00 or later, and the largest cap fits in the enemy pool

#### Scenario: Overtime runners outpace the player
- **WHEN** the unit tests compute a Runner's speed at 15:00 at the level a typical run reaches (level 10)
- **THEN** it is greater than the player's base speed
