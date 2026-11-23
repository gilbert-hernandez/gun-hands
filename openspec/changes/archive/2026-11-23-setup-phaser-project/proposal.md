# Proposal

## Why

Vikunja: **GH-1**. `~/GunHands` only has git and OpenSpec so far, and there's no runnable game yet. Every other Dev ticket (GH-2 through GH-14) builds on a shared skeleton: a dev server, the scene structure, a config home for tunables, and an asset pipeline that lets development keep going before david's art exists. This change sets that up once so every later change stays small.

## What Changes

- Add a Vite + Phaser 4 (exact pinned version) project with `npm run dev`, `npm run build`, `npm run preview`, and `npm test` (Vitest).
- Create the game config: 960×540 base resolution, FIT scaling centered in the window, `pixelArt: true`, Arcade Physics.
- Add the scene skeleton: Boot → Preload → Title → Game (with the UI scene running alongside), plus stub LevelUp and GameOver scenes. Each scene shows its name so the flow can be clicked through.
- Add a single **asset manifest** (`src/assets/manifest.js`) that lists every asset key, file path, type, and frame size, matching the Art tickets GH-15 through GH-22.
- Add **placeholder generation**: for any manifest entry whose file is missing, Preload generates a colored-shape texture (or sprite sheet) at the declared size and frame count, so game code can always use the real key.
- Add a `src/config/` home for tunables (starting with the display and debug settings).
- Add `ASSETS.md`: the technical art spec david's tickets link to (sizes, frame counts, file names, export settings, where files go).
- Add a README covering setup, scripts, and the OpenSpec ↔ Vikunja workflow.

## Non-goals

- No gameplay yet: movement, shooting, enemies, map, XP, and loot come in GH-2 through GH-11.
- No real art; placeholders only.
- No deployment (GH-14) and no TypeScript.

## Capabilities

### New Capabilities
- `project-setup`: running and building the game, display resolution and scaling, and the scene flow skeleton.
- `assets`: the asset manifest, loading by key, and the placeholder fallback for art that hasn't been delivered yet.

### Modified Capabilities
_None (first change)._

## Impact

- New files: `package.json`, `vite.config.js`, `index.html`, `src/**`, `src/assets/img/` (empty, with `.gitkeep`), `ASSETS.md`, `README.md`, `tests/**`.
- New dependencies: `phaser` (exact pin), `vite`, and `vitest` (dev).
- Every later Dev change depends on the manifest keys and scene names defined here.
