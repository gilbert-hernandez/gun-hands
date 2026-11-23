# Gun Hands

A top-down arena-survivor shooter demo: run around an arena, your hands are guns, survive the horde. Built with **Phaser 4** and **Vite**, in plain JavaScript (ES modules). Code by Gilbert; art by david.

## Requirements

- Node.js 20 or newer (developed on 24) and npm
- A modern browser with WebGL

## Scripts

```bash
npm install        # once
npm run dev        # dev server with hot reload; open the printed URL
npm test           # unit tests (Vitest): asset manifest, ASSETS.md sync, placeholders
npm run build      # static production build into dist/
npm run preview    # serve dist/ locally to check the build
```

`dist/` runs from any static web server with no backend (`base: './'`, so it works from any path).

### Browser tests and videos (Playwright)

```bash
npx playwright install chromium               # once: download the browser
sudo apt-get install -y libnss3 libnspr4      # once, on WSL/Ubuntu if Chromium won't launch
npm run e2e                                   # browser tests in e2e/ (starts the dev server itself)
npm run record -- [out.webm] [seconds]        # record gameplay; needs `npm run dev` running
```

- Every e2e test records a video: `test-results/<test>/video.webm`. Failures also keep a trace (`npx playwright show-trace <path>`), and `npx playwright show-report` opens the HTML report.
- `npm run record` writes `videos/<timestamp>.webm` plus an `.mp4` when ffmpeg is installed. Its scripted input is in `scripts/record.js`.
- Tests read scene state through `window.__GAME__`, which only exists in dev builds.

### Dev shortcuts

In `npm run dev`, debug mode is on (`DEBUG.enabled` in `src/config/display.js`). Each scene shows its name in the corner, and in the Game scene:

- `L` opens the LevelUp screen (Enter or click to resume)
- `G` jumps to GameOver (Enter or click to go back to Title)

Production builds turn these off.

## Project layout

```
index.html                 page shell
vite.config.js             Vite + Vitest config
src/main.js                Phaser.Game config (960×540, FIT, pixelArt, Arcade Physics)
src/config/                tunables (display.js now; player/enemies/drops later), re-exported by index.js
src/assets/manifest.js     every graphic: key, file, type, frame size, frames, category, plus validate()
src/assets/placeholders.js generated stand-ins for missing art
src/assets/available.js    which PNGs exist in src/assets/img/ (import.meta.glob)
src/assets/img/            david's PNGs go here
src/scenes/                Boot → Preload → Title → Game (+ UI overlay), LevelUp, GameOver
tests/                     Vitest unit tests
ASSETS.md                  the art spec david's tickets point to
openspec/                  OpenSpec specs and changes
art/                       optional source/draft art (not loaded by the game)
```

Scene flow: **Boot** → **Preload** (progress bar; loads art, generates placeholders) → **Title** → click or Enter → **Game** with **UI** running on top. **LevelUp** pauses Game and resumes it. **GameOver** returns to Title.

## Adding art

1. Name and size the PNG exactly as listed in [ASSETS.md](ASSETS.md) and copy it into `src/assets/img/`.
2. Reload the browser. If a new file isn't picked up, restart `npm run dev`.
3. The real image replaces the placeholder under the same key. The dev console prints one `[assets] … placeholder(s) in use` warning listing the keys that are still missing art.

Game code only ever refers to assets by manifest key (for example, `this.add.sprite(x, y, 'enemy_brute_walk')`). To add a new asset, add it to `src/assets/manifest.js` **and** to the table in `ASSETS.md`. `npm test` fails if the two disagree.

## Workflow: OpenSpec ↔ Vikunja

Work is tracked in the Vikunja project **Gun Hands** (identifier `GH`) at tasks.hernandez.solutions. Each Dev ticket maps to exactly one OpenSpec change (named in the ticket), and the change's `proposal.md` links back to the ticket.

1. **Propose:** `/opsx:propose` creates `openspec/changes/<change>/` (proposal, design, specs, tasks). Move the ticket to **Review**.
2. **Approve:** Gilbert reviews the proposal.
3. **Apply:** `/opsx:apply <change>` implements the tasks (ticket goes to **In Progress**). Run `openspec validate <change> --strict`.
4. **Archive:** `/opsx:archive <change>` merges the spec deltas into `openspec/specs/`. Validate again, then move the ticket to **Done**.

Art tickets (GH-15 to GH-22) don't use OpenSpec. david attaches the files to the ticket and moves it to Review.
