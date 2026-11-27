import { describe, expect, it } from 'vitest';
import {
  BLOCK_END,
  BLOCK_START,
  arcadeBlock,
  changelogSection,
  checkTag,
  uploadDecision,
  versionFromTag,
  withArcadeBlock,
} from '../scripts/release.js';

const CHANGELOG = `# Changelog

Intro text.

## [Unreleased]

- Next thing.

## [0.2.1] - 2026-11-26

Phone play.

### Added

- Touch.

## [0.2.0] - 2026-11-24

First tag.

[Unreleased]: https://example.com/compare/v0.2.1...HEAD
[0.2.1]: https://example.com/compare/v0.2.0...v0.2.1
`;

describe('versionFromTag', () => {
  it('reads plain version tags', () => {
    expect(versionFromTag('v0.2.2')).toBe('0.2.2');
    expect(versionFromTag('v10.0.13')).toBe('10.0.13');
  });

  it('rejects other tags', () => {
    for (const tag of ['v0.2', '0.2.2', 'demo-test', 'v0.2.2-rc1', 'v0.2.2.1', '']) {
      expect(versionFromTag(tag)).toBeNull();
    }
  });
});

describe('checkTag', () => {
  it('passes when the tag matches package.json and the CHANGELOG has the section', () => {
    expect(checkTag('v0.2.1', '0.2.1', CHANGELOG)).toEqual({ ok: true, version: '0.2.1' });
  });

  it('names both versions on a mismatch', () => {
    const result = checkTag('v0.2.3', '0.2.2');
    expect(result.ok).toBe(false);
    expect('error' in result && result.error).toMatch(/0\.2\.3.*0\.2\.2/);
  });

  it('fails when the CHANGELOG section is missing', () => {
    const result = checkTag('v0.2.2', '0.2.2', CHANGELOG);
    expect('error' in result && result.error).toMatch(/CHANGELOG\.md has no "## \[0\.2\.2\]" section/);
  });

  it('fails on a non-version tag', () => {
    expect(checkTag('demo-test', '0.2.2').ok).toBe(false);
  });
});

describe('changelogSection', () => {
  it('extracts a middle section without its heading', () => {
    expect(changelogSection(CHANGELOG, '0.2.1')).toBe('Phone play.\n\n### Added\n\n- Touch.');
  });

  it('stops the last section at the link references', () => {
    expect(changelogSection(CHANGELOG, '0.2.0')).toBe('First tag.');
  });

  it('returns null for a missing section', () => {
    expect(changelogSection(CHANGELOG, '0.3.0')).toBeNull();
  });

  it('does not match Unreleased or a version that only shares a prefix', () => {
    expect(changelogSection(CHANGELOG, 'Unreleased')).toBe('- Next thing.');
    expect(changelogSection(CHANGELOG, '0.2')).toBeNull();
    expect(changelogSection(CHANGELOG, '0x2x1')).toBeNull();
  });

  it('reads the real CHANGELOG section headings', () => {
    expect(changelogSection('## [1.0.0]\n\nBody\n', '1.0.0')).toBe('Body');
  });
});

describe('arcade notes block', () => {
  const values = {
    version: '0.2.2',
    url: 'https://github.com/o/r/releases/download/v0.2.2/gun-hands-0.2.2.tar.gz',
    sha256: 'a'.repeat(64),
  };
  const block = arcadeBlock(values);

  it('holds the exact config values between the markers', () => {
    expect(block.startsWith(BLOCK_START)).toBe(true);
    expect(block.endsWith(BLOCK_END)).toBe(true);
    expect(block).toContain("'version' => '0.2.2',");
    expect(block).toContain(`'download_url' => '${values.url}',`);
    expect(block).toContain(`'sha256' => '${'a'.repeat(64)}',`);
    expect(block).toContain('```php');
  });

  it('appends the block to notes without one', () => {
    expect(withArcadeBlock('Notes.\n\n', block)).toBe(`Notes.\n\n${block}\n`);
    expect(withArcadeBlock('', block)).toBe(`${block}\n`);
  });

  it('replaces an existing block instead of repeating it', () => {
    const once = withArcadeBlock('Notes.', arcadeBlock({ ...values, sha256: 'b'.repeat(64) }));
    const twice = withArcadeBlock(once, block);
    expect(twice).toBe(`Notes.\n\n${block}\n`);
    expect(twice.split(BLOCK_START)).toHaveLength(2);
    expect(withArcadeBlock(twice, block)).toBe(twice);
  });

  it('keeps text written after an old block, and the block stays last', () => {
    const notes = `Notes.\n\n${block}\n\nLater edit.`;
    expect(withArcadeBlock(notes, block)).toBe(`Notes.\n\nLater edit.\n\n${block}\n`);
  });
});

describe('uploadDecision', () => {
  const hash = 'c'.repeat(64);

  it('uploads when nothing is attached', () => {
    expect(uploadDecision(null, hash)).toBe('upload');
    expect(uploadDecision('', hash)).toBe('upload');
  });

  it('skips when the attached archive has the same hash', () => {
    expect(uploadDecision(hash.toUpperCase(), hash)).toBe('skip');
  });

  it('reports a conflict when the hashes differ', () => {
    expect(uploadDecision('d'.repeat(64), hash)).toBe('conflict');
  });
});
