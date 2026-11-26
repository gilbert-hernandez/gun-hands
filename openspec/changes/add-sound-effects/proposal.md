# Proposal

## Why

The game is silent. GH-28 delivered a 20-sound SFX pack (`gun-hands-sfx.zip`, made with Arcade `/sfx`), and the 12/6 demo needs audio feedback for shooting, hits, pickups and menus. Vikunja: GH-29.

## What Changes

- Add the GH-28 pack to the repo in `src/assets/sfx/` (one `{slug}.wav` per sound, plus the pack's `sounds.json` and `sounds.js` kept for reference) and load every WAV during Preload.
- Add a game-wide sound player that plays a sound by slug. If a slug has no loaded WAV, it plays nothing and never throws, the same as the art placeholders. In dev builds it warns once about missing sounds.
- Play sounds for existing game moments, mostly by listening to the Game events that already exist:
  - shots, blocked shots and bullets hitting walls
  - enemy hits and deaths (Brutes get their own death sound)
  - player hurt and death
  - shield blocks, XP pickups and level-ups
  - card picks, powerup pickups (each powerup type has its own sound) and powerup expiry
  - menu hover and click, game start and game over
- Add one small new event for each moment that has no event today:
  - XP collected
  - a bullet hitting a wall
  - an enemy contact absorbed by the shield (today it is silently ignored)
- Stop frequent sounds from piling up:
  - Each slug gets a minimum interval and a voice cap.
  - Repeats get a small random pitch variation.
  - Quick XP pickups rise one semitone per pickup, up to a cap, and the chain resets after a short pause.
- Add a mute toggle: the M key in any scene, plus a sound on/off toggle on the Title and Pause screens. A master volume comes from config. The mute setting is remembered across visits in `localStorage`, and storage failures are ignored.
- Wait for the browser's audio unlock (first tap, click or key). Sounds requested before that are dropped instead of queued.
- `ASSETS.md`: add a new Audio section with the slug table and delivery steps. A unit test keeps it in sync with the config.

## Non-goals

- Music or ambient loops.
- Volume sliders or an options screen. The master volume is a config value, and per-sound levels are tuned later in GH-13.
- Positional/stereo audio or distance attenuation.
- Changing the sounds themselves. That belongs to GH-28 and Arcade `/sfx`.
- Haptics or vibration on mobile.

## Capabilities

### New Capabilities

- `audio`: loading the SFX pack, playing sounds by slug with missing-sound tolerance, which game moments play which sound, throttling and pitch rules, mute/volume and its persistence, and audio unlock.

### Modified Capabilities

(none). The new events are internal hooks, and gameplay behavior does not change.

## Impact

- **New code:** `src/audio/` (sound player, Game-event wiring, pure throttle/pitch rules), `src/config/audio.js` (per-slug volume, interval and voice cap; XP chain; master volume) and `src/assets/sfx/` (20 WAVs, about 750 KB).
- **Touched code:**
  - `PreloadScene` loads the sounds.
  - `GameScene` starts the audio wiring and emits the bullet–wall event.
  - `Xp` emits XP collected.
  - `Combat` emits shield blocks.
  - `Button` plays hover and click.
  - `TitleScene`, `PauseScene` and `GameOverScene` play their sounds and show the mute toggle.
- **Tests:** unit tests for the rules and the config/ASSETS.md/WAV consistency. E2E tests record play requests in the page and never check real audio output.
- **Build:** adds about 750 KB of WAVs to `dist/`. There are no new dependencies.
