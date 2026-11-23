# Tasks

## 1. Scaffold

- [x] 1.1 Create `package.json` (scripts dev/build/preview/test) with exact pins `phaser@4.2.1`, `vite@8.3.8`, and `vitest`; run `npm install` and verify it succeeds and `node_modules/phaser/package.json` reports 4.2.1
- [x] 1.2 Add `index.html`, `vite.config.js` (`base: './'`), and `src/main.js` with the game config (960×540, `Scale.FIT` + `CENTER_BOTH`, `pixelArt: true`, Arcade Physics); verify `npm run dev` shows a black canvas with no console errors
  - _Verified in browser by Gilbert 2026-11-23._
- [x] 1.3 Add `src/config/display.js` + `src/config/index.js` (resolution, background color, `debug` flag) and read them in `main.js`; verify that changing the background color in config changes the canvas on reload
  - _Verified in browser by Gilbert 2026-11-23._

## 2. Asset pipeline

- [x] 2.1 Write `src/assets/manifest.js` with every asset from Art tickets GH-15 to GH-22 (key, file, type, frameWidth/Height, frames, category) plus a `validate()` function; add `tests/manifest.test.js` covering unique keys, `gh_*.png` naming, positive sizes, and a deliberately duplicated key failing; verify `npm test` passes
- [x] 2.2 Write `src/assets/placeholders.js` to generate category-colored sprite sheets and tilesets at the declared size and frame count; verify by temporarily rendering one of each category in a scene
  - _Verified in browser by Gilbert 2026-11-23._
- [x] 2.3 Write `ASSETS.md` (export conventions, `src/assets/img/` location, a per-ticket table of file, size, frames, and facing/pivot notes, and the delivery steps); extend the test to parse its file table and verify it matches the manifest exactly

## 3. Scenes

- [x] 3.1 Add Boot and Preload scenes: progress bar, load the files that exist via `import.meta.glob`, generate placeholders for the rest, and log one development warning listing placeholder keys; verify the warning lists all keys while `src/assets/img/` is empty
  - _Verified in browser by Gilbert 2026-11-23._
- [x] 3.2 Add the Title scene ("GUN HANDS" text plus "Click or press Enter"), the Game scene (shows the placeholder player and a brute to prove the keys work), and the UI scene (HUD placeholder text, launched alongside Game); verify that clicking on Title starts Game with the UI overlay
  - _Verified in browser by Gilbert 2026-11-23._
- [x] 3.3 Add stub LevelUp and GameOver scenes plus the debug keys `L` and `G` in Game (only when `debug` is true); verify that GameOver returns to Title and LevelUp resumes Game
  - _Verified in browser by Gilbert 2026-11-23._

## 4. Docs and verification

- [x] 4.1 Write `README.md` (requirements, scripts, project layout, adding art, the OpenSpec ↔ GH ticket workflow); verify the documented commands run as written
- [x] 4.2 Run `npm run build` and `npm run preview`; verify the built game behaves the same as in dev
  - _Verified in browser by Gilbert 2026-11-23. Same as dev except the debug keys (`L`/`G`) and scene labels, which are dev-only by design (`DEBUG.enabled = import.meta.env.DEV`)._
- [x] 4.3 Manual browser check with `npm run dev`: the loading bar appears → Title → click → Game shows placeholder player and brute with the HUD text → `L` opens and closes LevelUp → `G` shows GameOver → back to Title; resizing the window keeps 16:9, stays centered, and pixels stay crisp; the console has only the single placeholder warning
  - _Verified in browser by Gilbert 2026-11-23._
