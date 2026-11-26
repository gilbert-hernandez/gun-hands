# Tasks

## 1. Pack and config

- [x] 1.1 Unzip the GH-28 pack (`assets-src/sfx/export/gun-hands-sfx.zip`; re-export it with the arcade-sfx MCP `export_pack` if missing) into `src/assets/sfx/` and keep the 20 WAVs plus `sounds.json`. Drop `sounds.js` and add `src/assets/sfx/` to `.prettierignore`. Verify `ls src/assets/sfx/*.wav | wc -l` is 20 and `npm run format:check` passes.
- [x] 1.2 Add `src/config/audio.js` (`AUDIO`: `masterVolume`, `sounds` with per-slug `volume`/`minIntervalMs`/`maxVoices`/`pitchJitter` per design §2, `xpChain`, `storageKey`, toggle layout with a `touch` override) and export it from `src/config/index.js`. Add `tests/audioConfig.test.js`: all 20 GH-28 slugs present, values in range, and every `src/assets/sfx/*.wav` is a configured slug. Verify `npm test`.
- [x] 1.3 Add the `## Audio` section to `ASSETS.md`: the slug table (slug, trigger, notes, matching the GH-28 list), the location (`src/assets/sfx/`), and delivery steps (export from Arcade `/sfx` or the MCP, unzip, drop `sounds.js`). Extend `tests/audioConfig.test.js` to check that the table matches `AUDIO.sounds` exactly. Verify `npm test`.

## 2. Sound player core

- [x] 2.1 Add `src/audio/rules.js` (`throttle`, `xpChainSemitones`, `jitter`) and `tests/audioRules.test.js`, covering the interval drop, the voice cap, chain stepping, the cap at `max` and the reset after `gapMs`, and jitter staying within range with a seeded rng (`tests/rng.js`). Verify `npm test`.
- [x] 2.2 Add `src/audio/storage.js` (`loadMuted`/`saveMuted` around `localStorage` with try/catch) and `src/audio/Sfx.js`:
  - the gate order from design §3: unknown/missing → muted → locked → throttle → play with volume and rate
  - per-slug voice counting
  - `setMuted`/`toggleMuted` with `'mute-changed'` and `sound.mute`
  - `getSfx(scene)` with a no-op fallback

  Add `tests/sfx.test.js` with a fake sound manager:
  - each gate's return value
  - volume = master × slug, and rate for ±12 semitones
  - voice release on `complete`
  - mute persisted, plus a storage that throws on every call (starts unmuted, toggle still works)

  Verify `npm test`.
- [x] 2.3 Add `src/audio/available.js` (glob `../assets/sfx/*.wav` → slug → URL). Load the configured slugs in `PreloadScene.preload`, then in `create` build `Sfx` into `registry('sfx')` and log the dev warning listing missing slugs. Verify `npm run dev` shows no missing-sound warning, and that it lists all 20 slugs when `src/assets/sfx/` is temporarily renamed (then restore it).

## 3. Game moments

- [x] 3.1 Add the three events (`xp-collected` in `xp/events.js` from `Xp.update`; `bullet-wall` and `shield-blocked` in `combat/events.js`, from the `GameScene` bullet–wall collider and `Combat.canContact` when shielded), with JSDoc typedefs like the existing events. Move `PLAYER_FIRED` into `src/player/events.js` (re-exported from `Player.js`) so the audio wiring can import it without Phaser. Cover the events in `e2e/audio.spec.js` (Phaser can't load under Vitest): `xp-collected` fires on gem collection but not from `grantLevel`, `shield-blocked` fires while `player-hit` doesn't, and `bullet-wall` fires on a wall hit. Verify with the e2e run in 3.3.
- [x] 3.2 Add `src/audio/GameAudio.js` with the event → slug mapping from design §5 (death sound instead of hit, fatal hit plays only `player-die`, Brute death, powerup table, XP chain pitch, `player-fired` with `blocked` → `bullet-wall`). Remove the listeners on `shutdown`, and construct it in `GameScene.create`. Add `tests/gameAudio.test.js` driving a fake emitter and recording `Sfx`, covering each mapping row and checking that listeners are gone after `shutdown` (restart doesn't double sounds). Verify `npm test`.
- [x] 3.3 Add the menu sounds: `Button` (`ui-hover` on `pointerover`, `ui-click` before `onClick`), `TitleScene.start()` → `game-start` (inside the `started` guard) and `GameOverScene.create()` → `game-over`. Add `e2e/audio.spec.js`, which records `sfx.play` calls in the page (wrap the method), and cover:
  - Start click → `ui-click` + `game-start`
  - Enter → `game-start` only
  - a shot → `shoot`
  - a kill → `enemy-die`
  - debug G → `player-die` and then `game-over`
  - a P-key Bomb drop collected → `bomb`

  Use `ignoreWindowBlur`, set powerup `dropChance`s to 0 and follow the GH-27 one-`evaluate` pattern. Verify `npx playwright test e2e/audio.spec.js` passes 3 runs in a row.

## 4. Mute

- [x] 4.1 Add `bindMuteKey(scene)` (M key with `event.timeStamp` dedupe) and call it in Title, Game, LevelUp, Pause and GameOver. Add a unit test showing that the same event passed twice toggles once. Extend `e2e/audio.spec.js`: pressing M in a run sets `sfx.muted` and drops the next `shoot` as `'muted'`, and pressing M again restores it. Verify the unit tests and e2e pass.
- [x] 4.2 Add `src/ui/SoundToggle.js` (top-right "SOUND ON/OFF" text, padded hit area, touch size through `pickLayout`, refreshes on `'mute-changed'`) and put it on Title and Pause. Extend e2e:
  - clicking the toggle on Title flips it
  - after a reload it shows SOUND OFF
  - M on Pause updates the Pause toggle
  - on the mobile project it doesn't overlap Start or Resume

  Verify `npx playwright test e2e/audio.spec.js e2e/mobile.spec.js e2e/flow.spec.js` passes.

## 5. Integration check

- [x] 5.1 Run the full suite (`npm run check`, `npm run e2e` with no SplatAttack run in parallel, `npm run build`) and confirm everything passes. Confirm `dist/` contains the hashed WAVs (Vite inlines the two under 4 KB, `ui-hover` and `bullet-wall`, as data URIs, so 18 files) and that all 20 sounds load when the build is served from a sub-path.
- [x] 5.2 Manual check in the browser (`npm run dev`):
  - Title is silent until the first click, and hovering Start afterward plays a subtle tick.
  - Start plays click + start.
  - Constant fire sounds steady rather than distorted.
  - Kills and Brute deaths sound different.
  - XP pickups rise in pitch in quick runs.
  - Level-up and card pick play.
  - The P key cycles powerups, each with its own sound, and a Bomb booms.
  - Shield contact pings without spamming.
  - M mutes and unmutes everywhere, and the title toggle matches after a reload.
  - On a phone (or touch emulation), the first tap unlocks audio and the toggle is easy to hit.
