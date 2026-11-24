w# Proposal

## Why

Vikunja: GH-11. The demo loop is meant to be title → play → level-ups → death → game-over stats → restart, but the ends of that loop are still stubs. The title screen is plain text that starts on any click. There's no way to pause, so stepping away from the keyboard means dying. GameOver (a GH-6 stub) only offers "return to title", so playing again takes two screens. Every in-run system now exists (combat, XP, upgrades, powerups, HUD), so this is the right time to finish the flow and prove that a new run starts clean.

## What Changes

- **Title screen**: the `ui_title_bg` background, the `ui_logo` logo, a **Start** button built from the `ui_button` sheet (normal / hover / pressed frames), and a one-line controls hint. Enter or Space also starts. Clicking elsewhere no longer starts the game. While the logo and background are placeholders, the logo shows as the "GUN HANDS" text and the background as a plain dark fill, so the screen looks intentional before david's GH-22 art arrives.
- **Pause**: Esc during play pauses the Game scene and opens a pause overlay above the HUD with **PAUSED**, **Resume** and **Quit to Title**. Esc again (or Resume) resumes. While paused, survival time, spawning, firing, enemies, combat, gem and powerup timers all stand still, just as they do during LevelUp. Esc does nothing while LevelUp is open or after the player has died. Losing window focus during play also opens the pause menu.
- **Quit to Title** ends the session: Game, HUD and pause overlay all stop, and the title screen shows.
- **GameOver screen**: the `ui_gameover_panel` panel with **GAME OVER**, the run's time survived (`m:ss`), kills, and level reached, plus a **Restart** button and a **Title** button. Enter restarts, Esc goes to the title. Input is ignored for a short delay after the screen appears, so a key or click held from the death moment can't skip it.
- **Restart** starts a new Game session straight from GameOver. Each new session starts clean: full base HP and stats, level 1, 0 XP, 0 kills, `00:00`, no upgrade ranks, no active powerups, and no enemies, bullets, gems or pickups left over. Repeated sessions don't pile up listeners or colliders.
- A shared button widget (sheet frames, label, hover/pressed states, click on release) used by all three screens.
- Layout, input-delay and overlay numbers live in a new `FLOW` config.
- **BREAKING (tests and dev habits only)**: Enter on GameOver now restarts instead of returning to the title. The existing e2e tests that go GameOver → Title → Enter are updated.

## Non-goals

- Real title, logo, button and panel art (GH-21, GH-22, wired in by GH-12). This uses the manifest keys and their placeholders.
- Settings or options screens, volume, key rebinding, a "how to play" page, a high-score table, or saving anything between page loads.
- Sound and music (no audio ticket exists yet).
- Scene transitions such as fades and wipes, or animated menus beyond button hover/press states.
- Gamepad or touch controls, and keyboard focus navigation (arrow keys) between menu buttons.
- Changing the GameOver delay after death or the run stats themselves (GH-6), or the HUD (GH-10).

## Capabilities

### New Capabilities

- `game-flow`: the title screen and Start, the pause menu (Esc, Resume, Quit to Title, pause on focus loss), the GameOver screen with run stats, Restart and Title, the clean-session guarantee on every new run, the shared button behavior, and their configuration.

### Modified Capabilities

- `project-setup`: the "Scene flow skeleton" requirement says LevelUp and GameOver only need to be "reachable for development" and that any click starts the game. It is reworded so the title starts a session through Start or Enter/Space, and it points to `game-flow` for the real screens.

## Impact

- New: `src/config/flow.js` (`FLOW`), `src/ui/Button.js`, `src/scenes/PauseScene.js`, `tests/flowConfig.test.js`, `e2e/flow.spec.js`.
- Changed: `src/scenes/TitleScene.js`, `src/scenes/GameOverScene.js`, `src/scenes/GameScene.js` (Esc and blur open Pause), `src/main.js` (registers Pause above LevelUp), `src/config/index.js`, `scripts/record.js`, and the e2e specs that leave GameOver with Enter (`combat`, `hud`, `levelup`, `powerups`, `shooting`).
- No new dependencies, and no manifest or ASSETS.md changes: `ui_button`, `ui_logo`, `ui_title_bg` and `ui_gameover_panel` already exist.
