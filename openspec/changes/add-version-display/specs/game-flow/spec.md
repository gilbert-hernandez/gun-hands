## ADDED Requirements

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
