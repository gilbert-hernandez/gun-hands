import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MANIFEST, validate, keyFor, asset, expectedImageSize, checkDeliveredArt } from '../src/assets/manifest.js';

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

const imgDir = fileURLToPath(new URL('../src/assets/img/', import.meta.url));

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file) {
  const b = readFileSync(imgDir + file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe('delivered art (src/assets/img)', () => {
  const files = readdirSync(imgDir).filter((f) => f.endsWith('.png'));
  const sizes = Object.fromEntries(files.map((f) => [f, pngSize(f)]));

  it('every PNG has a manifest entry and the declared pixel size', () => {
    expect(checkDeliveredArt(sizes)).toEqual([]);
  });

  it('every manifest entry is delivered', () => {
    const missing = MANIFEST.filter((e) => !files.includes(e.file)).map((e) => e.file);
    expect(missing).toEqual([]);
  });

  it('computes image sizes from the entry type', () => {
    expect(expectedImageSize(asset('enemy_brute_walk'))).toEqual({ width: 384, height: 64 });
    expect(expectedImageSize(asset('ui_card'))).toEqual({ width: 160, height: 220 });
    expect(expectedImageSize(asset('tiles_arena'))).toEqual({ width: 256, height: 192 });
  });

  it('names a wrong-size file with both sizes, and an unknown file', () => {
    const errors = checkDeliveredArt({
      'gh_enemy_brute_walk.png': { width: 320, height: 64 },
      'gh_enemy_ghost_walk.png': { width: 32, height: 32 },
    });
    expect(errors).toEqual([
      'gh_enemy_brute_walk.png is 320x64, expected 384x64',
      'gh_enemy_ghost_walk.png has no manifest entry',
    ]);
  });
});
