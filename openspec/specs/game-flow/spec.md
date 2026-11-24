# game-flow Specification

## Purpose
Defines the screens around a run and the moves between them: the title screen, pausing and quitting a session, the GameOver screen with run stats, and restarting into a clean new session.

## Requirements

### Requirement: Title screen
The title screen SHALL show the title background, the game logo, a Start button, and a one-line controls hint. Clicking Start, or pressing Enter or Space, SHALL start a new game session. A click anywhere other than Start SHALL NOT start a session. A session SHALL start at most once per visit to the title screen. While the logo art is a generated placeholder, the logo SHALL be shown as the text "GUN HANDS" instead of the placeholder shape; while the background art is a placeholder, the background SHALL be a plain dark fill.

#### Scenario: Start with the button
- **WHEN** the player clicks Start on the title screen
- **THEN** a game session starts with the HUD shown

#### Scenario: Start with the keyboard
- **WHEN** the player presses Enter (or Space) on the title screen
- **THEN** a game session starts

#### Scenario: Click off the button
- **WHEN** the player clicks the title screen away from the Start button
- **THEN** the title screen stays and no session starts

#### Scenario: Placeholder logo
- **WHEN** the logo art has not been delivered
- **THEN** the title screen shows "GUN HANDS" as text where the logo goes

### Requirement: Menu buttons
Every menu button on the title, pause and GameOver screens SHALL show its label on the button frame and SHALL use the button sheet's frames: normal at rest, hover while the pointer is over it, and pressed while the pointer is held down on it. A button SHALL act when the pointer is released over it after being pressed on it, and SHALL NOT act when the press is released elsewhere. A button SHALL act at most once per screen visit.

#### Scenario: Hover and press frames
- **WHEN** the pointer moves over a button, presses it, and moves off it
- **THEN** the button shows the hover frame, then the pressed frame, then the normal frame

#### Scenario: Press and drag off
- **WHEN** the player presses a button and releases the pointer outside it
- **THEN** the button does not act

### Requirement: Pause menu
While a game session is running and the player is alive, pressing Esc SHALL pause the Game scene and open a pause overlay drawn above the HUD that shows "PAUSED" and the Resume and Quit to Title buttons. While paused, survival time, spawning, firing, enemy movement, combat timers, gem movement, pickup lifetimes and powerup timers SHALL NOT advance, and the HUD SHALL stay visible under the overlay. Pressing Esc again or clicking Resume SHALL close the overlay and resume the Game scene. Esc SHALL be ignored for a configured input delay after the overlay opens. Esc SHALL do nothing while the LevelUp screen is open or pending, and after the player has died. While a session is running and the player is alive, the game losing window focus SHALL open the pause overlay the same way, unless it is already open or LevelUp is open.

#### Scenario: Pause and resume
- **WHEN** the player presses Esc during play, waits several seconds, and presses Esc again
- **THEN** the pause overlay shows while the game is frozen, the survival time has not advanced during the pause, and play continues when the overlay closes

#### Scenario: Resume button
- **WHEN** the pause overlay is open and the player clicks Resume
- **THEN** the overlay closes and the Game scene resumes

#### Scenario: Esc during LevelUp
- **WHEN** the LevelUp screen is open and the player presses Esc
- **THEN** no pause overlay opens and the LevelUp screen stays open

#### Scenario: Esc after death
- **WHEN** the player has died and the death sequence is playing, and the player presses Esc
- **THEN** no pause overlay opens and GameOver follows as usual

#### Scenario: Focus lost
- **WHEN** the browser window loses focus during play
- **THEN** the pause overlay opens and the game stays paused until the player resumes

### Requirement: Quit to title
Clicking Quit to Title on the pause overlay SHALL end the session without showing GameOver: the Game scene, the HUD and the pause overlay SHALL stop, and the title screen SHALL show. Starting from the title screen afterwards SHALL begin a clean new session.

#### Scenario: Quit mid-run
- **WHEN** the player pauses at level 3 with 20 kills and clicks Quit to Title
- **THEN** the title screen shows with no HUD, and starting again begins at level 1 with 0 kills

### Requirement: GameOver screen
When a session ends in death, the GameOver screen SHALL show "GAME OVER" on the GameOver panel together with the run stats it was started with: time survived as m:ss, kills, and level reached, plus a Restart button and a Title button. Restart (the button, or Enter) SHALL start a new game session directly. Title (the button, or Esc) SHALL show the title screen. All GameOver input SHALL be ignored until a configured input delay has passed since the screen appeared.

#### Scenario: Stats shown
- **WHEN** the player dies at 2:07 survival time with 57 kills at level 6
- **THEN** the GameOver screen shows time 2:07, kills 57 and level 6

#### Scenario: Restart
- **WHEN** the player clicks Restart or presses Enter on the GameOver screen after the input delay
- **THEN** a new game session starts with the HUD, without passing through the title screen

#### Scenario: Back to title
- **WHEN** the player clicks Title or presses Esc on the GameOver screen after the input delay
- **THEN** the title screen shows

#### Scenario: Input delay
- **WHEN** the player presses Enter or clicks Restart before the input delay has passed
- **THEN** the GameOver screen stays

### Requirement: Clean new session
Every new game session, whether started from the title screen or by Restart, SHALL start in the same state as the first session after page load: the player at the spawn point with base max HP, full HP, base speed, base weapon stats and base pickup radius; level 1 with 0 XP and no pending level-ups; 0 kills; survival time 0; no upgrade ranks; no active powerups; no live enemies, bullets, gems or pickups; and a fresh HUD. Starting any number of sessions in a row SHALL NOT increase the number of game event listeners, input listeners or physics colliders a session has.

#### Scenario: Restart after an upgraded run
- **WHEN** the player reaches level 4 with three upgrades and an active Rapid Fire, dies, and restarts
- **THEN** the new session has level 1, 0 XP, 0 kills, base stats, no upgrade ranks, no active powerups and no leftover enemies, bullets, gems or pickups

#### Scenario: No listener build-up
- **WHEN** the player plays and ends three sessions in a row
- **THEN** the third session has the same number of event listeners, input listeners and colliders as the first

### Requirement: Game flow configuration
The pause and GameOver input delays, the pause overlay's dim opacity, the menu layout positions, and whether losing focus pauses the game SHALL come from configuration.

#### Scenario: Change the GameOver input delay
- **WHEN** a developer changes the GameOver input delay in the configuration
- **THEN** GameOver ignores input for the new delay without any scene code changes

### Requirement: Build version on the title screen
The title screen SHALL show the game's version as `v<version>` in small, muted text in a corner where it does not overlap the logo, the Start button, or the controls hint. The version SHALL be the version declared in the project's package manifest at build time. In a production build the label SHALL be exactly `v<version>`. In a development build the label SHALL be `v<version>-dev` followed by the short git commit hash in parentheses when it is available, and `v<version>-dev` alone when it is not. The label SHALL NOT respond to clicks or keys, and SHALL NOT affect starting a session.

#### Scenario: Production build
- **WHEN** a production build declared as version 0.2.0 shows the title screen
- **THEN** the label reads `v0.2.0`

#### Scenario: Development build with git
- **WHEN** the development server runs version 0.2.0 from a git checkout whose short commit is `38aa0ce`
- **THEN** the label reads `v0.2.0-dev (38aa0ce)`

#### Scenario: Development build without git
- **WHEN** the development server runs version 0.2.0 where no git commit can be read
- **THEN** the label reads `v0.2.0-dev`

#### Scenario: Version follows the manifest
- **WHEN** the version in the package manifest changes and the game is rebuilt
- **THEN** the title screen label shows the new version with no other file edited

#### Scenario: Label doesn't start the game
- **WHEN** the player clicks the version label
- **THEN** the title screen stays and no session starts
