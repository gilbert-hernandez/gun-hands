import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MANIFEST, validate, keyFor, asset } from '../src/assets/manifest.js';

const assetsMd = readFileSync(fileURLToPath(new URL('../ASSETS.md', import.meta.url)), 'utf8');

/** Rows of the ASSETS.md tables: | Ticket | `file` | WxH | frames | notes | */
function parseAssetsTable(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(GH-\d+)\s*\|\s*`([^`]+)`\s*\|\s*(\d+)×(\d+)\s*\|\s*(\d+)\s*\|/);
    if (m) rows.push({ ticket: m[1], file: m[2], frameWidth: +m[3], frameHeight: +m[4], frames: +m[5] });
  }
  return rows;
}

const signature = (e) => `${e.ticket} ${e.file} ${e.frameWidth}x${e.frameHeight} x${e.frames}`;

describe('asset manifest', () => {
  it('is valid', () => {
    expect(validate()).toEqual([]);
  });

  it('has unique keys', () => {
    const keys = MANIFEST.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses gh_*.png file names and derives keys from them', () => {
    for (const e of MANIFEST) {
      expect(e.file).toMatch(/^gh_[a-z0-9_]+\.png$/);
      expect(e.key).toBe(keyFor(e.file));
    }
  });

  it('has positive sizes and at least one frame', () => {
    for (const e of MANIFEST) {
      expect(e.frameWidth).toBeGreaterThan(0);
      expect(e.frameHeight).toBeGreaterThan(0);
      expect(e.frames).toBeGreaterThanOrEqual(1);
    }
  });

  it('declares the brute walk as a 64x64 sprite sheet', () => {
    expect(asset('enemy_brute_walk')).toMatchObject({ type: 'spritesheet', frameWidth: 64, frameHeight: 64 });
  });

  it('throws on unknown keys', () => {
    expect(() => asset('nope')).toThrow(/Unknown asset key/);
  });
});

describe('validate() catches mistakes', () => {
  it('fails on a duplicated key and names it', () => {
    const dup = [...MANIFEST, { ...MANIFEST[0], file: 'gh_player_body_extra.png' }];
    const errors = validate(dup);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join('\n')).toContain(`duplicate key "${MANIFEST[0].key}"`);
  });

  it('fails on bad names, sizes, and frame counts', () => {
    const bad = [
      { key: 'a', file: 'Player.png', type: 'image', frameWidth: 10, frameHeight: 10, frames: 1, category: 'ui' },
      { key: 'b', file: 'gh_ui_b.png', type: 'spritesheet', frameWidth: 0, frameHeight: 10, frames: 0, category: 'ui' },
    ];
    const errors = validate(bad).join('\n');
    expect(errors).toMatch(/Player\.png/);
    expect(errors).toMatch(/frame size/);
    expect(errors).toMatch(/frames must be/);
  });
});

describe('ASSETS.md', () => {
  const rows = parseAssetsTable(assetsMd);

  it('has an asset table', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('matches the manifest exactly (files, sizes, frame counts, tickets)', () => {
    expect(rows.map(signature).sort()).toEqual(MANIFEST.map(signature).sort());
  });
});
