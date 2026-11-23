# project-setup Specification

## Purpose
Defines how the Gun Hands game is run and built, how it fills the browser window, and the scene flow skeleton that every gameplay feature plugs into.

## Requirements

### Requirement: Local development and production build
The project SHALL provide npm scripts to run a local development server with hot reload, to produce a static production build, to preview that build, and to run the unit tests.

#### Scenario: Developer starts the dev server
- **WHEN** a developer runs `npm install` and then `npm run dev`
- **THEN** a local URL is printed and opening it shows the game canvas with no console errors

#### Scenario: Production build is static
- **WHEN** a developer runs `npm run build`
- **THEN** a `dist/` folder is produced that runs from any static web server with no backend

### Requirement: Fixed base resolution with crisp pixel scaling
The game SHALL render at a base resolution of 960×540 and scale to fit the browser window while keeping its aspect ratio, centered, with nearest-neighbor (non-smoothed) rendering.

#### Scenario: Window is resized
- **WHEN** the browser window is resized to any size
- **THEN** the game canvas scales to the largest size that fits, keeps the 16:9 aspect ratio, stays centered, and pixel art is not blurred

### Requirement: Scene flow skeleton
The game SHALL boot through a loading step into a title screen. From the title screen the player SHALL be able to start a game session that shows a HUD overlay, and the LevelUp and GameOver screens SHALL exist and be reachable for development.

#### Scenario: Boot to title
- **WHEN** the game page loads
- **THEN** a loading screen with progress appears and then the title screen is shown

#### Scenario: Start a session
- **WHEN** the player clicks or presses Enter on the title screen
- **THEN** the game session starts with the HUD overlay displayed on top of it

#### Scenario: Reach game over during development
- **WHEN** debug mode is enabled and the developer presses the debug key for game over
- **THEN** the GameOver screen is shown, and from it the player can return to the title screen

### Requirement: Centralized tunable configuration
Gameplay and display tunables SHALL be defined in configuration modules separate from scene logic so they can be changed without editing scene code.

#### Scenario: Change a display setting
- **WHEN** a developer changes the base resolution or debug flag in the config module
- **THEN** the game uses the new value on the next reload with no scene code edits
