# Gun Hands

A top-down arena-survivor shooter demo: run around an arena, your hands are guns, survive the horde. Built with **Phaser 4** and **Vite**, in plain JavaScript (ES modules). Code by Gilbert; art by david.

## Requirements

- Node.js 20 or newer (developed on 24) and npm
- A modern browser with WebGL

## Controls

|       | Keyboard and mouse     | Touch (Android, landscape)         |
| ----- | ---------------------- | ---------------------------------- |
| Move  | WASD                   | Left thumb, anywhere on the left   |
| Aim   | Mouse                  | Right thumb, anywhere on the right |
| Fire  | Automatic              | Automatic                          |
| Pause | Esc                    | Pause button, top right            |
| Cards | Click, or press 1 to 3 | Tap                                |

The game switches between the two as you use them. To try it on a phone, run `npm run dev -- --host` (under WSL2 the port also has to be forwarded from Windows).

## Scripts

```bash
npm install        # once
npm run dev        # dev server with hot reload; open the printed URL
npm test           # unit tests (Vitest): asset manifest, ASSETS.md sync, placeholders
npm run build      # static production build into dist/
npm run preview    # serve dist/ locally to check the build
```

`dist/` runs from any static web server with no backend (`base: './'`, so it works from any path).

### Code checks

```bash
npm run check          # everything below except coverage, in order; stops at the first failure. Run before committing.
npm run format         # rewrite files in the project style (Prettier)
npm run format:check   # verify formatting without changing files
npm run lint           # ESLint: undefined/unused variables and other likely bugs
npm run typecheck      # type-check JS using its JSDoc (tsc with jsconfig.json; no TypeScript conversion)
npm run coverage       # unit tests with a coverage table; HTML report in coverage/index.html
```

- Prettier owns formatting and ESLint only looks for bugs, so they never disagree. Name a deliberately unused parameter with a leading `_` (`update(_time, delta)`).
- Type-checking covers `src/` and `tests/`. `window.__GAME__` is declared in `src/types/globals.d.ts`.
- The commit that first applied Prettier is listed in `.git-blame-ignore-revs`. Run `git config blame.ignoreRevsFile .git-blame-ignore-revs` once so `git blame` skips it.

### Continuous integration

`.github/workflows/ci.yml` runs `npm ci`, `npm run check` and `npm run e2e` on every push and pull request. When a step fails, the Playwright report and videos are uploaded as the `playwright-results` artifact on the run. It starts running once the repo is pushed to GitHub.

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
- bottom left: survival time and live enemies / cap, for tuning the waves in `src/config/enemies.js`

Production builds turn these off.

### Version

The version lives in `package.json` (`version`) and nowhere else. Vite injects it at build time, and the title screen shows it bottom-left: `v0.2.0` in production builds, `v0.2.0-dev (<commit>)` in `npm run dev`. To release, bump `package.json`, update `CHANGELOG.md`, and tag `v<version>`.

## Project layout

```
index.html                 page shell
vite.config.js             Vite + Vitest config
src/main.js                Phaser.Game config (960×540, FIT, pixelArt, Arcade Physics)
src/config/                tunables (display, player, weapon, world, enemies), re-exported by index.js
src/assets/manifest.js     every graphic: key, file, type, frame size, frames, category, plus validate()
src/assets/placeholders.js generated stand-ins for missing art
src/assets/available.js    which PNGs exist in src/assets/img/ (import.meta.glob)
src/assets/img/            david's PNGs go here
src/player/                the player sprite and pure movement math
src/weapon/                bullet pool and pure aim/fire math
src/world/                 the Tiled arena (walls, spawn, collision helper)
src/enemy/                 enemy pool, wave director, chase steering; spawn/steering/waves.js are pure math
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

## License

The code is under the [MIT License](LICENSE). The artwork in `src/assets/img/` and `art/` is not: it is copyright its artist, david, all rights reserved. See [ART-LICENSE.md](ART-LICENSE.md) for details.
