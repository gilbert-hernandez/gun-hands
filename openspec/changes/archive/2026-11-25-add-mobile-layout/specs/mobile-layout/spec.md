# Spec Delta

## Purpose

Defines how the game fits and reads on a phone: the rotate prompt, the larger touch layout, and staying clear of notches and browser bars, without changing the desktop layout.

## ADDED Requirements

### Requirement: Rotate prompt
While a device whose main pointer is touch is in portrait, "Rotate your phone" SHALL cover the page and input to it SHALL NOT reach the game. A running session SHALL pause under the same conditions as Esc and SHALL NOT be playable in portrait. Returning to landscape SHALL remove the prompt and SHALL NOT resume play by itself.

#### Scenario: Rotate during play
- **WHEN** the phone turns to portrait during play and back to landscape
- **THEN** the prompt shows and survival time stands still in portrait, and in landscape the pause menu waits for Resume

#### Scenario: Rotate during LevelUp
- **WHEN** the phone turns to portrait while LevelUp is open and back
- **THEN** the same cards are still shown and none was picked

#### Scenario: Tap the prompt
- **WHEN** the player taps the prompt where a button lies underneath
- **THEN** the button does not act

#### Scenario: Tall desktop window
- **WHEN** a mouse-driven desktop window is taller than it is wide
- **THEN** no prompt shows and play continues

### Requirement: Touch layout
Screens SHALL use the touch layout when they would show touch wording, and the desktop layout otherwise; the choice SHALL hold until the screen or session ends. In the touch layout every tap target SHALL be at least 64×64 game pixels, all text needed to play SHALL be at least 20 game pixels, and no elements SHALL overlap or leave the canvas. The build version label and debug text are exempt.

#### Scenario: Phone menus
- **WHEN** the title, pause, level-up and GameOver screens show on a phone in landscape
- **THEN** every button and card is at least 64×64 game pixels and its text at least 20

#### Scenario: Phone HUD
- **WHEN** a session runs on a phone with three timed powerups active
- **THEN** all HUD text is at least 20 game pixels and nothing overlaps, including the pause button

#### Scenario: Desktop unchanged
- **WHEN** the game runs with keyboard and mouse
- **THEN** every position and size is the same as before this change

### Requirement: Safe areas
The game canvas SHALL stay inside the visible page area and outside the device's safe-area insets, and SHALL refit when that area changes.

#### Scenario: Notch
- **WHEN** the device reports a safe-area inset on one side
- **THEN** the canvas does not extend into it

#### Scenario: Browser bar appears
- **WHEN** a browser bar appears and shrinks the visible area
- **THEN** the whole canvas refits inside what is left

### Requirement: Mobile layout numbers from configuration
Touch layout sizes and positions SHALL come from configuration.

#### Scenario: Change a size
- **WHEN** a developer changes the touch button scale in the configuration
- **THEN** menu buttons use it without scene code changes
