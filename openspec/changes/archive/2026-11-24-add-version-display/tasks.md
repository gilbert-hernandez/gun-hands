# Tasks

## 1. Build-time version constants

- [x] 1.1 In `vite.config.js`, read `package.json`'s version and the short git commit (try/catch → `''`) and `define` `__APP_VERSION__` / `__APP_COMMIT__` (design §1). Declare both in `src/types/globals.d.ts` and as readonly ESLint globals for `src/**` and `tests/**` (design §4). Verify `npm run check` passes.
- [x] 1.2 Add `src/util/version.js` `versionLabel(version, commit, dev)` and `tests/version.test.js`: production → `v0.2.0`; dev with commit → `v0.2.0-dev (38aa0ce)`; dev with an empty or whitespace commit → `v0.2.0-dev`; production ignores the commit; injected `__APP_VERSION__` equals `package.json` version. Verify `npm test` passes.

## 2. Title screen label

- [x] 2.1 Add `FLOW.title.version` (x, y, fontSize, color) to `src/config/flow.js` and extend `tests/flowConfig.test.js` (label on-screen, below the hint). In `TitleScene`, draw `this.versionText` bottom-left (origin 0,1, non-interactive) from `versionLabel(...)`. Add a line to `README.md` saying the version lives in `package.json` and shows on the title screen. Verify `npm run check` passes.
- [x] 2.2 In `e2e/flow.spec.js`, add tests: the title shows `versionText`, its text starts with `v<package.json version>-dev` (read in Node, no literal), it's inside the canvas and doesn't overlap the Start button or hint bounds; clicking the label leaves the Title active with no Game. Verify `npm run e2e` passes in full.

## 3. Manual verification

- [x] 3.1 Run `npm run dev`. The title shows a small grey `v0.1.0-dev (<commit>)` bottom-left, clear of `[Title]`, the logo, Start and the hint, and clicking it does nothing. Then run `npm run build && npm run preview`. The title shows exactly `v0.1.0` (it becomes `v0.2.0` once the release bump lands), with no console errors.
