# Spec Delta

## MODIFIED Requirements

### Requirement: Scene flow skeleton
The game SHALL boot through a loading step into a title screen. From the title screen the player SHALL be able to start a game session that shows a HUD overlay. The title, pause and GameOver screens and the moves between them SHALL behave as the `game-flow` capability defines. In debug mode a debug key SHALL still reach GameOver through the real death path.

#### Scenario: Boot to title
- **WHEN** the game page loads
- **THEN** a loading screen with progress appears and then the title screen is shown

#### Scenario: Start a session
- **WHEN** the player clicks Start or presses Enter on the title screen
- **THEN** the game session starts with the HUD overlay displayed on top of it

#### Scenario: Reach game over during development
- **WHEN** debug mode is enabled and the developer presses the debug key for game over
- **THEN** the GameOver screen is shown, and from it the player can restart or return to the title screen
