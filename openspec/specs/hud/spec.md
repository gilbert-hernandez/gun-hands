# hud Specification

## Purpose
Defines the in-game HUD overlay: what it shows about the player's run (HP, XP and level, survival time, kills, active powerups), how it reacts to game events, and how it stays crisp and correct across pauses and sessions.

## Requirements

### Requirement: HUD overlay
While a game session runs, a HUD SHALL be drawn on top of the game world, fixed to the screen (it SHALL NOT move with the camera), and SHALL show the HP bar, XP bar with level, survival timer, kill count, and active powerups described below. The LevelUp screen SHALL be drawn above the HUD. The HUD SHALL be removed when the session ends in GameOver and SHALL start fresh in every new session.

#### Scenario: Session starts
- **WHEN** the player starts a session from the title screen
- **THEN** the HUD shows full HP, an empty XP bar, `LV 1`, a timer of `00:00`, `KILLS 0`, and no powerup icons

#### Scenario: Fixed to the screen
- **WHEN** the player walks and the camera follows
- **THEN** every HUD element stays at the same screen position

#### Scenario: New session after death
- **WHEN** the player dies, returns to the title screen and starts again
- **THEN** the HUD is back to its session-start state

### Requirement: HP bar
The HUD SHALL show the player's HP as a bar whose fill width is current HP divided by max HP times the full fill width, rounded to whole pixels and kept between 0 and the full width, together with the text `hp/max`. It SHALL stay correct after damage, healing, and Max HP upgrades. On every `player-hit` the HP fill SHALL flash for a configured time.

#### Scenario: Damage
- **WHEN** the player at 100/100 HP takes 25 damage
- **THEN** the HP text reads `75/100`, the fill is 75% of the full width, and the fill flashes

#### Scenario: Heal
- **WHEN** the player at 50/100 HP collects a Health Pack that heals 30
- **THEN** the HP text reads `80/100` and the fill is 80% of the full width

#### Scenario: Max HP upgrade
- **WHEN** the player takes a Max HP upgrade
- **THEN** the HP text and fill reflect the new current and max HP

#### Scenario: Death
- **WHEN** the player's HP reaches 0
- **THEN** the HP fill has zero width and the text reads `0/max`

### Requirement: XP bar and level
The HUD SHALL show progress toward the next level as a bar whose fill width is XP into the current level divided by XP needed for the next level times the full fill width, rounded to whole pixels, together with the label `LV n` for the current level. On every `player-leveled` the level label SHALL pop (briefly scale up) for a configured time.

#### Scenario: Gaining XP
- **WHEN** the player collects gems worth half the XP needed for level 2
- **THEN** the XP fill is half the full width and the label reads `LV 1`

#### Scenario: Level up
- **WHEN** collected XP crosses into level 2
- **THEN** after the upgrade is chosen, the label reads `LV 2`, the XP fill shows only the XP carried into level 2, and the label popped on the level-up

### Requirement: Survival timer
The HUD SHALL show the session's survival time as `mm:ss`, with minutes zero-padded to at least two digits. It SHALL show the same survival time the run stats use, so it SHALL NOT advance while the Game is paused for LevelUp or after the player dies.

#### Scenario: Format
- **WHEN** the survival time is 127 seconds
- **THEN** the timer reads `02:07`

#### Scenario: Paused during LevelUp
- **WHEN** the LevelUp screen is open
- **THEN** the timer does not change until play resumes

#### Scenario: Stops at death
- **WHEN** the player dies
- **THEN** the timer stops at the death time, which matches the time shown on GameOver

### Requirement: Kill count
The HUD SHALL show the session's kill count as `KILLS n`, matching the kill count used for the run stats.

#### Scenario: Kills
- **WHEN** the player kills 3 enemies, one of them with a Bomb
- **THEN** the HUD reads `KILLS 3`

### Requirement: Active powerups
The HUD SHALL show one icon for each active timed powerup (Rapid Fire, Spread Shot, Shield), always in that order and without gaps, each with its remaining time in whole seconds rounded up (for example `8s`). The icon SHALL blink during a configured warning time before it runs out, and SHALL disappear when the powerup expires. Refreshing a powerup SHALL reset its countdown without adding a second icon. Instant powerups (Health Pack, Bomb, Magnet) SHALL NOT show an icon. The countdowns SHALL NOT advance while the Game is paused.

#### Scenario: Two powerups
- **WHEN** the player collects Shield and then Rapid Fire
- **THEN** the HUD shows the Rapid Fire icon first and the Shield icon second, each with its own seconds left

#### Scenario: Countdown and expiry
- **WHEN** Spread Shot has 1.2 s left
- **THEN** its icon reads `2s` and blinks, and once it expires the icon is gone

#### Scenario: Refresh
- **WHEN** Rapid Fire is collected again with 3 s left
- **THEN** there is still one Rapid Fire icon and it shows the full duration again

#### Scenario: Instant powerup
- **WHEN** the player collects a Magnet
- **THEN** no powerup icon appears

### Requirement: Pixel-crisp HUD
At the 960×540 base resolution, every HUD element SHALL be placed on whole-pixel screen coordinates, and bar fills SHALL change width only in whole pixels, so HUD art and text are not smoothed or blurred.

#### Scenario: Whole pixels
- **WHEN** the HP or XP fill is at any fraction
- **THEN** every HUD element's position and each fill's visible width are whole numbers

### Requirement: HUD placeholders
While a HUD art key is a generated placeholder, the HUD SHALL tint it so each element reads clearly: the HP fill red, the XP fill green, and each powerup icon the same color as its powerup's pickup placeholder. Real art SHALL be shown untinted.

#### Scenario: Placeholder icons
- **WHEN** the powerup icon art is missing and Shield is active
- **THEN** the Shield icon is shown in the Shield pickup's placeholder color

### Requirement: HUD numbers from configuration
HUD positions, sizes, colors, placeholder tints, the hit flash time, the level pop time and scale, and the powerup warning time SHALL be defined in a configuration module, not in scene code.

#### Scenario: Tune the warning time
- **WHEN** a developer changes the HUD powerup warning time in the config
- **THEN** powerup icons start blinking at the new time on the next reload with no scene code edits
