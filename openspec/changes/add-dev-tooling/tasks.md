# Tasks

## 1. Dependencies

- [x] 1.1 Install dev dependencies `typescript`, `eslint`, `@eslint/js`, `globals`, `prettier`, `eslint-config-prettier` and `@vitest/coverage-v8` with exact versions, and verify `npm ls --depth=0` lists them under devDependencies with no errors

## 2. Formatting (Prettier)

- [x] 2.1 Add `.prettierrc.json` and `.prettierignore` (design decision 3) and the `format` / `format:check` scripts, and verify `npm run format:check` runs and lists the files it would change
- [ ] 2.2 Run `npm run format` and commit the reformat on its own, with no other changes. Verify `npm run format:check` exits 0 and `npm test` still passes

## 3. Linting (ESLint)

- [ ] 3.1 Add `eslint.config.js` (design decision 2) and the `lint` script, and verify `npm run lint` runs over `src/`, `tests/`, `e2e/`, `scripts/` and the root config files
- [ ] 3.2 Fix every lint finding without blanket rule disables, and verify `npm run lint` exits 0. Add a temporary unused variable to a file in `src/` and confirm lint reports its file and line, then remove it

## 4. Type-checking (tsc on JSDoc)

- [ ] 4.1 Add `jsconfig.json`, `src/types/globals.d.ts` (`window.__GAME__`) and the `typecheck` script (design decision 1), and verify `npm run typecheck` runs and reports findings or none
- [ ] 4.2 Fix every type finding (narrow casts or `@ts-expect-error` with a reason only for real Phaser type gaps), and verify `npm run typecheck` exits 0. Temporarily pass a string as `speed` to `velocityFrom` and confirm typecheck reports it, then revert

## 5. Coverage and combined check

- [ ] 5.1 Add the coverage config to `vite.config.js`, the `coverage` script and `coverage/` in `.gitignore`, and verify `npm run coverage` prints a per-file table for `src/`, writes `coverage/index.html`, and `git status` doesn't show `coverage/`
- [ ] 5.2 Add the `check` script (design decision 5), and verify it exits 0 on clean code and exits non-zero naming the step when a lint error is introduced on purpose (then removed)

## 6. Continuous integration

- [ ] 6.1 Set `forbidOnly` and `retries` in `playwright.config.js` based on `process.env.CI`, and verify `npm run e2e` still passes locally and `CI=1 npx playwright test --list` loads the config without errors
- [ ] 6.2 Add `.github/workflows/ci.yml` (design decision 6), and verify the YAML parses (`npx --yes yaml-lint .github/workflows/ci.yml` or equivalent) and its steps match the local commands. From a clean `rm -rf node_modules && npm ci`, run `npm run check && npm run e2e` and confirm both pass

## 7. Documentation

- [ ] 7.1 Add the new scripts (`format`, `format:check`, `lint`, `typecheck`, `coverage`, `check`) and a short CI note to README.md "Scripts", and verify every documented command runs as written

## 8. Final verification

- [ ] 8.1 Run `npm run check`, `npm run coverage`, `npm run e2e` and `npm run build`, and confirm they all succeed and the `dist/` bundle size is about the same as before (no dev tooling shipped)
- [ ] 8.2 Manual check: run `npm run dev`, open the printed URL, confirm the title screen loads with no console errors, press Enter, move with WASD, check that the camera follows and the player stops at the arena edges, and press `L` and `G` to confirm the debug screens still open. Behavior should be unchanged from before this change
