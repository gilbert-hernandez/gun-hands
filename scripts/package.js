// Build and package the game for release (GH-30): `npm run package`.
// Writes release/gun-hands-<version>.tar.gz (the contents of dist/ at the archive root, the layout
// Arcade's game:install expects) and release/gun-hands-<version>.tar.gz.sha256 (sha256sum format).
// The release workflow runs this same script, so local and released archives are made the same way.
import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const archive = `release/gun-hands-${version}.tar.gz`;

execFileSync('npx', ['vite', 'build'], { stdio: 'inherit' });
if (!existsSync('dist/index.html')) throw new Error('vite build did not produce dist/index.html');

// Repeatable archive: fixed order, owners and timestamps (the commit time), and no name or time in
// the gzip header, so the same commit built with the same tools gives the same bytes.
let mtime = process.env.SOURCE_DATE_EPOCH;
if (!mtime) {
  try {
    mtime = execFileSync('git', ['log', '-1', '--format=%ct'], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (_err) {
    mtime = '0';
  }
}

mkdirSync('release', { recursive: true });
execSync(
  `set -o pipefail; tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=@${Number(mtime) || 0} ` +
    `-cf - -C dist . | gzip -n -9 > ${archive}`,
  { stdio: 'inherit', shell: '/bin/bash' },
);

const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
writeFileSync(`${archive}.sha256`, `${sha256}  ${basename(archive)}\n`);

console.log(`\nArchive: ${archive}\nSHA-256: ${sha256}`);
