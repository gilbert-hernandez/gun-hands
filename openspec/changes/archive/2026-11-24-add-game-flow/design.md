# Design

## Context

See proposal.md (Why). Current state:

- `TitleScene` and `GameOverScene` are text stubs. Each starts its next scene on `input.once('pointerdown')` or `keyboard.once('keydown-ENTER')`.
- Death runs through `Combat.playerDied()`: it freezes enemies, plays the death animation, waits `COMBAT.gameOverDelayMs`, stops `UI`, and starts `GameOver` with `{ timeMs, kills, level }`.
- LevelUp pauses Game through `Xp.openLevelUp()` and tracks "open" with the `xp.levelUpOpen` flag, because Phaser queues `pause`/`launch` until the next step and `isPaused()` can't see them in the same frame.
- Every per-run object (Player, Bullets, Enemies, Combat, Xp, Upgrades, Powerups) is built in `GameScene.create()`, and each one removes its own `scene.events` / `scene.input` listeners on `SHUTDOWN`. Starting `Game` again therefore already builds a fresh session. The work here is to keep it that way and prove it with tests.
- Scene list order in `main.js` is the draw order: `Boot, Preload, Title, Game, UI, LevelUp, GameOver`.
- Known Phaser quirk (GH-9): one keydown is sometimes handled twice. LevelUp guards against this with a `ready` delay and a `chosen` flag.

## Goals / Non-Goals

**Goals:**
- One button widget that all three menus share, with states e2e tests can read.
- Pausing reuses the same Game-scene pause that LevelUp already uses, so every system that "stops while paused" stays correct with no changes.
- A test that would catch a leak from session to session (listeners, colliders, stats).

**Non-Goals:**
- Changing how the run systems pause or reset internally. If the leak test finds a real leak, it gets fixed at its source.
- Keyboard focus navigation between buttons.

## Decisions

### 1. Pause is its own scene, launched over a paused Game

A new `PauseScene` (key `Pause`) goes into the scene list after `LevelUp` and before `GameOver`, so it draws above the HUD. `GameScene` handles Esc:

```
openPause():  if (player.dead || xp.levelUpOpen || this.pauseOpen) return
              this.pauseOpen = true; scene.pause(); scene.launch('Pause')
```

`Pause` → Resume: `game.pauseOpen = false; scene.resume('Game'); scene.stop()`.
`Pause` → Quit: `scene.stop('UI'); scene.stop('Game'); scene.start('Title')`. Starting Title from Pause also stops Pause.

`pauseOpen` is a flag for the same reason as `levelUpOpen`: a doubled keydown in the same frame must not launch twice. `Xp.openLevelUp()` can't fire while Game is paused (kills and gems stop), so LevelUp and Pause never overlap.

*Alternative:* a Container overlay inside Game or UI, with timers gated manually. Rejected because every system already counts time on the Game scene's `update`/`delta` and tween clock, so a real `scene.pause()` gets "everything freezes" for free, exactly as it does for LevelUp.

**Esc inside Pause** is ignored until `FLOW.pause.inputDelayMs` (≈200 ms) has passed. That covers the doubled keydown and a held key. Pause exposes `ready` and `closed` for tests, the same pattern LevelUp uses.

**Focus loss:** when `FLOW.pauseOnBlur` is on, `GameScene.create()` adds `this.game.events.on(Phaser.Core.Events.BLUR, onBlur)`, and removes it on `SHUTDOWN`. This is the one listener on a global emitter, so it is the main thing the leak test watches. `onBlur` calls `openPause()`, which already ignores a dead player, an open LevelUp, or an open Pause. Phaser already stops the loop on a hidden tab. Blur also covers alt-tab and clicking into another window.

### 2. `Button` widget (`src/ui/Button.js`)

A `Phaser.GameObjects.Container` holding the `ui_button` sprite and a centered label. Frames: 0 normal, 1 hover, 2 pressed.

- `pointerover` → hover frame (pressed frame if the press started on this button). `pointerout` → normal frame.
- `pointerdown` → pressed frame, `armed = true`. `pointerup` over the button while armed → calls `onClick`. Release anywhere else (`pointerupoutside`, or the scene-level `pointerup`) disarms it.
- `buttonState` (`'normal' | 'hover' | 'pressed'`) is exposed for e2e tests. (`state` would clash with `GameObject.state`.)
- While `ui_button` is a placeholder, all three frames look alike (gray plus frame ticks). Each state then gets a tint from `FLOW.buttonTints` (normal slate, hover lighter, pressed darker), so the states can still be seen.

"At most once per screen visit" is the screen's job, not the button's: each screen has one `left` flag that every exit (buttons and keys) checks. This matches LevelUp's `chosen`.

### 3. Title

The background is the `ui_title_bg` image, or a `DISPLAY.backgroundColor` fill when it's a placeholder. Then the logo (`ui_logo` image at `FLOW.title.logoY`, or the "GUN HANDS" text when it's a placeholder), the Start button, and the hint `WASD move · Mouse aim · Esc pause`. Enter and Space call the same `start()`, which is guarded by `started`. The old `input.once('pointerdown')` anywhere on screen is removed.

### 4. GameOver

The `ui_gameover_panel` is centered, tinted dark slate while it's a placeholder. Inside it: "GAME OVER", the stats block (unchanged `formatTime` `m:ss`, kills, level, or "—" values when opened without stats from a dev path), and the Restart and Title buttons side by side along the bottom of the panel (2 × 160 + gap fits in 400). `ready` turns true after `FLOW.gameOver.inputDelayMs` (≈600 ms, longer than Pause because the player may be holding keys or mashing the mouse at the moment of death). Enter → Restart (`scene.start('Game')`), Esc → Title. Game's `create()` launches UI as usual.

### 5. Clean session: rely on rebuild, verify with counts

There is no reset code. `scene.start('Game')` re-runs `create()`, and everything per-run lives on objects built there. Phaser clears the scene's time events, tweens, physics world, colliders and keyboard plugin listeners on shutdown, and our own modules clean up their `scene.events`/`scene.input` listeners. The only module-level state is `Enemy`'s `nextSpawnId` counter. It's an identity counter, not game state, so it is deliberately left running.

The e2e leak test records, at the start of sessions 1 and 3:
- `game.events.listenerCount(BLUR)` plus the total listener count over every Game `scene.events` event name
- the Game `input` and `input.keyboard` listener counts
- `physics.world.colliders.length`
- live counts of enemies, bullets, gems and pickups, and the run stats

It asserts that they are equal, and that the stats equal the base config values.

### 6. Config (`src/config/flow.js`, `FLOW`)

```
FLOW = {
  pauseOnBlur: true,
  pause:    { inputDelayMs: 200, dimAlpha: 0.6, titleY, resumeY, quitY },
  gameOver: { inputDelayMs: 600, panelY, statsY, buttonsY, buttonGap: 24 },
  title:    { logoY, startY, hintY },
  buttonTints: { normal: 0x334155, hover: 0x475569, pressed: 0x1e293b },
  panelPlaceholderTint: 0x1f2937,
}
```

`tests/flowConfig.test.js` checks: delays are positive, the GameOver delay is ≥ the Pause delay, layout Ys are on screen and in top-to-bottom order, the GameOver buttons fit inside the panel width, and `ui_button` / `ui_logo` / `ui_title_bg` / `ui_gameover_panel` exist in the manifest.

### 7. Tests and recording

- `e2e/flow.spec.js` covers every `game-flow` scenario. It drives buttons with real mouse moves and clicks at their world positions (the canvas is FIT-scaled, so it converts through the canvas bounding box, like the LevelUp card clicks). For blur it calls `game.events.emit('blur')`. The leak test was checked by mutation: dropping the blur listener's SHUTDOWN cleanup makes it fail (game listeners 21 → 22).
- The existing specs that do "GameOver → Enter → Title → Enter" (`combat`, `hud`, `levelup`, `powerups`, `shooting`) switch to waiting for `GameOver.ready` and then pressing Enter (Restart). The flow they check (a fresh session after death) stays the same.
- `scripts/record.js`: title → Start click → play → Esc pause for ~2 s → resume → death → GameOver → Restart → a few seconds of the new run.

## Risks / Trade-offs

- [Phaser doubled keydown toggles Pause open and shut in one press] → the `pauseOpen` flag in Game, plus Pause's input delay before it accepts Esc.
- [Blur fires during e2e runs (another worker's window, the video recorder) and pauses other tests unexpectedly] → `e2e/support.js` `ignoreWindowBlur(page)` adds an init script that registers a capture `blur` listener on `window` before the game loads and calls `stopImmediatePropagation()`, so Phaser's `window.onblur` never fires. It covers every session in the page, Restart included. Every spec calls it, `flow` included. The flow spec drives its focus-loss test through Phaser's own `game.events.emit('blur')`, which this doesn't block.
- [Esc in the browser exits fullscreen / is grabbed by the browser] → the game isn't fullscreen. Esc reaches the page normally in Chrome and Firefox.
- [GameOver input delay feels sluggish] → 600 ms is tunable in `FLOW`, and the buttons show from the start, so only acting on them waits.
- [A leak in a system not covered by the counts] → the leak test also checks every visible run stat and the pooled object counts, and it runs three sessions, not two.
