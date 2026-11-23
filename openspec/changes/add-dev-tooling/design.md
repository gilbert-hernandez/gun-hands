# Design

## Context

- Plain JavaScript ES modules, Phaser 4.2.1, Vite 8, Vitest 5, Playwright. Node 24 locally. The README says Node 20 or newer.
- Most functions already have JSDoc (`src/player/movement.js` is a good example), so type-checking can work on the existing code without new annotations.
- `src/main.js` sets `window.__GAME__` in dev builds, and `e2e/` and `scripts/record.js` read it. The type-checker needs that global declared.
- Code runs in three environments: browser (`src/`), Node (`scripts/`, config files) and browser tests that run in Node and pass callbacks to the page (`e2e/`).
- There's no git remote. See proposal.md (Impact).

## Goals / Non-Goals

**Goals:**
- Every check is fast enough to run before each commit (under about 15 seconds without e2e).
- Each tool does one job: Prettier formats, ESLint finds bugs, tsc checks types. They never disagree about formatting.

**Non-Goals:**
- Type-checking `e2e/` and `scripts/` in the first pass. ESLint covers them. Adding them to `tsc` later is a one-line `include` change.

## Decisions

### 1. Type-check with `tsc --noEmit` and `jsconfig.json` (`checkJs`)
`jsconfig.json` sets `checkJs: true`, `strict: false`, `noEmit`, `module/moduleResolution: "bundler"`, `target: "ES2022"`, `lib: ["ES2022", "DOM"]`, `types: ["vite/client"]` (for `import.meta.env`), and includes `src/**/*.js`, `src/types/*.d.ts` and `tests/**/*.js`. Phaser ships its own type definitions, so no `@types` package is needed.
- **Why not strict mode:** strict mode in JS mostly flags missing JSDoc on every callback parameter and Phaser `this.` property, which is noise for a 2-week demo. We start with `strict: false` plus `noImplicitReturns` and `noFallthroughCasesInSwitch`, and can tighten later.
- **Alternative considered:** converting to TypeScript gives stronger guarantees, but it touches every file and the project context says plain JS. Rejected.
- `src/types/globals.d.ts` declares `interface Window { __GAME__?: import('phaser').Game }`.

### 2. ESLint 9 flat config with `@eslint/js` recommended rules and `eslint-config-prettier`
`eslint.config.js` sets environment globals per folder with the `globals` package: browser for `src/`, Node for `scripts/` and the root config files, and both for `e2e/` (Playwright callbacks run in the page). `eslint-config-prettier` goes last and turns off every style rule, so Prettier owns formatting. Ignore `dist/`, `coverage/`, `test-results/`, `playwright-report/`, `videos/` and `art/`.
- **Alternative considered:** Biome does lint and format in one fast tool, but its rules cover less and the ESLint ecosystem is the standard you'll meet on client projects. Rejected for now.
- Unused variables are allowed when they start with `_`, so Phaser callbacks like `update(_time, delta)` stay clean.

### 3. Prettier with project settings
`.prettierrc.json`: `singleQuote: true`, `printWidth: 120`, `trailingComma: "all"`. These match the existing code, which uses single quotes and long lines, so the first reformat touches as little as possible. `.prettierignore` lists the generated folders plus `package-lock.json` and `openspec/`, so planning docs aren't rewritten.

### 4. Coverage with `@vitest/coverage-v8`
Configured in `vite.config.js` under `test.coverage`: `provider: 'v8'`, `include: ['src/**/*.js']`, `reporter: ['text', 'html']`, `reportsDirectory: 'coverage'`. Including all of `src/` makes untested files like scenes show 0% instead of being hidden. That's honest, and it shows where to pull logic out into pure modules. There's no threshold (see proposal.md, Non-goals).

### 5. `npm run check` as a chain of `&&`
`"check": "npm run format:check && npm run lint && npm run typecheck && npm test"`. Each npm step prints its script name, so the failing step is visible, and the chain stops at the first failure. No `npm-run-all` dependency is needed. The cheapest steps run first.

### 6. GitHub Actions: one job on `ubuntu-latest`, Node 24
Steps: checkout → `actions/setup-node` (Node 24, npm cache) → `npm ci` → `npm run check` → `npx playwright install --with-deps chromium` → `npm run e2e` → upload `playwright-report/` and `test-results/` with `actions/upload-artifact` when a step fails. Triggers are `push` and `pull_request`. The existing `playwright.config.js` already starts the dev server and uses SwiftShader, so it runs on CI without changes. Set `CI=true` behavior in the config: `forbidOnly: !!process.env.CI` and `retries: process.env.CI ? 1 : 0`, so a stray `test.only` fails CI and one WebGL hiccup doesn't.
- **Why one job:** `check` takes seconds. Splitting it into jobs would add `npm ci` overhead several times for no gain.

## Risks / Trade-offs

- [Prettier's first run produces a large diff across the repo] → Do it as its own commit with no other changes so `git blame` stays readable. Optionally add that commit to `.git-blame-ignore-revs`.
- [Phaser 4 types may be incomplete or wrong in places] → Fix real findings. For a true type-definition gap, use a narrow `/** @type {any} */` cast or `// @ts-expect-error` with a reason, never a file-wide `@ts-nocheck`.
- [Recording a video for every e2e test slows CI and uses artifact storage] → Artifacts are uploaded only on failure. Local video behavior stays as it is.
- [The workflow is untested until the repo has a GitHub remote] → The steps mirror local commands exactly (`npm ci`, `npm run check`, `npm run e2e`), and running them locally from a clean `npm ci` is the stand-in check.
