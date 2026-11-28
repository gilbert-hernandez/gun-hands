# Spec Delta

## Purpose

Makes hits, kills and damage read clearly at a glance through screen shake, hit-stop, particles and damage numbers. None of these effects change gameplay.

## ADDED Requirements

### Requirement: Feedback is cosmetic
Screen shake, particles and damage numbers SHALL NOT affect gameplay: they SHALL NOT have physics bodies, move the player, enemies or bullets, or change any HP, damage, timer or score. Hit-stop SHALL freeze the Game scene as a whole and SHALL NOT change the outcome of any hit, timer or spawn. Every number for these effects SHALL come from configuration.

#### Scenario: Juice off changes nothing
- **WHEN** a run is played with shake, particles and damage numbers disabled, and again with them enabled, with the same seeded inputs
- **THEN** the HP, kills and survival time of both runs match

### Requirement: Screen shake
The camera SHALL shake when the player takes damage, with an intensity proportional to the damage up to a configured maximum. It SHALL shake more strongly when a Brute is killed and when a Bomb goes off. A stronger shake SHALL replace a weaker one in progress, and a weaker shake SHALL NOT cut short a stronger one. Ordinary bullet hits on enemies SHALL NOT shake the camera. When the browser reports a reduced-motion preference, the camera SHALL NOT shake at all.

#### Scenario: Player hit shakes
- **WHEN** an enemy deals contact damage to the player
- **THEN** the camera shakes with an intensity of the damage times the configured per-damage intensity, capped at the maximum

#### Scenario: Brute kill shakes
- **WHEN** a Brute is killed
- **THEN** the camera shakes with the configured Brute-kill duration and intensity

#### Scenario: Bomb shakes
- **WHEN** the player collects a Bomb
- **THEN** the camera shakes with the configured Bomb duration and intensity

#### Scenario: Bullet hits don't shake
- **WHEN** a bullet hits an enemy without killing a Brute and the player is not hit
- **THEN** the camera does not shake

#### Scenario: Reduced motion
- **WHEN** the browser reports `prefers-reduced-motion: reduce` and the player is hit, a Brute dies, or a Bomb goes off
- **THEN** the camera does not shake

### Requirement: Hit-stop on Brute kills
Killing a Brute SHALL freeze the Game scene for a configured short time: physics, animations, tweens, scene timers, enemy steering and spawning, player movement and firing, and the survival clock SHALL all stop, then resume where they were. The HUD SHALL keep drawing. A hit-stop SHALL NOT start while one is running or within a configured cooldown after the last one ended. No hit-stop SHALL start once the player has died. Pausing the game or opening LevelUp during a hit-stop SHALL NOT lose or lengthen what is left of it.

#### Scenario: Brute kill freezes the scene
- **WHEN** a bullet kills a Brute
- **THEN** for the configured hit-stop time the survival clock does not advance and no enemy moves, and afterwards both continue

#### Scenario: No stacking
- **WHEN** a Bomb kills several Brutes on the same frame
- **THEN** exactly one hit-stop happens

#### Scenario: Other kills don't freeze
- **WHEN** a Grunt or Runner is killed
- **THEN** no hit-stop happens

### Requirement: Impact and death particles
Each bullet hit on an enemy SHALL burst a configured number of small particles at the hit point, in addition to the impact spark. Each enemy death SHALL burst a larger configured number of particles colored for that enemy type. Particles SHALL use a texture generated at startup, so they need no delivered art. The number of live particles SHALL NOT exceed a configured maximum. A burst that would exceed it SHALL be cut short without error.

#### Scenario: Hit burst
- **WHEN** a bullet hits an enemy
- **THEN** a burst of the configured hit count starts at the hit point

#### Scenario: Death burst
- **WHEN** an enemy dies
- **THEN** a burst of the configured death count starts at its position, tinted with its type's configured color

#### Scenario: Particle cap
- **WHEN** many enemies die at once (a Bomb in a crowd)
- **THEN** live particles never exceed the configured maximum and no error occurs

### Requirement: Damage numbers
Each bullet or Bomb hit on an enemy SHALL show the damage dealt, rounded to a whole number, as a number at the enemy's position that rises and fades out over a configured time. A hit that kills SHALL show its number in the configured kill color. Numbers SHALL come from a fixed pool of configured size and SHALL use a bitmap font generated at startup. When every pooled number is showing, a new hit SHALL show no number, without error. A number SHALL return to the pool when it has faded out.

#### Scenario: Bullet hit shows damage
- **WHEN** a bullet deals 13 damage to an enemy that survives
- **THEN** a "13" appears at the enemy in the normal color, rises and fades out within the configured time

#### Scenario: Killing hit
- **WHEN** a hit kills the enemy
- **THEN** its number shows in the kill color

#### Scenario: Bomb hits show damage
- **WHEN** a Bomb damages several enemies on screen
- **THEN** each damaged enemy shows a number, up to the pool size

#### Scenario: Pool exhausted
- **WHEN** every pooled number is showing and another hit lands
- **THEN** no new number appears and no error occurs

### Requirement: Damage event
Every damage dealt to an enemy, by a bullet or a Bomb, SHALL emit an `enemy-damaged` event on the Game scene with the position, the damage, whether it killed, and the source (`bullet` or `bomb`). The existing `enemy-hit` event SHALL keep firing for bullet hits only, unchanged.

#### Scenario: Bomb damage event
- **WHEN** a Bomb damages an enemy
- **THEN** `enemy-damaged` fires with source `bomb` and `enemy-hit` does not fire
