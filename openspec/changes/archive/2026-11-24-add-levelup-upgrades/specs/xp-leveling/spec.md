# Spec Delta

## MODIFIED Requirements

### Requirement: Level-up flow
Every level gained SHALL add one pending level-up. While the player is alive and at least one level-up is pending, the Game scene SHALL pause and the LevelUp scene SHALL open. Choosing an upgrade (or the filler card) on the LevelUp scene SHALL consume one pending level-up; if more are pending, the LevelUp scene SHALL open again with a new draw without the Game scene resuming in between; otherwise the LevelUp scene SHALL close and the Game scene SHALL resume. The LevelUp scene SHALL NOT close without a choice. While paused for a level-up, survival time, spawning, enemies, gems, and combat timers SHALL NOT advance.

#### Scenario: Single level-up
- **WHEN** the player gains one level
- **THEN** the Game scene pauses and the LevelUp scene opens, and after an upgrade is chosen the Game scene resumes

#### Scenario: Queued level-ups
- **WHEN** the player gains two levels in one pickup
- **THEN** the LevelUp scene opens, and after an upgrade is chosen it opens a second time with a new draw before the Game scene resumes

#### Scenario: No way out without a choice
- **WHEN** the LevelUp scene is open and the player presses Enter or clicks outside every card
- **THEN** the LevelUp scene stays open and the Game scene stays paused

#### Scenario: Paused while choosing
- **WHEN** the LevelUp scene is open for 2 s
- **THEN** survival time and every gem's position are unchanged when the Game scene resumes
