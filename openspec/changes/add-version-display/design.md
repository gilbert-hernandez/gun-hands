# Design

## Context

- `package.json` has `"version": "0.1.0"` and nothing reads it. The release step after this change bumps it to 0.2.0.
- `TitleScene` (GH-11) draws the background, logo (text while placeholder), Start button and hint, using layout numbers from `FLOW.title`. In debug builds `addSceneLabel` puts `[Title]` in the top-left corner, so the bottom-left is free.
- Vite builds a static bundle (no backend). Vitest reuses `vite.config.js`. CI checks out with `actions/checkout@v7` (shallow, but `HEAD` exists, so `git rev-parse` works).
- Typecheck is `tsc` over JSDoc with `src/types/globals.d.ts` for globals. ESLint uses flat config with `globals.browser` for `src/`.

## Goals / Non-Goals

**Goals:**
- One source of truth for the version (`package.json`).
- The label text comes from a pure function, so the format rules are unit-tested without a browser.

**Non-Goals:**
- Reading the version at runtime (fetching `package.json`) or exposing it on `window`.

## Decisions

### 1. Build-time constants through Vite `define`

`vite.config.js` reads `package.json` (`JSON.parse(readFileSync(...))`) and the short commit (`execSync('git rev-parse --short HEAD')` wrapped in try/catch, `''` on failure), then defines:

- `__APP_VERSION__` → `JSON.stringify(pkg.version)`
- `__APP_COMMIT__` → `JSON.stringify(commit)`

*Alternatives:* `import pkg from '../package.json'` in game code would work in Vite, but it bundles the whole manifest (scripts, devDependencies) into the shipped JS. `import.meta.env.VITE_*` would need an env file or a wrapper script. `define` is Vite's standard way to do this and costs two string literals.

The commit is read once per Vite start. A dev server left running across commits shows a stale hash until it's restarted, which is fine for a hint.

### 2. Pure formatter `src/util/version.js`

```js
/** @returns {string} e.g. "v0.2.0", "v0.2.0-dev (38aa0ce)", "v0.2.0-dev" */
export function versionLabel(version, commit, dev) { ... }
```

`TitleScene` calls `versionLabel(__APP_VERSION__, __APP_COMMIT__, import.meta.env.DEV)`. The unit test covers all three spec cases plus an empty or whitespace commit. A separate unit test checks that the injected `__APP_VERSION__` equals `package.json`'s version, because Vitest loads the same `define`. That catches a broken config.

### 3. Placement and look via `FLOW.title.version`

```js
version: { x: 8, y: 532, fontSize: '12px', color: '#6b7280' }
```

The text is bottom-left with origin (0, 1) so it hugs the corner, at the 960×540 base resolution. The color is dimmer than the hint (`#9ca3af`) so it reads as metadata. It isn't interactive (no `setInteractive`), so clicks fall through to the scene, which already ignores off-button clicks. `tests/flowConfig.test.js` gains a check that the label is on-screen and below the hint.

The scene keeps a reference (`this.versionText`) so e2e can read its text and bounds.

### 4. Declarations

- `src/types/globals.d.ts`: `declare const __APP_VERSION__: string; declare const __APP_COMMIT__: string;`
- `eslint.config.js`: add both as `readonly` globals for `src/**` and `tests/**`.

## Risks / Trade-offs

- [Git missing or not a repo, e.g. a source zip or Docker build] → try/catch gives `''`, and the label drops the hash. Production never shows it anyway.
- [The e2e test hard-codes a version and breaks on every bump] → the test reads `package.json` in Node and compares, never using a literal.
- [The e2e suite runs against the dev server] → it asserts the label *starts with* `v<version>-dev`, so it passes with or without git.

## Migration Plan

None. This only adds a label. Rollback is reverting the commit.
