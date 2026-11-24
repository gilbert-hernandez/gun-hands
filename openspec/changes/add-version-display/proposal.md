# Proposal

## Why

Vikunja: GH-24. Gun Hands is getting its first tagged version, v0.2.0 (milestones M1 Core and M2 Progression done, art still placeholder). From here on, builds will be passed around and deployed (GH-14, the 12/6 demo), and right now nobody looking at the game can tell which build they're running. A small version label on the title screen answers "which version is this?" for testers, david, and demo viewers, and makes bug reports traceable to a tag.

## What Changes

- The title screen shows the game's version, e.g. `v0.2.0`, in small muted text in the bottom-left corner.
- The version comes from `package.json` at build time, so the tag, the package and the screen can't disagree. Bumping the version means editing `package.json` only.
- Development builds (`npm run dev`) add the short git commit, e.g. `v0.2.0-dev (38aa0ce)`, so a dev build is never mistaken for a release. If git isn't available (e.g. a source zip), the label is just `v0.2.0-dev`.
- Production builds (`npm run build`, what gets deployed) show the plain version only.
- Position, size and color of the label live in the `FLOW` config with the other title-screen layout numbers.

## Non-goals

- Bumping `package.json` to 0.2.0, writing the CHANGELOG, tagging, or making the GitHub release. That's release work done right after this change, outside OpenSpec.
- Showing the version anywhere other than the title screen (HUD, pause, GameOver), or in the browser tab title.
- Build dates, CI build numbers, or an in-game "about"/credits screen.
- Automating version bumps (semantic-release, conventional commits, etc.).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `game-flow`: adds a requirement that the title screen shows the build version (plain in production, version plus `-dev` and commit in development).

## Impact

- New: `src/util/version.js` (pure label formatter), `tests/version.test.js`.
- Changed: `vite.config.js` (injects version and commit as build-time constants), `src/types/globals.d.ts` and `eslint.config.js` (declare those constants), `src/config/flow.js` (`FLOW.title.version` layout), `src/scenes/TitleScene.js` (draws the label), `e2e/flow.spec.js` (label visible and matches `package.json`), `README.md` (one line on where the version comes from).
- No new dependencies. Git is read once when Vite starts, and a missing git is tolerated.
