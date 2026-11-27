#!/usr/bin/env node
// Re-dress the arena map (src/assets/maps/gh_arena.json) with david's GH-19 tileset (GH-12).
//
//   node scripts/reskin-arena.js [--tsx path/to/gh_tiles_arena.tsx]
//
// The map keeps exactly the same solid cells, floor cells, decor cells and spawn point: only the
// tile each cell shows changes. The border gets edge and corner tiles, 2x2 obstacles become
// boulders or wrecks, single wall cells become crates or barrels, and the floor gets its variants
// plus a seeded sprinkle of detail tiles. Tile names come from the tileset embedded in the map
// (or, on the first run, from david's .tsx), so running the script again changes nothing.
// It exits non-zero without writing if the solid cells or the spawn would change.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MAP_PATH = fileURLToPath(new URL('../src/assets/maps/gh_arena.json', import.meta.url));

// The pre-GH-12 placeholder layout (8x8, ids by role), used when the map's tileset has no names.
const OLD = {
  floor: { 0: 'floor_1', 1: 'floor_2', 2: 'floor_3', 3: 'floor_4' },
  wall: 16,
  block: { 32: 'tl', 33: 'tr', 40: 'bl', 41: 'br' },
  decor: { 48: 'prop_tumbleweed', 49: 'prop_skull', 50: 'prop_grass', 51: 'prop_bolts' },
};

const BORDER = {
  nw: 'wall_nw',
  n: 'wall_n',
  ne: 'wall_ne',
  w: 'wall_w',
  e: 'wall_e',
  sw: 'wall_sw',
  s: 'wall_s',
  se: 'wall_se',
};
// North-edge variety: column -> tile name.
const NORTH_SPECIALS = { 20: 'wall_n_sign', 40: 'wall_n_dish' };
const BLOCKS = ['obstacle_boulder', 'obstacle_mech_wreck'];
const BLOCK_PARTS = { tl: 1, tr: 2, bl: 3, br: 4 };
const SINGLES = ['obstacle_crate', 'obstacle_barrel'];
const FLOOR_BASE = ['floor_1', 'floor_2', 'floor_3', 'floor_4'];
const FLOOR_DETAIL = ['floor_crack', 'floor_oil', 'floor_tracks', 'floor_plate', 'floor_scorch', 'floor_drift'];
// About 3% of open floor cells get a detail tile.
const DETAIL_PER_MILLE = 30;

/** Tiny deterministic hash of a cell index (same input -> same output, every run). */
function hash(i) {
  let x = (i + 1) * 0x9e3779b1;
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  return x >>> 0;
}

/** Tile names by id from a Tiled .tsx file. */
function namesFromTsx(path) {
  const xml = readFileSync(path, 'utf8');
  const names = {};
  for (const m of xml.matchAll(/<tile id="(\d+)">.*?<property name="name" value="([^"]+)"/gs)) names[+m[1]] = m[2];
  const header = xml.match(/<tileset[^>]*tilecount="(\d+)"[^>]*columns="(\d+)"/);
  const image = xml.match(/<image[^>]*width="(\d+)"[^>]*height="(\d+)"/);
  return { names, tilecount: +header[1], columns: +header[2], width: +image[1], height: +image[2] };
}

/** Tile names by id from the map's embedded tileset (empty when it has none). */
function namesFromMap(tileset) {
  const names = {};
  for (const t of tileset.tiles ?? []) {
    const p = t.properties?.find((q) => q.name === 'name');
    if (p) names[t.id] = p.value;
  }
  return names;
}

function main() {
  const tsxArg = process.argv.indexOf('--tsx');
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  const tileset = map.tilesets[0];
  const { firstgid } = tileset;

  // `names` reads the input cells (empty = the old layout, read through OLD); `outNames` writes them.
  const names = namesFromMap(tileset);
  const fromOld = Object.keys(names).length === 0;
  let outNames = names;
  if (tsxArg > 0) {
    const tsx = namesFromTsx(process.argv[tsxArg + 1]);
    Object.assign(tileset, {
      tilecount: tsx.tilecount,
      columns: tsx.columns,
      imagewidth: tsx.width,
      imageheight: tsx.height,
    });
    tileset.tiles = Object.entries(tsx.names).map(([id, value]) => ({
      id: +id,
      properties: [{ name: 'name', type: 'string', value }],
    }));
    outNames = tsx.names;
  } else if (fromOld) {
    throw new Error('The map has no tile names yet: pass --tsx <gh_tiles_arena.tsx> on the first run');
  }
  const gidOf = Object.fromEntries(Object.entries(outNames).map(([id, n]) => [n, +id + firstgid]));
  const gid = (name) => {
    if (!gidOf[name]) throw new Error(`Tileset has no tile named "${name}"`);
    return gidOf[name];
  };
  /** Name of the tile in a cell of the input map (old layout or named), or null when empty. */
  const nameIn = (g) => (g === 0 ? null : fromOld ? g - firstgid : names[g - firstgid]);

  const { width: W, height: H } = map;
  const layer = (n) => map.layers.find((l) => l.name === n);
  const walls = layer('walls');
  const floor = layer('floor');
  const decor = layer('decor');
  const before = JSON.stringify({
    solid: walls.data.map((g) => (g > 0 ? 1 : 0)),
    spawns: layer('spawns').objects,
  });

  // Walls: border by position, interior 2x2 blocks and single cells by what they were.
  const solid = (c, r) => walls.data[r * W + c] > 0;
  const out = walls.data.map(() => 0);
  let blockCount = 0;
  let singleCount = 0;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = r * W + c;
      if (!solid(c, r)) continue;
      const top = r === 0;
      const bottom = r === H - 1;
      const left = c === 0;
      const right = c === W - 1;
      if (top || bottom || left || right) {
        const side = `${top ? 'n' : bottom ? 's' : ''}${left ? 'w' : right ? 'e' : ''}`;
        out[i] = gid(top && !left && !right && NORTH_SPECIALS[c] ? NORTH_SPECIALS[c] : BORDER[side]);
        continue;
      }
      if (out[i]) continue; // already filled as part of a block
      const n = nameIn(walls.data[i]);
      const isBlockStart = fromOld ? OLD.block[n] === 'tl' : /^obstacle_(boulder|mech_wreck)_1$/.test(n ?? '');
      if (isBlockStart) {
        const base = BLOCKS[blockCount++ % BLOCKS.length];
        for (const [part, [dc, dr]] of Object.entries({ tl: [0, 0], tr: [1, 0], bl: [0, 1], br: [1, 1] })) {
          if (!solid(c + dc, r + dr)) throw new Error(`2x2 obstacle at ${c},${r} is missing its ${part} cell`);
          out[(r + dr) * W + c + dc] = gid(`${base}_${BLOCK_PARTS[part]}`);
        }
        continue;
      }
      out[i] = gid(SINGLES[singleCount++ % SINGLES.length]);
    }
  }

  // Floor: keep each cell's variant, and sprinkle details on open cells without decor.
  const floorOut = floor.data.map((g, i) => {
    if (g === 0) return 0;
    const open = walls.data[i] === 0 && decor.data[i] === 0;
    const h = hash(i);
    if (open && h % 1000 < DETAIL_PER_MILLE) return gid(FLOOR_DETAIL[(h >>> 10) % FLOOR_DETAIL.length]);
    const n = nameIn(g);
    const base = fromOld ? OLD.floor[n] : FLOOR_BASE.includes(n) ? n : FLOOR_BASE[(h >>> 20) % FLOOR_BASE.length];
    if (!base) throw new Error(`Unexpected floor tile ${g} at cell ${i}`);
    return gid(base);
  });

  // Decor: same cells, new prop names.
  const decorOut = decor.data.map((g, i) => {
    if (g === 0) return 0;
    const n = nameIn(g);
    const prop = fromOld ? OLD.decor[n] : n;
    if (!prop?.startsWith('prop_')) throw new Error(`Unexpected decor tile ${g} at cell ${i}`);
    return gid(prop);
  });

  walls.data = out;
  floor.data = floorOut;
  decor.data = decorOut;

  const after = JSON.stringify({ solid: walls.data.map((g) => (g > 0 ? 1 : 0)), spawns: layer('spawns').objects });
  if (after !== before) {
    console.error('reskin-arena: the solid cells or the spawn point would change; map NOT written.');
    process.exit(1);
  }

  writeFileSync(MAP_PATH, toTiledJson(map, W));
  console.log(`reskin-arena: wrote ${MAP_PATH} (${blockCount} 2x2 obstacles, ${singleCount} single obstacles)`);
}

/** Tiled-style JSON: one-space indent, each tile layer's data one map row per line. */
function toTiledJson(map, width) {
  const marker = (i) => `"__DATA_${i}__"`;
  const datas = [];
  const copy = structuredClone(map);
  for (const l of copy.layers) {
    if (Array.isArray(l.data)) {
      datas.push(l.data);
      l.data = `__DATA_${datas.length - 1}__`;
    }
  }
  let text = JSON.stringify(copy, null, 1);
  datas.forEach((data, i) => {
    const rows = [];
    for (let r = 0; r < data.length / width; r++) rows.push(data.slice(r * width, (r + 1) * width).join(','));
    text = text.replace(marker(i), `[\n${rows.join(',\n')}\n]`);
  });
  return `${text}\n`;
}

main();
