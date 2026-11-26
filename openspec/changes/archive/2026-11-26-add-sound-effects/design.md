# Design

## Context

- **Pack contents.** GH-28's pack is `gun-hands-sfx.zip`: 20 `{slug}.wav` files plus `sounds.json` and `sounds.js`. Its source library is `assets-src/sfx/gun-hands.sfx.json`, and the arcade-sfx MCP `export_pack` can rebuild the zip from it. The pack's `sounds.js` loads with `scene.load.audio(slug, path + file)` from one plain URL folder, and its `playSound` **throws** on an unknown slug.
- **How art loads.** Art goes through `src/assets/available.js`: `import.meta.glob` finds the files that exist and gives their hashed URLs. With `base: './'`, the build works from any sub-path. Missing art gets a placeholder.
- **Game events.** These events are emitted on the Game scene's `events`: `enemy-hit` (before `enemy-killed`), `enemy-killed`, `player-hit`, `player-died`, `player-fired` (with `blocked`), `powerup-collected`, `powerup-expired`, `player-leveled`, `xp-changed` and `upgrade-chosen`.
- **Moments with no event:**
  - XP collected. `xp-changed` also fires for the debug L key.
  - A bullet hitting a wall. Today this is a `GameScene` collider callback.
  - A shield block. `Combat.canContact` returns false while shielded and emits nothing.
- **Phaser constraints:**
  - The Game scene instance and its `sys.events` persist across restarts, so listeners must come off on `shutdown`.
  - A single keydown is sometimes handled twice (GH-9 note).
  - Paused scenes take no input.
  - `game.sound` is game-wide. Its `locked` flag is true until the first touch, click or key press.

## Goals / Non-Goals

**Goals:**
- Gameplay code calls nothing new except the three small event emits. All sound logic lives in `src/audio/`.
- The throttle, pitch and persistence logic is pure, so it can be unit-tested without Phaser or real audio.
- E2E tests can observe sound requests without depending on audio output in headless Chromium.

**Non-Goals:**
- Audio sprites, compressed formats (OGG/MP3) and streaming. 750 KB of short WAVs is fine for the demo.
- Generating ZzFX sounds at runtime. We play the WAVs, and the ZzFX params stay in `sounds.json` for reference only.

## Decisions

### 1. Find WAVs with `import.meta.glob`, not the pack's `loadSounds`
`src/audio/available.js` globs `../assets/sfx/*.wav` into a slug → URL map, mirroring `assets/available.js`. `PreloadScene` calls `load.audio(slug, url)` for each configured slug that has a URL.
- **Why:** the hashed Vite URLs and `base: './'` don't fit `loadSounds(scene, 'assets/sfx/')`. Missing files would also turn into load errors there. The glob gives the same missing-file tolerance as art.
- **Alternative:** put the WAVs in `public/assets/sfx/` and use `loadSounds`. It's simpler, but it skips Vite hashing (stale cache after a pack update), moves the folder away from what GH-29 specifies, and still fails on missing files.
- **Pack files:** `sounds.json` is kept next to the WAVs as reference, and `src/assets/sfx/` is added to `.prettierignore`. `sounds.js` is **not** kept. Nothing imports it, and it would trip ESLint, Prettier and typecheck (4-space style, throwing helper). The library in `assets-src/` can regenerate it at any time.

### 2. Slugs and tuning in `src/config/audio.js`
`AUDIO.sounds` holds each slug with `{ volume, minIntervalMs, maxVoices, pitchJitter }`. The file also holds `masterVolume`, `xpChain: { step, max, gapMs }`, `storageKey` and the toggle layout. These are defaults to tune in GH-13:

| Sounds | minIntervalMs | maxVoices | pitchJitter (semitones) |
|---|---|---|---|
| `shoot` | 60 | 4 | ±1 |
| `enemy-hit`, `bullet-wall` | 50 | 4 | ±1 |
| `xp-pickup` | 40 | 3 | (none; the chain sets pitch) |
| `ui-hover` | 80 | 1 | (none) |
| `shield-block` | 300 | 1 | (none) |
| `level-up` | 300 | 1 | (none) |
| everything else | 0 | 2 | (none) |

`ASSETS.md` gets an `## Audio` section whose table lists exactly these slugs, and a unit test checks they match. A second test checks that every `src/assets/sfx/*.wav` is a configured slug, which catches misspelled file names, the main GH-28 risk.

### 3. One `Sfx` service per game, held in the registry
`src/audio/Sfx.js` takes the sound manager, config, a clock, an rng and a storage adapter (all injectable). Preload creates it and stores it as `registry.get('sfx')`. `getSfx(scene)` returns it, or a shared no-op instance if it isn't there yet, so a scene can never crash on audio.

`play(slug, { semitones })` passes through these gates in order:
1. unknown or missing slug
2. muted
3. `sound.locked`
4. throttle rule
5. play with `volume = masterVolume × slug volume` and `rate = 2^(semitones / 12)`

It returns `'played'` or the reason it dropped the request. Voices are counted per slug: +1 on play, −1 on `complete` or `destroy`.
- **Why a service and not a Phaser plugin:** it's plain JS that can be constructed in Vitest with a fake manager, the same pattern as `Upgrades` and `Powerups` with their replaceable `rng`.

### 4. Pure rules in `src/audio/rules.js`
- `throttle(state, now, cfg)` → `{ ok, state }`, using the last accepted time and the current voice count.
- `xpChainSemitones(chain, now, cfg)` → `{ semitones, chain }`. It steps up while pickups come within `gapMs`, caps at `max`, and resets after a longer gap.
- `jitter(rng, range)`.

The clock is `game.loop.time`. It stops while the tab is hidden, which matches the throttles.

### 5. Wiring Game events in `src/audio/GameAudio.js`
`GameScene.create` builds `new GameAudio(this, getSfx(this))`. It subscribes to the events in the spec's table, and an `events.once('shutdown')` removes every listener.

The mapping rules:
- `enemy-hit` is skipped when `hpLeft <= 0`, because the death sound covers it.
- `player-hit` is skipped when `hp === 0`.
- `enemy-killed` plays `brute-die` when `typeId === 'brute'`, otherwise `enemy-die`.
- `powerup-collected` maps through a table: `health` → `heal`, `shield` → `shield-up`, `bomb` → `bomb`, and everything else → `powerup-pickup`.

**Three new events,** each documented in its existing `events.js` file:
- `xp-collected` `{ amount }` in `xp/events.js`. `Xp.update` emits it when gems are collected, but the debug `grantLevel` path does not. `xp-changed` isn't reused because it also fires for the debug L key and carries no notion of a pickup.
- `bullet-wall` `{ x, y }` in `combat/events.js`. The `GameScene` bullet–wall collider emits it before `despawn()`.
- `shield-blocked` `{ typeId }` in `combat/events.js`. `Combat.canContact` emits it when the only reason contact is refused is the shield. Phaser calls this process callback every physics step while bodies overlap, so it fires repeatedly. The `shield-block` 300 ms interval turns that into one sound per contact. Debouncing inside Combat was rejected because that would put audio timing into gameplay code.

Menu sounds are played directly:
- **Button:** `ui-hover` on `pointerover`, `ui-click` just before `onClick`.
- **TitleScene.start():** `game-start`, behind its existing `started` guard.
- **GameOverScene.create():** `game-over`.

The keyboard paths (Enter/Space/Esc) play no `ui-click`, only the screen's own sound.

### 6. Mute: state in `Sfx`, the M key in each interactive scene, a toggle on Title and Pause
- **State:**
  - `Sfx.setMuted(bool)` sets its own gate and `sound.mute`, which also cuts sounds already playing.
  - It persists through `src/audio/storage.js`: `load()` and `save()` wrap `localStorage` in try/catch and fall back to "not muted". If a write fails, the state stays in memory for the visit.
- **M key:**
  - `bindMuteKey(scene)` is called in Title, Game, LevelUp, Pause and GameOver.
  - It ignores a keydown whose `event.timeStamp` equals the last one handled, which covers Phaser's doubled keydown.
  - Paused scenes take no input, so only the foreground scene reacts.
- **Toggle:**
  - `src/ui/SoundToggle.js` is a small interactive text in the top-right corner ("SOUND ON" / "SOUND OFF"). Its hit area is padded, and it uses a larger size on touch through `pickLayout`.
  - It refreshes on an `Sfx` `'mute-changed'` event, so pressing M updates it too.
  - It is a text label, not a `Button`, so it doesn't compete with the screen's main buttons for space or art.

### 7. Audio unlock: drop, don't queue
Phaser unlocks on the first gesture by itself. `Sfx` checks `sound.locked` and drops requests while it is true, so the hover sounds made before the first click don't burst out later. The first Start click unlocks during `mousedown` and plays on `mouseup`, so Start's own sounds still play.

### 8. Test seams
- **Unit tests:**
  - `rules.js`: throttle, chain and jitter.
  - `Sfx` against a fake manager: gates, volume, rate, voice counting, mute persistence with a throwing storage.
  - Config ↔ `ASSETS.md` ↔ WAV files.
- **E2E tests:**
  - Wrap `registry.get('sfx').play` in the page and record `[slug, result]`, the same approach as the HUD's `flashHp` recording (GH-10).
  - Assert that requests happen for the key moments, and that M flips `muted` and the toggle text.
  - Real playback is never asserted.

## Risks / Trade-offs

- [Headless Chromium may fail to decode WAVs or keep audio locked] → E2E asserts on requests, not on `'played'`. The unlock and volume gates are covered by unit tests with a fake manager.
- [`shield-blocked` fires every physics step during contact] → It's cheap (no listeners besides audio), and the throttle turns it into one sound per 300 ms. The event comment documents this.
- [A doubled keydown on M toggles twice] → The `timeStamp` dedupe. A unit test feeds the same event twice.
- [Many sounds at once in late-game swarms] → The per-slug voice caps and intervals bound it. GH-13 can tighten the numbers in config without code changes.
- [750 KB added to the first load] → Accepted for the demo. The WAVs load during the existing loading bar, and OGG conversion can come later if it matters.

## Migration Plan

There's no data migration. Unzip the GH-28 pack into `src/assets/sfx/` and drop `sounds.js`. Rollback is a revert: the game is silent without the folder, by design.
