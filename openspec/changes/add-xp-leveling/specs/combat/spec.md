# Spec Delta

## MODIFIED Requirements

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
