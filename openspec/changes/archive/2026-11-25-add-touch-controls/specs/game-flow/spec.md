# game-flow Specification

## MODIFIED Requirements

### Requirement: Title screen
The title screen SHALL show the title background, the game logo, a Start button, and a one-line controls hint. The hint SHALL describe the touch controls in touch mode, or before any session input on a device whose main pointer is touch, and the keyboard and mouse controls otherwise. Clicking Start, or pressing Enter or Space, SHALL start a new game session. A click anywhere other than Start SHALL NOT start a session. A session SHALL start at most once per visit to the title screen. While the logo art is a generated placeholder, the logo SHALL be shown as the text "GUN HANDS" instead of the placeholder shape; while the background art is a placeholder, the background SHALL be a plain dark fill.

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

#### Scenario: Touch hint
- **WHEN** the title screen shows on a phone
- **THEN** the hint describes the thumbsticks

### Requirement: Menu buttons
Every menu button on the title, pause and GameOver screens SHALL show its label on the button frame and SHALL use the button sheet's frames: normal at rest, hover while the pointer is over it, and pressed while the pointer is held down on it. A button SHALL act when the pointer is released over it after being pressed on it, and SHALL NOT act when the press is released elsewhere or the touch is cancelled. A button SHALL act at most once per screen visit.

#### Scenario: Hover and press frames
- **WHEN** the pointer moves over a button, presses it, and moves off it
- **THEN** the button shows the hover frame, then the pressed frame, then the normal frame

#### Scenario: Press and drag off
- **WHEN** the player presses a button and releases the pointer outside it
- **THEN** the button does not act

#### Scenario: Cancelled touch
- **WHEN** the system cancels a touch held on a button
- **THEN** the button does not act

### Requirement: Pause menu
While a game session is running and the player is alive, pressing Esc SHALL pause the Game scene and open a pause overlay drawn above the HUD that shows "PAUSED" and the Resume and Quit to Title buttons. While paused, survival time, spawning, firing, enemy movement, combat timers, gem movement, pickup lifetimes and powerup timers SHALL NOT advance, and the HUD SHALL stay visible under the overlay. In touch mode an on-screen pause button SHALL be shown during play and SHALL open the overlay under the same conditions as Esc. Pressing Esc again or clicking Resume SHALL close the overlay and resume the Game scene. Esc SHALL be ignored for a configured input delay after the overlay opens. Esc SHALL do nothing while the LevelUp screen is open or pending, and after the player has died. While a session is running and the player is alive, the game losing window focus SHALL open the pause overlay the same way, unless it is already open or LevelUp is open.

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

#### Scenario: Pause by touch
- **WHEN** the player taps the on-screen pause button
- **THEN** the pause overlay opens, no stick starts, and tapping Resume continues play
