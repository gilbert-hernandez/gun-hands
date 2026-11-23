# Spec Delta

## Purpose
Defines how every game graphic is declared and loaded by key, and how missing art is substituted with placeholders so development never waits on the artist.

## ADDED Requirements

### Requirement: Single asset manifest
Every graphic the game uses SHALL be declared once in an asset manifest that records its key, file name, type (image, sprite sheet, or tileset), frame width and height, and frame count. Game code SHALL refer to assets only by manifest key.

#### Scenario: Manifest matches the art spec
- **WHEN** the manifest is compared with ASSETS.md
- **THEN** every asset listed in ASSETS.md has a manifest entry with the same file name, frame size, and frame count

#### Scenario: Duplicate keys are rejected
- **WHEN** the unit tests run against a manifest containing two entries with the same key
- **THEN** the validation test fails and names the duplicate key

### Requirement: Placeholder fallback for missing art
When a manifest entry's file is not present, the game SHALL generate a placeholder at the declared frame size and frame count, colored by asset category, and register it under the same key so game code behaves the same as with real art.

#### Scenario: Art not yet delivered
- **WHEN** the game loads and `gh_enemy_brute_walk.png` is not in the assets folder
- **THEN** a 64×64 placeholder sprite sheet with the declared number of frames is available under the brute walk key, and a single warning listing all placeholder keys is logged in development

#### Scenario: Art delivered
- **WHEN** a correctly named PNG is added to the assets folder and the game is reloaded
- **THEN** the real image is used for that key and it no longer appears in the placeholder warning

### Requirement: Artist-facing asset specification
The repository SHALL contain an ASSETS.md document that lists every required asset with its file name, frame size, frame count, facing direction, and pivot notes, along with the export conventions and the delivery process.

#### Scenario: Artist checks a requirement
- **WHEN** david opens ASSETS.md for any Art ticket
- **THEN** they find the exact file names, sizes, and frame counts for that ticket's deliverables
