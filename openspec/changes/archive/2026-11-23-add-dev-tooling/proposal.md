# Proposal

## Why

Vikunja: GH-23. The game has unit tests (Vitest) and browser tests (Playwright), but nothing catches type mistakes, unused or misspelled variables, or inconsistent formatting, and nothing runs the tests automatically. GH-3 through GH-14 will add most of the game's code over the next two weeks. Setting up this safety net now is cheap, and it pays off on every later ticket. Retrofitting it after the code exists means fixing many warnings at once.

## What Changes

- Type-check the JavaScript using the JSDoc it already has (no TypeScript conversion), with an `npm run typecheck` script.
- Add a linter with an `npm run lint` script, and a formatter with `npm run format` (write) and `npm run format:check` (verify).
- Add a coverage report to the unit tests with `npm run coverage`.
- Add one `npm run check` command that runs format check, lint, typecheck and unit tests, in that order, and fails on the first problem.
- Add a CI workflow that runs `check` and then the Playwright e2e tests on every push and pull request.
- Make existing code pass all of the above. The goal is to fix real findings, not to blanket-disable rules.
- Document the new scripts in README.md.

## Non-goals

- No conversion to TypeScript or `.ts` files.
- No coverage threshold that fails the build yet. Coverage is only reported for now.
- No pre-commit hooks (husky, lint-staged). `npm run check` is run by hand and in CI.
- No property-based tests, seeded RNG, visual snapshots, Vitest browser mode or performance tests. Those are follow-ups.
- No changes to gameplay or to how the game looks or behaves.
- No deploy step in CI. Deploying is GH-14.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `project-setup`: adds requirements for code-quality checks (format, lint, typecheck, one combined check command, a coverage report) and for continuous integration. The existing "Local development and production build" requirement doesn't change.

## Impact

- **Dependencies (dev only):** `typescript`, `eslint`, `@eslint/js`, `globals`, `prettier`, `eslint-config-prettier`, `@vitest/coverage-v8`, `@types/node` (so `tests/` can be type-checked where they import `node:fs`). Nothing is added to the shipped game bundle.
- **New files:** `jsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `src/types/globals.d.ts` (declares `window.__GAME__`), `.github/workflows/ci.yml`.
- **Changed files:** `package.json` (scripts and dev dependencies), `vite.config.js` (coverage settings), `.gitignore` (`coverage/`), `README.md`, plus any small fixes in `src/`, `tests/`, `e2e/` and `scripts/` that the new checks turn up. Prettier's first run reformats files repo-wide in one commit.
- **CI:** the repo has no git remote yet, so the workflow only starts running once the repo is pushed to GitHub. Until then, `npm run check` and `npm run e2e` cover the same ground locally.
