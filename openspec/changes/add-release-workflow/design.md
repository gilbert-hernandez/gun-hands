# Design: add-release-workflow

## Context

- `vite build` writes a static `dist/` with relative asset paths (`base: './'`) and injects the version from `package.json` and the short commit. CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run check` and `npm run e2e` on every push, tags included.
- v0.2.0 and v0.2.1 archives were made by hand with `tar -czf gun-hands-<v>.tar.gz -C dist .` and attached with `gh release upload`. Arcade's `game:install` downloads `download_url`, checks `sha256`, and unpacks the archive root into the build folder, so the layout (`./index.html`, `./assets/…`) is a contract.
- Release notes so far are the CHANGELOG section for the version. `CHANGELOG.md` uses `## [x.y.z] - YYYY-MM-DD` headings.
- No release tooling or extra dependencies exist; the GitHub runner has Node, GNU tar, gzip and the `gh` CLI.

## Goals / Non-Goals

**Goals:**

- One packaging implementation shared by the workflow and `npm run package`.
- Safe to re-run: a re-run either does nothing harmful or fails before changing anything.
- The logic that decides things (tag check, CHANGELOG section, notes block, upload decision) is plain functions with unit tests; the workflow only wires them to `gh`.

**Non-Goals:**

- Signing archives, SBOMs, or provenance attestations.
- Supporting tags other than plain `vX.Y.Z` (no `-rc` tags for now).

## Decisions

1. **Trigger on tag push, not on "release published".** Tagging is already the release step in the README and CHANGELOG process, and a tag push works whether or not someone made the GitHub release first. `on.push.tags: ['v[0-9]+.[0-9]+.[0-9]+']` keeps other tags from triggering it. A `workflow_dispatch` trigger gives the dry run; publish steps run only when `github.event_name == 'push'`. Alternative: `release: published` — rejected because it needs the release to exist first, which is the manual step we're removing.

2. **Node scripts, no new dependencies.**
   - `scripts/release.js` exports pure helpers: `versionFromTag(tag)`, `checkTag(tag, pkgVersion)`, `changelogSection(markdown, version)`, `arcadeBlock({ version, url, sha256 })`, `withArcadeBlock(notes, block)` (replaces an existing block between marker comments, or appends one), and `uploadDecision(existingSha256, newSha256)` → `'upload' | 'skip' | 'conflict'`. A small CLI at the bottom (`node scripts/release.js check|notes|arcade-notes …`) exposes them to the workflow.
   - `scripts/package.js` runs `vite build`, then `tar` on `dist/` and writes the `.sha256` with Node's `crypto`. It prints the path and hash. `npm run package` = `node scripts/package.js`.
   - Alternative: inline bash in the workflow — rejected because it can't be unit-tested and would duplicate `npm run package`. Alternative: an npm tar package — rejected; GNU tar is on both the runner and WSL, and `tar -czf … -C dist .` is the layout production already accepts.

3. **Repeatable archives (best effort).** `tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=@<commit time>` piped through `gzip -n` so building the same commit on the same tools gives the same bytes. Then a re-run of a published release hits `skip`, not `conflict`. The spec doesn't promise byte-identical builds across machines; the conflict guard is what keeps production safe.

4. **Publish with `gh` and the built-in token.** Steps, in order, so nothing changes until the conflict check passes:
   1. `gh release view <tag>` to see if the release exists; read the existing archive's digest from the release assets (`digest: sha256:…`), downloading the asset and hashing it if the digest is missing.
   2. `uploadDecision` → on `conflict`, fail with both hashes.
   3. Create the release if missing (`--title v<version> --notes-file <section> --prerelease` when major is 0, `--verify-tag`).
   4. Upload the archive (unless `skip`) and the checksum file (`--clobber`, it always matches the attached archive).
   5. Rewrite the notes with `withArcadeBlock` and `gh release edit --notes-file`.
   Workflow permissions: `contents: write` only. `concurrency: release-${{ github.ref }}` so two runs for one tag can't race.

5. **Fast checks only.** The release job runs `npm ci`, `npm run check`, and `npm run package`. It doesn't run Playwright (≈6–8 min, already run by CI on the same commit). The README release steps say to tag only after CI is green on `master`.

6. **Notes block format.** Marked with `<!-- arcade-install:start -->` / `<!-- arcade-install:end -->` so re-runs replace rather than repeat it:

   ```
   ### Install on Arcade

   In `config/games.php`:

   'version' => '0.2.2',
   'download_url' => 'https://github.com/gilbert-hernandez/gun-hands/releases/download/v0.2.2/gun-hands-0.2.2.tar.gz',
   'sha256' => '<hash>',
   ```

   (in a `php` code block). The download URL is built from `github.repository`, so a fork or rename still produces correct links.

## Risks / Trade-offs

- [Someone tags before CI passes] → the release still runs the unit checks; the README steps say to wait for green CI. The tag commit's CI run is still visible next to the release.
- [The publish path only runs for real on a tag push, and `workflow_dispatch` only appears once the workflow is on `master`] → the decision logic is unit-tested, the dry run is checked right after merging, and the first real run is the next release; if it fails, the hand-made steps still work and nothing is replaced.
- [Asset `digest` field missing on older API responses] → fall back to downloading the asset and hashing it.
- [A legitimately broken archive needs replacing] → delete the asset by hand on GitHub, re-run the workflow, and update the hash in Arcade. Documented in the README; the workflow never does it on its own.

## Migration Plan

Merge to `master`, start a dry run with `gh workflow run release.yml`, and check its artifact. The next version tag (for example `v0.2.2`) is the first real run. Rollback: delete `release.yml`; releases go back to the manual steps.
