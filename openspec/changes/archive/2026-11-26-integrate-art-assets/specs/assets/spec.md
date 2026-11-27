## ADDED Requirements

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
