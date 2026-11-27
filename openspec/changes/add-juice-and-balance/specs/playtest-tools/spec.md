# Spec Delta

## Purpose

Tools for measuring balance and performance, and the run-length target the shipped numbers must meet.

## ADDED Requirements

### Requirement: Run summary
At the end of every run, the game SHALL build a run summary with the version, survival time, level reached, kills in total and by enemy type, upgrade ranks taken, damage taken by enemy type, and powerups collected by type. In development builds, GameOver SHALL log the summary to the console and keep the last 20 summaries in `localStorage`, ignoring storage failures. Production builds SHALL NOT log or store it.

#### Scenario: Dev run logged
- **WHEN** a run ends in a development build
- **THEN** the console shows one run summary and `localStorage` holds it as the newest of at most 20 entries

#### Scenario: Storage fails
- **WHEN** `localStorage` throws on every call and a run ends
- **THEN** GameOver shows normally and no error escapes

### Requirement: Autoplay balance bot
`npm run balance [-- <runs>]` SHALL play the given number of complete runs one after another in headless Chromium against a running game. It SHALL steer away from nearby enemies and walls, aim at the nearest enemy and pick level-up cards by a fixed priority, and SHALL write each run's summary to a file under `balance/` (gitignored). When all runs finish, it SHALL print the median, minimum and maximum survival time and level.

#### Scenario: Three runs
- **WHEN** `npm run balance -- 3` is run against a fresh dev server
- **THEN** three summary files appear in `balance/` and a table of median, min and max time and level is printed

### Requirement: Stress key and performance readout
In development builds, pressing `K` during a run SHALL raise the enemy cap to a configured stress count (at least 200) and fill the arena to it. Pressing `K` again SHALL restore the wave cap. The enemy pool SHALL be large enough for the stress count. The debug readout SHALL show the current FPS and the live counts of particles and damage numbers.

#### Scenario: Stress fill
- **WHEN** `K` is pressed in a development build
- **THEN** within a few seconds at least 200 enemies are alive, and the readout shows FPS, enemies, particles and numbers

#### Scenario: Production build
- **WHEN** `K` is pressed in a production build
- **THEN** nothing happens

### Requirement: Demo run-length target
The shipped configuration SHALL be tuned so that a typical demo run lasts 5 to 8 minutes and reaches level 10 or higher. This is shown by the median of at least 5 autoplay bot runs inside the calibrated target band, and by Gilbert's playtest summaries. On a mid-range laptop, a development-mode production build SHALL hold 60 FPS (58 or above, apart from the spawn moment) with at least 200 enemies alive and continuous fire.

#### Scenario: Bot median on target
- **WHEN** `npm run balance -- 5` runs on the final numbers
- **THEN** the median survival time and level fall inside the calibrated band recorded in the design's balance log

#### Scenario: Stress at 60 FPS
- **WHEN** Gilbert presses `K` on a mid-range laptop and fires for 60 s
- **THEN** the readout stays at 58 FPS or above after the spawn moment
