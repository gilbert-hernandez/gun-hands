# Spec Delta

## Purpose

Contact damage comes from the enemy instance, because enemies now spawn with scaled stats (GH-13).

## MODIFIED Requirements

### Requirement: Contact damage and invulnerability
When a live enemy's hurtbox overlaps the player's hurtbox while the player is alive, not invulnerable, and not shielded, the player SHALL lose HP equal to that enemy's contact damage (its type's contact damage, scaled when it spawned; see the enemies spec) and SHALL become invulnerable for a configured time. Only one enemy SHALL damage the player per hit, even if several overlap at once. While invulnerable, the player SHALL blink (alternate visible and hidden at a configured period, guns included) and SHALL be fully visible again when invulnerability ends. While a Shield powerup is active, enemy contact SHALL deal no damage, SHALL NOT start invulnerability, and SHALL NOT emit `player-hit`. Enemies SHALL NOT be pushed by, or push, the player.

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

#### Scenario: Scaled contact damage
- **WHEN** an enemy spawned during overtime, with a contact damage multiplier of 1.4, touches a player who is not invulnerable
- **THEN** the player loses its type's contact damage × 1.4, rounded

#### Scenario: Shielded contact
- **WHEN** a Grunt touches a player with 100 HP while a Shield powerup is active
- **THEN** the player still has 100 HP, is not invulnerable, and no `player-hit` is emitted
