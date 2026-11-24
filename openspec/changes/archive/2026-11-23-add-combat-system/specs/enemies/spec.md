# Spec Delta

## MODIFIED Requirements

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
