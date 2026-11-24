import { describe, expect, it } from 'vitest';
import arenaJson from '../src/assets/maps/gh_arena.json';
import { ringRadius, findSpawnPoint, boxIsClear } from '../src/enemy/spawn.js';
import { findSpawn, isWallCell } from '../src/world/arenaMap.js';
import { DISPLAY, ENEMIES } from '../src/config/index.js';
import { seeded } from './rng.js';

const T = arenaJson.tilewidth;
const W = arenaJson.width * T;
const H = arenaJson.height * T;
const isSolid = (x, y) =>
  x < 0 || y < 0 || x >= W || y >= H || isWallCell(arenaJson, Math.floor(x / T), Math.floor(y / T));

const view = { width: DISPLAY.width, height: DISPLAY.height };
const radius = ringRadius(view, ENEMIES.spawn.margin, 32);

/** View center for a camera following `p`, clamped to the map like Phaser's camera bounds. */
const viewCenter = (p) => ({
  x: Math.min(Math.max(p.x, view.width / 2), W - view.width / 2),
  y: Math.min(Math.max(p.y, view.height / 2), H - view.height / 2),
});

/** True if a square sprite of `size` centered at (x, y) overlaps the view centered at c. */
const spriteInView = (x, y, size, c) =>
  Math.abs(x - c.x) < view.width / 2 + size / 2 && Math.abs(y - c.y) < view.height / 2 + size / 2;

const BRUTE_BOX = { width: 40, height: 44, offsetY: 10 };
const opts = (center, rand) => ({
  center,
  radius,
  box: BRUTE_BOX,
  isSolid,
  worldW: W,
  worldH: H,
  attempts: ENEMIES.spawn.attempts,
  rand,
});

describe('ringRadius', () => {
  it('puts a 64 px sprite anywhere on the ring fully outside the view', () => {
    const c = { x: 0, y: 0 };
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      expect(spriteInView(Math.cos(a) * radius, Math.sin(a) * radius, 64, c)).toBe(false);
    }
  });
});

describe('findSpawnPoint on the real arena', () => {
  const spawn = findSpawn(arenaJson, 'player');
  const players = {
    center: spawn,
    topLeft: { x: 2 * T, y: 2 * T },
    topRight: { x: W - 2 * T, y: 2 * T },
    bottomLeft: { x: 2 * T, y: H - 2 * T },
    bottomRight: { x: W - 2 * T, y: H - 2 * T },
  };

  for (const [name, p] of Object.entries(players)) {
    it(`never spawns in a wall, off the map, or in view (player ${name})`, () => {
      const rand = seeded(name.length * 31);
      const c = viewCenter(p);
      let found = 0;
      for (let i = 0; i < 1000; i++) {
        const pt = findSpawnPoint(opts(c, rand));
        if (!pt) continue;
        found++;
        const cy = pt.y + BRUTE_BOX.offsetY;
        expect(boxIsClear(pt.x, cy, BRUTE_BOX.width, BRUTE_BOX.height, isSolid, W, H)).toBe(true);
        // Dense check: every point of the hurtbox (1 px inset) is open floor.
        const l = pt.x - BRUTE_BOX.width / 2 + 1;
        const t = cy - BRUTE_BOX.height / 2 + 1;
        for (let x = l; x <= l + BRUTE_BOX.width - 2; x += 2) {
          for (let y = t; y <= t + BRUTE_BOX.height - 2; y += 2) expect(isSolid(x, y)).toBe(false);
        }
        expect(spriteInView(pt.x, pt.y, 64, c)).toBe(false);
      }
      // Corners lose most of the ring, but spawns must still mostly succeed.
      expect(found).toBeGreaterThan(900);
    });
  }

  it('comes from all four quadrants around the view center', () => {
    const rand = seeded(3);
    const c = viewCenter(spawn);
    const quads = new Set();
    for (let i = 0; i < 200; i++) {
      const pt = findSpawnPoint(opts(c, rand));
      if (pt) quads.add(`${pt.x > c.x ? 'E' : 'W'}${pt.y > c.y ? 'S' : 'N'}`);
    }
    expect([...quads].sort()).toEqual(['EN', 'ES', 'WN', 'WS']);
  });

  it('returns null after the allowed attempts when everything is solid', () => {
    let calls = 0;
    const rand = () => {
      calls++;
      return 0.5;
    };
    expect(findSpawnPoint({ ...opts({ x: 900, y: 600 }, rand), isSolid: () => true })).toBeNull();
    expect(calls).toBe(ENEMIES.spawn.attempts);
  });
});

describe('boxIsClear', () => {
  it('catches a wall tile that only touches the middle of a side edge', () => {
    // 32 px tile at x 0..32, y 100..132; box 40x44 centered at (50, 116) spans x 30..70, y 94..138.
    const tile = (x, y) => x >= 0 && x < 32 && y >= 100 && y < 132;
    expect(boxIsClear(50, 116, 40, 44, tile, 1000, 1000)).toBe(false);
    expect(boxIsClear(53, 116, 40, 44, tile, 1000, 1000)).toBe(true);
  });

  it('rejects boxes that stick out of the map', () => {
    expect(boxIsClear(5, 100, 20, 20, () => false, 100, 200)).toBe(false);
    expect(boxIsClear(50, 100, 20, 20, () => false, 100, 200)).toBe(true);
  });
});
