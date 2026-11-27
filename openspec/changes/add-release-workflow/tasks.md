## 1. Release helpers

- [ ] 1.1 `scripts/release.js`: `versionFromTag`, `checkTag`, `changelogSection`, `arcadeBlock`, `withArcadeBlock` and `uploadDecision` as pure exports, plus the `check` / `notes` / `arcade-notes` CLI used by the workflow. Add `scripts/**/*.js` to `jsconfig.json` and keep typecheck clean.
- [ ] 1.2 `tests/release.test.js`: tag parsing (good tags, `vX.Y`, `demo-test`), version mismatch message names both versions, CHANGELOG section extraction (middle section, last section, missing section, `[Unreleased]` not matched), block append and replace without duplicates, and the three upload decisions.

## 2. Local packaging

- [ ] 2.1 `scripts/package.js`: production build, repeatable `tar` of `dist/` contents into `release/gun-hands-<version>.tar.gz`, `.sha256` file in `sha256sum` format, print path and hash. Add `"package": "node scripts/package.js"` to `package.json`; add `release/` to `.gitignore` and `.prettierignore`.
- [ ] 2.2 Check locally: `npm run package` twice gives the same hash; `tar -tzf` shows `./index.html` and `./assets/…` at the root; `sha256sum -c` passes from `release/`.

## 3. Workflow

- [ ] 3.1 `.github/workflows/release.yml`: `push` on `v[0-9]+.[0-9]+.[0-9]+` tags and `workflow_dispatch`; `contents: write`; per-ref concurrency; checkout, setup-node 24 with npm cache, `npm ci`, tag/CHANGELOG check (push only), `npm run check`, `npm run package`, upload `release/*` as a workflow artifact.
- [ ] 3.2 Publish steps (push only), following design decision 4: read the existing release and asset digest (download-and-hash fallback), fail on conflict, create the release if missing, upload archive (unless skip) and checksum, rewrite notes with the Install on Arcade block.

## 4. Docs

- [ ] 4.1 README "Version" section → "Releasing": bump `package.json`, add the CHANGELOG section, merge, wait for green CI, tag and push; the workflow does the rest; copy the Install on Arcade values into Arcade; how to replace a broken archive by hand; `npm run package` for local archives.
- [ ] 4.2 `CHANGELOG.md` Unreleased: release workflow entry (GH-30).

## 5. Verification

- [ ] 5.1 `npm run check` and `npm run build` pass; prettier accepts the workflow YAML.
- [ ] 5.2 After merging to `master`: start a dry run (`gh workflow run release.yml --ref master`), confirm it passes, download the artifact, `sha256sum -c` it, and confirm no release changed.
- [ ] 5.3 Manual check in the browser: extract the dry-run archive into a sub-folder of a static server (e.g. `python3 -m http.server` from a parent folder, open `/<sub-folder>/index.html`), confirm the title screen shows the `package.json` version (production label, no `-dev`), and that graphics and sounds load and a run plays.
- [ ] 5.4 First real run on the next version tag: the release has the archive, checksum and Install on Arcade block, and its values install on Arcade production. (Can be closed after GH-30 is archived if no release is due; note it on the ticket.)
