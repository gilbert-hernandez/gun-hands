# assets Specification

## Purpose
Defines how every game graphic is declared and loaded by key, and how missing art is substituted with placeholders so development never waits on the artist.

## Requirements

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

### Requirement: Delivered art matches the manifest
Every PNG in the assets folder SHALL belong to a manifest entry, and its pixel size SHALL match that entry. A sprite sheet SHALL be frame width × frame count wide and frame height high. An image SHALL be exactly its declared size. A tileset SHALL be columns × frame width wide and rows × frame height high. When every manifest entry has its PNG, the game SHALL load with no placeholders.

#### Scenario: Delivered sheet has the declared size
- **WHEN** the unit tests read `gh_enemy_brute_walk.png` from the assets folder
- **THEN** it is 384×64 px, matching 6 frames of 64×64

#### Scenario: Wrong size is caught
- **WHEN** a delivered PNG's width or height differs from its manifest entry
- **THEN** the unit test fails and names the file, the expected size and the actual size

#### Scenario: Unknown file is caught
- **WHEN** a `gh_*.png` with no manifest entry is in the assets folder
- **THEN** the unit test fails and names the file

#### Scenario: All art delivered
- **WHEN** the game loads with every manifest file present
- **THEN** no placeholder is generated and no placeholder warning is logged

### Requirement: Sprite animations from configuration
Every multi-frame sprite sheet the game shows SHALL play through an animation built from all of its frames, with a time per frame (ms) taken from configuration. Looping sheets (idle, run, walk, bullet, gem, pickup and shield shimmer) SHALL repeat. One-shot sheets (hurt, death, recoil, muzzle, impact, bomb blast, level-up burst) SHALL play once.

#### Scenario: Frame time from config
- **WHEN** the Grunt walk animation is created
- **THEN** its time per frame equals the Grunt walk frame time in the enemy config

#### Scenario: One-shot plays once
- **WHEN** an enemy death animation finishes
- **THEN** it stops on its last frame and does not loop
