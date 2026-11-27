// Release helpers (GH-30). Pure functions used by the release workflow and its unit tests, plus a
// small CLI that exposes them to `.github/workflows/release.yml`:
//
//   node scripts/release.js check <tag>                     tag vs package.json + CHANGELOG section
//   node scripts/release.js notes <version> <out>           write the CHANGELOG section for <version>
//   node scripts/release.js decide <existing|-> <new>       print upload | skip | conflict (exit 1)
//   node scripts/release.js arcade-notes <in> <version> <url> <sha256> <out>
//                                                           write <in> with the Install on Arcade block
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BLOCK_START = '<!-- arcade-install:start -->';
export const BLOCK_END = '<!-- arcade-install:end -->';

/**
 * The version in a release tag, or null when the tag isn't `v<major>.<minor>.<patch>`.
 * @param {string} tag
 * @returns {string | null}
 */
export function versionFromTag(tag) {
  const m = /^v(\d+\.\d+\.\d+)$/.exec(tag ?? '');
  return m ? m[1] : null;
}

/**
 * Checks a tag against package.json's version (and, when given, the CHANGELOG).
 * @param {string} tag
 * @param {string} pkgVersion
 * @param {string} [changelog] CHANGELOG.md contents
 * @returns {{ ok: true, version: string } | { ok: false, error: string }}
 */
export function checkTag(tag, pkgVersion, changelog) {
  const version = versionFromTag(tag);
  if (!version) return { ok: false, error: `Tag "${tag}" is not a release tag (expected v<major>.<minor>.<patch>).` };
  if (version !== pkgVersion) {
    return {
      ok: false,
      error: `Tag ${tag} is version ${version}, but package.json says ${pkgVersion}. Bump package.json or fix the tag.`,
    };
  }
  if (changelog !== undefined && changelogSection(changelog, version) === null) {
    return { ok: false, error: `CHANGELOG.md has no "## [${version}]" section. Add one before tagging.` };
  }
  return { ok: true, version };
}

/**
 * The body of a CHANGELOG section (`## [x.y.z] - date`) without its heading, or null if missing.
 * Stops at the next `## ` heading or at the link reference definitions at the end of the file.
 * @param {string} markdown
 * @param {string} version
 * @returns {string | null}
 */
export function changelogSection(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  const heading = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\](\\s|$)`);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^## /.test(line) || /^\[[^\]]+\]:\s/.test(line)) break;
    body.push(line);
  }
  return body.join('\n').trim();
}

/**
 * The "Install on Arcade" notes block, between marker comments.
 * @param {{ version: string, url: string, sha256: string }} values
 * @returns {string}
 */
export function arcadeBlock({ version, url, sha256 }) {
  return [
    BLOCK_START,
    '### Install on Arcade',
    '',
    'In `config/games.php`:',
    '',
    '```php',
    `'version' => '${version}',`,
    `'download_url' => '${url}',`,
    `'sha256' => '${sha256}',`,
    '```',
    BLOCK_END,
  ].join('\n');
}

/**
 * Notes ending with the block: replaces an existing marked block, or appends one.
 * @param {string} notes
 * @param {string} block
 * @returns {string}
 */
export function withArcadeBlock(notes, block) {
  const text = (notes ?? '').replace(/\r\n/g, '\n');
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END, start);
  if (start !== -1 && end !== -1) {
    const before = text.slice(0, start).trimEnd();
    const after = text.slice(end + BLOCK_END.length).trim();
    return [before, after, block].filter(Boolean).join('\n\n') + '\n';
  }
  const trimmed = text.trimEnd();
  return (trimmed ? `${trimmed}\n\n${block}` : block) + '\n';
}

/**
 * Whether to upload the new archive, given the SHA-256 of the one already attached (if any).
 * @param {string | null | undefined} existingSha256
 * @param {string} newSha256
 * @returns {'upload' | 'skip' | 'conflict'}
 */
export function uploadDecision(existingSha256, newSha256) {
  if (!existingSha256) return 'upload';
  return existingSha256.toLowerCase() === newSha256.toLowerCase() ? 'skip' : 'conflict';
}

/** @param {string[]} args */
function cli([command, ...args]) {
  const fail = (/** @type {string} */ msg) => {
    console.error(`::error::${msg}`);
    process.exit(1);
  };
  if (command === 'check') {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const result = checkTag(args[0], pkg.version, readFileSync('CHANGELOG.md', 'utf8'));
    if ('error' in result) fail(result.error);
    else console.log(result.version);
  } else if (command === 'notes') {
    const section = changelogSection(readFileSync('CHANGELOG.md', 'utf8'), args[0]);
    if (section === null) fail(`CHANGELOG.md has no "## [${args[0]}]" section.`);
    writeFileSync(args[1], `${section}\n`);
  } else if (command === 'decide') {
    const existing = args[0] === '-' ? null : args[0];
    const decision = uploadDecision(existing, args[1]);
    console.log(decision);
    if (decision === 'conflict') {
      fail(
        `The attached archive (sha256 ${existing}) differs from this build (sha256 ${args[1]}). ` +
          'Published archives are never replaced; see "Releasing" in the README.',
      );
    }
  } else if (command === 'arcade-notes') {
    const [input, version, url, sha256, out] = args;
    writeFileSync(out, withArcadeBlock(readFileSync(input, 'utf8'), arcadeBlock({ version, url, sha256 })));
  } else {
    fail(`Unknown command "${command ?? ''}". Use check, notes, decide or arcade-notes.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) cli(process.argv.slice(2));
