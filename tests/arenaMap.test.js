import { describe, expect, it } from 'vitest';
import arenaJson from '../src/assets/maps/gh_arena.json';
import { asset } from '../src/assets/manifest.js';
import {
  cellAt,
  gapBetween,
  findSpawn,
  getLayer,
  isWallCell,
  obstacleGroups,
  openCells,
  reachableCells,
} from '../src/world/arenaMap.js';

/**
 * Build a small map from rows of text: '#' = wall, '.' = floor, 'P' = player spawn (floor).
 * @param {string[]} rows
 * @returns {import('../src/world/arenaMap.js').TiledMap}
 */
function mapFrom(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const walls = [];
  let spawn = { x: 0, y: 0 };
  rows.forEach((line, r) =>
    [...line].forEach((ch, c) => {
      walls.push(ch === '#' ? 17 : 0);
      if (ch === 'P') spawn = { x: c * 32 + 16, y: r * 32 + 16 };
    }),
  );
  return {
    width,
    height,
    tilewidth: 32,
    tileheight: 32,
    tilesets: [],
    layers: [
      { name: 'floor', type: 'tilelayer', width, height, data: walls.map(() => 1) },
      { name: 'walls', type: 'tilelayer', width, height, data: walls },
      { name: 'spawns', type: 'objectgroup', objects: [{ name: 'player', point: true, ...spawn }] },
    ],
  };
}

const ROOM = [
  '########', //
  '#......#',
  '#.##.P.#',
  '#......#',
  '#....#.#',
  '########',
];

describe('arenaMap helpers', () => {
  it('finds layers by name and throws on a missing one', () => {
    const map = mapFrom(ROOM);
    expect(getLayer(map, 'walls').name).toBe('walls');
    expect(() => getLayer(map, 'decor')).toThrow(/decor/);
  });

  it('reads cells and returns undefined outside the layer', () => {
    const walls = getLayer(mapFrom(ROOM), 'walls');
    expect(cellAt(walls, 0, 0)).toBe(17);
    expect(cellAt(walls, 1, 1)).toBe(0);
    expect(cellAt(walls, -1, 0)).toBeUndefined();
    expect(cellAt(walls, 8, 0)).toBeUndefined();
  });

  it('treats wall tiles and out-of-map cells as walls', () => {
    const map = mapFrom(ROOM);
    expect(isWallCell(map, 2, 2)).toBe(true);
    expect(isWallCell(map, 1, 1)).toBe(false);
    expect(isWallCell(map, 99, 1)).toBe(true);
  });

  it('finds a spawn point in px and cells, and throws on a missing one', () => {
    const map = mapFrom(ROOM);
    expect(findSpawn(map, 'player')).toEqual({ x: 5 * 32 + 16, y: 2 * 32 + 16, col: 5, row: 2 });
    expect(() => findSpawn(map, 'boss')).toThrow(/boss/);
  });

  it('flood-fills every open cell of a connected room', () => {
    const map = mapFrom(ROOM);
    const reached = reachableCells(map, findSpawn(map, 'player'));
    expect(reached.size).toBe(openCells(map).length);
  });

  it('does not reach a sealed pocket', () => {
    const map = mapFrom([
      '#######', //
      '#.P.#.#',
      '#...#.#',
      '#######',
    ]);
    const reached = reachableCells(map, findSpawn(map, 'player'));
    expect(openCells(map).length).toBe(8);
    expect(reached.size).toBe(6);
  });

  it('starting on a wall reaches nothing', () => {
    expect(reachableCells(mapFrom(ROOM), { col: 0, row: 0 }).size).toBe(0);
  });

  it('counts interior obstacle groups but not the border or things touching it', () => {
    // Groups: the 2-cell bar at (2,2)-(3,2) and the single cell at (5,4) touching the border below.
    expect(obstacleGroups(mapFrom(ROOM))).toHaveLength(1);
    expect(
      obstacleGroups(
        mapFrom([
          '#######', //
          '#.....#',
          '#.#.#.#',
          '#.....#',
          '#.#...#',
          '#######',
        ]),
      ),
      // (2,2) and (4,2) are free-standing; (2,4) joins the bottom border.
    ).toHaveLength(2);
  });

  it('measures the open gap between two groups', () => {
    const a = [{ col: 2, row: 2 }];
    expect(gapBetween(a, [{ col: 4, row: 2 }])).toBe(1);
    expect(gapBetween(a, [{ col: 5, row: 6 }])).toBe(3);
    expect(gapBetween(a, [{ col: 3, row: 3 }])).toBe(0);
  });
});

describe('the arena map (gh_arena.json)', () => {
  /** @type {import('../src/world/arenaMap.js').TiledMap} */
  const map = /** @type {any} */ (arenaJson);
  const walls = getLayer(map, 'walls');
  const spawn = findSpawn(map, 'player');

  it('is 60x40 tiles of 32 px with the four layers', () => {
    expect([map.width, map.height, map.tilewidth, map.tileheight]).toEqual([60, 40, 32, 32]);
    expect(map.width * map.tilewidth).toBe(1920);
    expect(map.height * map.tileheight).toBe(1280);
    expect(getLayer(map, 'floor').type).toBe('tilelayer');
    expect(walls.type).toBe('tilelayer');
    expect(getLayer(map, 'decor').type).toBe('tilelayer');
    expect(getLayer(map, 'spawns').type).toBe('objectgroup');
    for (const name of ['floor', 'walls', 'decor']) {
      const l = getLayer(map, name);
      expect([l.width, l.height, l.data.length]).toEqual([60, 40, 2400]);
    }
  });

  it('uses one embedded tileset that matches the tiles_arena manifest entry', () => {
    const e = asset('tiles_arena');
    expect(map.tilesets).toHaveLength(1);
    const ts = map.tilesets[0];
    expect(ts.name).toBe('gh_tiles_arena');
    expect(ts.firstgid).toBe(1);
    expect(ts.image).toMatch(new RegExp(`${e.file}$`));
    expect([ts.tilewidth, ts.tileheight, ts.columns, ts.tilecount]).toEqual([
      e.frameWidth,
      e.frameHeight,
      e.columns,
      e.frames,
    ]);
    expect([ts.margin, ts.spacing]).toEqual([0, 0]);
  });

  it('only uses gids inside the tileset', () => {
    for (const name of ['floor', 'walls', 'decor']) {
      for (const gid of getLayer(map, name).data) {
        expect(gid).toBeGreaterThanOrEqual(0);
        expect(gid).toBeLessThanOrEqual(64);
      }
    }
  });

  it('covers every cell with floor', () => {
    expect(getLayer(map, 'floor').data.every((gid) => gid > 0)).toBe(true);
  });

  it('has a closed border of wall tiles', () => {
    for (let c = 0; c < map.width; c++) {
      expect(cellAt(walls, c, 0)).toBeGreaterThan(0);
      expect(cellAt(walls, c, map.height - 1)).toBeGreaterThan(0);
    }
    for (let r = 0; r < map.height; r++) {
      expect(cellAt(walls, 0, r)).toBeGreaterThan(0);
      expect(cellAt(walls, map.width - 1, r)).toBeGreaterThan(0);
    }
  });

  it('has at least 8 interior obstacle groups with gaps of at least 2 tiles', () => {
    const groups = obstacleGroups(map);
    expect(groups.length).toBeGreaterThanOrEqual(8);
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) expect(gapBetween(groups[i], groups[j])).toBeGreaterThanOrEqual(2);
    }
  });

  it('reaches every open cell from the player spawn', () => {
    expect(reachableCells(map, spawn).size).toBe(openCells(map).length);
  });

  it('keeps the area within 4 tiles of the spawn free of walls', () => {
    for (let r = spawn.row - 4; r <= spawn.row + 4; r++) {
      for (let c = spawn.col - 4; c <= spawn.col + 4; c++) expect(isWallCell(map, c, r)).toBe(false);
    }
  });
});
