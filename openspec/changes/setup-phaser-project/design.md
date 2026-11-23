# Design

## Context

The repo is empty apart from git and OpenSpec (see proposal.md, Why). The older prototype at `~/Phaser` loaded a vendored `phaser.js` through an Express server and had no build step. We're starting fresh instead of porting it, but its approach to Tiled maps will be revisited in GH-4. Art arrives asynchronously from david, so the asset pipeline has to tolerate missing files from day one.

## Goals / Non-Goals

**Goals:**
- A skeleton that later changes extend by adding modules, not by restructuring.
- Make "missing art" a non-event at runtime.

**Non-Goals:**
- No ECS, state-management library, or TypeScript. Plain ES modules and Phaser scenes are enough for a demo.

## Decisions

**Phaser 4 (pin exactly `4.2.1`) rather than Phaser 3.90.** Phaser 4 has been stable since April 2026 and keeps v3's Scene, Arcade Physics, and Tilemap APIs that this game depends on, while its new renderer handles hundreds of sprites well. v3 has more tutorials, but it's in maintenance mode. The exact pin (no `^`) keeps builds reproducible. If a v4-specific blocker shows up during apply, falling back to `3.90.0` is a one-line change because we only use APIs common to both.

**Vite rather than Parcel, webpack, or no bundler.** It's fast, needs no configuration for ES modules, and `vite build` produces a static `dist/`. `base: './'` keeps the build portable to any subdomain path.

**Layout:**
```
index.html
src/main.js                 # Phaser.Game config
src/config/display.js       # width, height, debug flags
src/config/index.js         # re-exports; later: player.js, enemies.js, drops.js...
src/assets/manifest.js      # the asset list (pure data + validate())
src/assets/placeholders.js  # texture generation for missing entries
src/scenes/{Boot,Preload,Title,Game,UI,LevelUp,GameOver}Scene.js
src/assets/img/             # david's PNGs land here (missing files -> placeholders)
tests/manifest.test.js      # Vitest: manifest validity
ASSETS.md
```

**How missing files are detected.** Art lives in `src/assets/img/`, because Vite's `import.meta.glob` can't see into `public/`. Preload uses `import.meta.glob('./img/*.png', { eager: true, query: '?url', import: 'default' })`. That gives a map of the files that actually exist, with hashed URLs in production. Preload loads only the entries that are present and generates placeholders for the rest. *Alternative considered:* attempt to load everything and catch `loaderror`. That produces 404 noise and a slower boot, so it was rejected. **Result:** art lives in `src/assets/img/`, not `public/assets/` (ASSETS.md and the GH-12 ticket text will say so).

**Placeholder look:** a `Graphics` object filled with a per-category color (player cyan, enemy red, fx yellow, pickup green, ui gray, tiles brown) and a 1px darker outline. Each frame gets a small frame-index tick so animation is visible. It's rendered to a canvas texture and registered as a sprite sheet with the declared frame size. The tileset placeholder is a grid of tinted tiles.

**Scene wiring:** Boot sets up the scale and starts Preload. Preload shows a progress bar, loads assets and fills in placeholders, then starts Title. Title starts Game and launches UI in parallel. With `debug: true`, a dev-only key in Game (`G`) jumps to GameOver, and `L` opens LevelUp, so those stubs can be reached before GH-6/GH-8.

**Tests:** Vitest runs only on pure modules (the manifest's `validate()`: unique keys, file names that follow `gh_*.png`, positive frame sizes, frame count ≥ 1). Phaser scenes get checked manually in the browser.

## Risks / Trade-offs

- [Phaser 4 has fewer community examples] → keep to the core APIs; fallback to 3.90 as described above.
- [Glob-based detection needs a dev-server restart for new files in some setups] → Vite's glob is HMR-aware; the README says to reload, and to restart if a new file isn't picked up.
- [Manifest and ASSETS.md can drift apart] → the test also parses the file-name table in ASSETS.md and checks it against the manifest.
