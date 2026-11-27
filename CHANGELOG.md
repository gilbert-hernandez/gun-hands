# Changelog

All notable changes to Gun Hands are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versioning is [SemVer](https://semver.org/) 0.x until a real release. The minor number counts finished milestones (M1 Core, M2 Progression, M3 Art & Polish). The version lives in `package.json` and shows on the title screen. Ticket numbers (GH-n) refer to the Gun Hands project in Vikunja.

## [Unreleased]

## [0.2.3] - 2026-11-27

Heal art. The Health pickup now shows what it does. M3 Art & Polish is still in progress.

### Changed

- **Health pickup art** (GH-20, GH-21): a heart with a medical cross instead of "+1", since Health restores 30 HP rather than giving an extra life.

### Known limitations

- No juice or balance pass yet (GH-13).
- No music.
- Not deployed yet (GH-14).

## [0.2.2] - 2026-11-26

The real art. Every placeholder shape is replaced by david's pixel art, with no gameplay changes. M3 Art & Polish is still in progress (juice and balance, deployment).

### Added

- **Art integration** (GH-12, art from GH-16 to GH-22): the player, Grunt, Runner and Brute, bullets and effects, XP gems and powerup tokens, the HUD, level-up cards, the title screen and the Game Over panel now use the delivered art. The arena is re-skinned with the new tileset (fence walls, crates, barrels, boulders and wrecks), and its walls and obstacles are exactly where they were.
- **New animations** (GH-12): each enemy type has its own death animation, bullets throw impact sparks on enemies and walls, a burst plays around the player on level-up, the player flinches when hit, and the guns recoil on every shot. Animation speeds follow the artist's timings.
- **Release workflow** (GH-30): pushing a `vX.Y.Z` tag builds the game and attaches `gun-hands-X.Y.Z.tar.gz` and its SHA-256 checksum to the GitHub release, creating the release from the CHANGELOG if needed, with the exact values for installing on Arcade in the notes. `npm run package` makes the same archive locally. Tooling only; no gameplay change.

### Changed

- **Hurtboxes** (GH-12) now sit on the drawn bodies. Their sizes are unchanged, and the player's mirrors when facing left.

### Known limitations

- The Health pickup and its HUD icon still show a "+1", but Health restores 30 HP rather than giving an extra life. New art is on the way (GH-20, GH-21).
- No juice or balance pass yet (GH-13).
- No music.
- Not deployed yet (GH-14).

## [0.2.1] - 2026-11-26

Phone play and sound. The demo now plays on touch screens and has sound effects throughout. M3 Art & Polish is still in progress, so **the art is still placeholder shapes.**

### Added

- **Touch controls** (GH-25): twin floating thumbsticks (left moves, right aims), an on-screen pause button, tap-to-pick upgrade cards that ignore thumbs left on the sticks, and automatic switching between touch and keyboard and mouse.
- **Mobile layout** (GH-26): larger text, buttons, cards and HUD on touch devices, a "Rotate your phone" prompt that pauses play in portrait, thumbs that work in the black side bars, and a canvas that stays clear of notches and browser bars.
- **Sound effects** (GH-28, GH-29): 20 retro sounds for shots, hits, deaths, XP pickups, level-ups, upgrade cards, powerups, menu buttons, game start and game over. Frequent sounds are rate-limited with slight pitch variation, and quick XP pickups rise in pitch. Sound starts on the first click, key or tap. Mute with M or the SOUND ON/OFF toggle on the title screen and pause menu; the choice is remembered. A missing sound file plays nothing and never breaks the game.

### Fixed

- **Flaky browser test** (GH-27): the "exhausted bullet pool" test no longer fails intermittently under load. Test-only; no gameplay change.

### Known limitations

- Placeholder art throughout (art tickets GH-15 to GH-22, integration GH-12).
- No juice or balance pass yet (GH-13): numbers and sound levels are first-pass tunables.
- No music.
- Not deployed yet. GH-14 deploys the demo to gunhands.hernandez.solutions.

## [0.2.0] - 2026-11-24

The first tagged version. Milestones M1 Core and M2 Progression are complete, so the full demo loop plays from title to game over and restart. **All art is still generated placeholder shapes.** The real art arrives with M3 (v0.3.0).

### Added

- **Project setup** (GH-1): Vite + Phaser 4.2.1 scaffold, the scene flow (Boot, Preload, Title, Game, UI, LevelUp, Pause, GameOver), and a single asset manifest with generated placeholders for any art that isn't delivered yet.
- **Player movement** (GH-2): WASD with normalized diagonals, arena bounds, camera follow.
- **Shooting** (GH-3): guns auto-fire toward the mouse cursor from a pooled bullet system, and the gun hands rotate independently of the body.
- **Arena map** (GH-4): Tiled tilemap with wall collisions for the player and bullets.
- **Enemies** (GH-5): Grunt, Runner and Brute spawn just off-screen and chase the player, with waves that ramp up over survival time.
- **Combat** (GH-6): damage, hit flash, knockback, enemy death, contact damage with invulnerability frames, and player death.
- **XP and leveling** (GH-7): three tiers of XP gems, a pickup magnet radius, the XP curve, and queued level-ups.
- **Upgrades** (GH-8): a pick-1-of-3 card screen on level-up (damage, fire rate, multishot, pierce, move speed, max HP, pickup radius).
- **Powerups** (GH-9): a loot drop table with timed Rapid Fire, Spread Shot and Shield, and instant Health Pack, Bomb and Magnet.
- **HUD** (GH-10): HP and XP bars, level, survival timer, kill count, and active powerup timers.
- **Game flow** (GH-11): title screen with Start, pause menu (Esc or window focus loss) with Resume and Quit to Title, a GameOver screen with run stats, and Restart into a clean new session.
- **Build version on the title screen** (GH-24): `v0.2.0` in production builds, `v0.2.0-dev (<commit>)` in development.
- **Dev tooling** (GH-23): Prettier, ESLint, JSDoc type-checking, Vitest with coverage, Playwright browser tests and gameplay video recording, and GitHub Actions CI.

### Known limitations

- Placeholder art throughout (art tickets GH-15 to GH-22, integration GH-12).
- No juice or balance pass yet (GH-13): numbers are first-pass tunables.
- No sound or music.
- Not deployed yet. GH-14 deploys the demo to gunhands.hernandez.solutions.

[Unreleased]: https://github.com/gilbert-hernandez/gun-hands/compare/v0.2.3...HEAD
[0.2.3]: https://github.com/gilbert-hernandez/gun-hands/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/gilbert-hernandez/gun-hands/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/gilbert-hernandez/gun-hands/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/gilbert-hernandez/gun-hands/releases/tag/v0.2.0
