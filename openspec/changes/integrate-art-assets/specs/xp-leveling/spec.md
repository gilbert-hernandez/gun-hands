## ADDED Requirements

### Requirement: Level-up burst
When the player gains a level, a level-up burst SHALL play once, centered on the player and following them, above the body and below the HUD. The burst SHALL run on game time: it holds while the Game scene is paused for the LevelUp screen and plays out once play resumes. It SHALL be purely visual. A new level-up while the burst is playing SHALL restart it.

#### Scenario: Burst after choosing
- **WHEN** the player levels up, picks an upgrade, and play resumes
- **THEN** the level-up burst plays around the player and then disappears

#### Scenario: Follows the player
- **WHEN** the player moves while the burst plays
- **THEN** the burst stays centered on the player
