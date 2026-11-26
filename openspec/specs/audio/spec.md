# audio Specification

## Purpose
Plays the game's sound effects from the delivered SFX pack: which moments make which sound, how frequent sounds are kept from piling up, and how the player mutes them, without gameplay or development ever depending on a sound file being present.

## Requirements

### Requirement: Sound pack loading
The game SHALL load every sound effect file delivered in the sound folder during the loading screen, keyed by its slug (the file name without `.wav`). The set of slugs the game uses SHALL come from configuration. A configured slug with no delivered file SHALL be treated as missing; a delivered file whose slug is not configured SHALL be ignored. In development builds, the game SHALL log one warning listing the missing slugs.

#### Scenario: Full pack delivered
- **WHEN** the game loads with a file for every configured slug
- **THEN** every configured sound is available to play and no missing-sound warning is logged

#### Scenario: Pack missing
- **WHEN** the game loads with no sound files at all
- **THEN** the game starts and plays normally, silently, and a development build logs one warning listing every slug

### Requirement: Missing sounds are silent
Requesting a sound that is missing, unknown, muted, or requested before the browser allows audio SHALL play nothing and SHALL NOT throw or interrupt the game.

#### Scenario: Unknown slug
- **WHEN** game code requests a slug that is not configured
- **THEN** nothing plays and the game continues without an error

### Requirement: Game moments play sounds
The game SHALL play these sounds (subject to muting and throttling):

| Moment | Sound |
|---|---|
| a shot is fired | `shoot` |
| a shot is blocked because the gun tip is inside a wall, or a bullet hits a wall | `bullet-wall` |
| a bullet damages an enemy without killing it | `enemy-hit` |
| a Grunt or Runner dies from damage | `enemy-die` |
| a Brute dies from damage | `brute-die` |
| the player takes damage and survives | `player-hurt` |
| the player dies | `player-die` |
| the shield absorbs an enemy contact | `shield-block` |
| XP gems are collected | `xp-pickup` |
| the player gains a level | `level-up` |
| an upgrade card is chosen | `card-pick` |
| Rapid Fire, Spread Shot or Magnet is collected | `powerup-pickup` |
| a Health Pack is collected | `heal` |
| a Shield is collected | `shield-up` |
| a Bomb is collected | `bomb` |
| a timed powerup runs out | `powerup-expire` |
| the pointer moves onto a menu button | `ui-hover` |
| a menu button is activated | `ui-click` |
| a session is started from the title screen | `game-start` |
| the game over screen appears | `game-over` |

A killing hit SHALL play only the death sound, and a fatal player hit SHALL play only `player-die`. Enemies recycled for being far away SHALL NOT play a death sound.

#### Scenario: Killing a Brute
- **WHEN** a bullet deals a Brute its final damage
- **THEN** `brute-die` plays and `enemy-hit` does not play for that hit

#### Scenario: Fatal hit
- **WHEN** an enemy contact takes the player to 0 HP
- **THEN** `player-die` plays and `player-hurt` does not

#### Scenario: Shield absorbs contact
- **WHEN** a Grunt touches a player with an active Shield
- **THEN** `shield-block` plays, the player takes no damage, and no `player-hit` event is emitted

#### Scenario: Bomb pickup
- **WHEN** the player collects a Bomb
- **THEN** `bomb` plays and `powerup-pickup` does not

#### Scenario: Starting from the title
- **WHEN** the player clicks the Start button on the title screen, then clicks it again before the game appears
- **THEN** `ui-click` and `game-start` each play once for the first click, and the second click starts nothing

#### Scenario: Starting with the keyboard
- **WHEN** the player presses Enter on the title screen
- **THEN** `game-start` plays and `ui-click` does not

### Requirement: Frequent sounds are throttled
Each sound SHALL have a configured minimum interval and maximum number of simultaneous plays. A request that comes sooner than the minimum interval after the last accepted play of the same sound, or while that sound already has its maximum number of plays sounding, SHALL be dropped. Sounds configured with pitch variation SHALL play each accepted request at a random pitch within the configured range.

#### Scenario: Rapid fire
- **WHEN** the player fires many shots within the `shoot` minimum interval
- **THEN** only the first of those shots plays `shoot`

#### Scenario: Voice cap
- **WHEN** a sound is requested while its maximum number of plays are already sounding
- **THEN** the request is dropped and the sounding plays continue

### Requirement: XP pickup chain rises in pitch
Each XP pickup sound that plays within the configured chain gap of the previous one SHALL play one configured step higher than the previous one, up to a configured maximum. A pickup after a longer pause SHALL restart at the base pitch. Pickups dropped by throttling SHALL NOT advance the chain.

#### Scenario: Quick pickups
- **WHEN** the player collects gems four times, 100 ms apart
- **THEN** the pickups play at the base pitch, then one, two and three steps higher

#### Scenario: Throttled pickups don't skip steps
- **WHEN** the player collects gems on several frames inside the `xp-pickup` minimum interval, then once more after it
- **THEN** the first pickup plays at the base pitch, the throttled ones play nothing, and the next one plays one step higher

#### Scenario: Chain resets
- **WHEN** the player collects a gem after a pause longer than the chain gap
- **THEN** `xp-pickup` plays at the base pitch

### Requirement: Mute and master volume
The player SHALL be able to toggle all sound effects on and off with the M key in any scene and with a sound toggle on the title screen and the pause menu. The toggle SHALL show the current state. All sounds SHALL play at a configured master volume times their configured per-sound volume. The mute state SHALL be remembered between visits on the same browser. If browser storage is unavailable, the game SHALL still work, default to sound on, and keep the mute state for the current visit.

#### Scenario: Mute with M
- **WHEN** the player presses M during a run
- **THEN** no further sound effects play until the player presses M again

#### Scenario: Mute is remembered
- **WHEN** the player mutes on the title screen and reloads the page
- **THEN** the game starts muted and the title toggle shows sound off

#### Scenario: Storage blocked
- **WHEN** browser storage throws on every access
- **THEN** the game starts with sound on and the mute toggle still works for the visit

### Requirement: Audio unlock
The game SHALL NOT queue sounds requested before the browser allows audio playback. Sounds requested while audio is locked SHALL be dropped, so no burst of old sounds plays when audio unlocks on the first tap, click or key press.

#### Scenario: Hover before first click
- **WHEN** the pointer moves over the Start button before the player has clicked or tapped anything
- **THEN** no `ui-hover` plays later when audio unlocks
