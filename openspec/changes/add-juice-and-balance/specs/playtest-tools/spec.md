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
`npm run balance [-- <runs>]` SHALL play the given number of complete runs one after another in headless Chromium against a running game. It SHALL steer away from nearby enemies and walls, aim at the nearest enemy and pick level-up cards by a fixed priority, and SHALL write each run's summary to a file under `balance/` (gitignored). A run that reaches a configurable cap (16 minutes by default) SHALL be ended through the normal death path and marked as capped. When all runs finish, it SHALL print the median, minimum and maximum survival time and level, the number of runs past 12:00, and the number that reached 15:00.

#### Scenario: Three runs
- **WHEN** `npm run balance -- 3` is run against a fresh dev server
- **THEN** three summary files appear in `balance/` and a table of median, min and max time and level is printed, with the counts past 12:00 and at 15:00

### Requirement: Stress key and performance readout
In development builds, pressing `K` during a run SHALL raise the enemy cap to a configured stress count (at least the top wave cap) and fill the arena to it, with enemy contact damage off so the run lasts. Pressing `K` again SHALL restore the wave cap and contact damage. The enemy pool SHALL be large enough for the stress count. The debug readout SHALL show the current FPS and the live counts of particles and damage numbers.

#### Scenario: Stress fill
- **WHEN** `K` is pressed in a development build
- **THEN** within a few seconds at least the stress count minus 10 enemies are alive, and the readout shows FPS, enemies, particles and numbers

#### Scenario: Production build
- **WHEN** `K` is pressed in a production build
- **THEN** nothing happens

### Requirement: Demo run-length target
The shipped configuration SHALL be tuned so that a typical demo run lasts about 10 minutes and reaches level 10 or higher, fewer than 10% of runs last past 12:00, and no run is expected to reach 15:00. This is shown by a round of at least 10 autoplay bot runs (median 9:00–11:00, at most one run past 12:00, none reaching 15:00) and by Gilbert's playtest summaries. On a mid-range laptop, a development-mode production build SHALL hold 60 FPS (58 or above, apart from the spawn moment) with the stress count of enemies (the top wave cap, 300) alive and continuous fire.

#### Scenario: Bot round on target
- **WHEN** `npm run balance -- 10` runs on the final numbers
- **THEN** the median survival time is between 9:00 and 11:00, at most one run passes 12:00, no run reaches 15:00, and the median level is 10 or higher

#### Scenario: Stress at 60 FPS
- **WHEN** Gilbert presses `K` on a mid-range laptop and fires for 60 s
- **THEN** the readout stays at 58 FPS or above after the spawn moment
