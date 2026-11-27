# Proposal: add-release-workflow

## Why

Vikunja: GH-30. Getting a release onto production is manual today: someone builds `dist/`, tars it, computes the sha256 and uploads the archive to the GitHub release, and only then can Arcade's `config/games.php` point at it. v0.2.0 and v0.2.1 were both packaged by hand. Every release should come with the installable archive and its checksum automatically, so production only needs the download URL and hash.

## What Changes

- New GitHub Actions workflow that runs when a version tag (`v<major>.<minor>.<patch>`) is pushed:
  - refuses to release if the tag doesn't match `package.json`'s version or `CHANGELOG.md` has no section for it;
  - runs the fast checks (format, lint, typecheck, unit tests) and a production build;
  - packages the build as `gun-hands-<version>.tar.gz`, with the same layout as the hand-made archives (the contents of `dist/` at the archive root), plus a `gun-hands-<version>.tar.gz.sha256` checksum file;
  - creates the GitHub release if it doesn't exist (a pre-release while the version is 0.x, notes from the CHANGELOG section), or uses the existing one;
  - attaches the archive and checksum, and adds an "Install on Arcade" block to the notes with the exact `version`, `download_url` and `sha256` values for `config/games.php`;
  - never replaces an archive that is already attached with different contents, so a hash production already pins can't break.
- The same workflow can be started by hand (dry run) to build and package without touching any release; the archive is kept as a workflow artifact.
- New `npm run package` script that builds and packages locally with the same code the workflow uses.
- README "Version" section rewritten as the release steps; `release/` (local package output) is git- and prettier-ignored.

## Non-goals

- Updating Arcade's `config/games.php` or installing on production automatically. That needs a token with write access to the Arcade repo and a production-side trigger; it can be a follow-up ticket.
- Re-running the browser (e2e) tests in the release workflow. CI already runs them on every push, including the tagged commit, and the release steps say to wait for green CI before tagging.
- Rebuilding or re-uploading archives for v0.2.0 and v0.2.1. Both already have hand-made archives that production uses.
- Changing the versioning scheme or the CHANGELOG format.

## Capabilities

### New Capabilities

- `release`: how a version tag turns into a GitHub release with an installable, checksummed game archive, and the local packaging command.

### Modified Capabilities

(none)

## Impact

- New: `.github/workflows/release.yml`, `scripts/package.js` (build output → archive + checksum), `scripts/release.js` (pure helpers: tag/version check, CHANGELOG section, notes block), `tests/release.test.js`.
- Changed: `package.json` (`package` script), `README.md`, `.gitignore`, `.prettierignore`, `jsconfig.json` (type-check `scripts/`), `CHANGELOG.md` (Unreleased entry).
- GitHub: the workflow needs `contents: write` to create releases and upload assets, using the built-in `GITHUB_TOKEN` (no new secrets).
