// Pure helpers over a Tiled JSON map (no Phaser), used by Arena and the unit tests.
// Cells hold Tiled gids: 0 = empty, otherwise tileset id + firstgid.

export const LAYERS = { floor: 'floor', walls: 'walls', decor: 'decor', spawns: 'spawns' };

/**
 * @typedef {{ name: string, type: string, width?: number, height?: number, data?: number[],
 *   objects?: Array<{ name: string, x: number, y: number, point?: boolean }> }} TiledLayer
 * @typedef {{ width: number, height: number, tilewidth: number, tileheight: number,
 *   layers: TiledLayer[], tilesets: Array<Record<string, any>> }} TiledMap
 */

/**
 * The layer called `name`; throws if the map doesn't have it.
 * @param {TiledMap} map
 * @param {string} name
 * @returns {TiledLayer}
 */
export function getLayer(map, name) {
  const layer = map.layers.find((l) => l.name === name);
  if (!layer) throw new Error(`Map has no "${name}" layer`);
  return layer;
}

/**
 * The gid at (col, row) of a tile layer, or undefined outside the layer.
 * @param {TiledLayer} layer
 * @param {number} col
 * @param {number} row
 */
export function cellAt(layer, col, row) {
  if (col < 0 || row < 0 || col >= layer.width || row >= layer.height) return undefined;
  return layer.data[row * layer.width + col];
}

/**
 * True if (col, row) has a tile on the walls layer, or lies outside the map.
 * @param {TiledMap} map
 * @param {number} col
 * @param {number} row
 */
export function isWallCell(map, col, row) {
  const gid = cellAt(getLayer(map, LAYERS.walls), col, row);
  return gid === undefined || gid > 0;
}

/**
 * The named point on the spawns layer, in px and in cells.
 * @param {TiledMap} map
 * @param {string} name
 * @returns {{ x: number, y: number, col: number, row: number }}
 */
export function findSpawn(map, name) {
  const obj = getLayer(map, LAYERS.spawns).objects?.find((o) => o.name === name);
  if (!obj) throw new Error(`Map has no "${name}" spawn point`);
  return { x: obj.x, y: obj.y, col: Math.floor(obj.x / map.tilewidth), row: Math.floor(obj.y / map.tileheight) };
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Flood-fill (4-way) the non-wall cells reachable from `start`.
 * @param {TiledMap} map
 * @param {{ col: number, row: number }} start
 * @returns {Set<number>} cell indices (row * width + col)
 */
export function reachableCells(map, start) {
  const seen = new Set();
  if (isWallCell(map, start.col, start.row)) return seen;
  const queue = [[start.col, start.row]];
  seen.add(start.row * map.width + start.col);
  while (queue.length > 0) {
    const [c, r] = queue.pop();
    for (const [dc, dr] of STEPS) {
      const nc = c + dc;
      const nr = r + dr;
      const i = nr * map.width + nc;
      if (!seen.has(i) && !isWallCell(map, nc, nr)) {
        seen.add(i);
        queue.push([nc, nr]);
      }
    }
  }
  return seen;
}

/**
 * Indices of every non-wall cell in the map.
 * @param {TiledMap} map
 * @returns {number[]}
 */
export function openCells(map) {
  const out = [];
  for (let r = 0; r < map.height; r++) {
    for (let c = 0; c < map.width; c++) if (!isWallCell(map, c, r)) out.push(r * map.width + c);
  }
  return out;
}

/**
 * Connected (4-way) wall groups that don't touch the map edge: the interior obstacles.
 * @param {TiledMap} map
 * @returns {Array<Array<{ col: number, row: number }>>}
 */
export function obstacleGroups(map) {
  const { width, height } = map;
  const seen = new Set();
  const groups = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const start = r * width + c;
      if (seen.has(start) || !isWallCell(map, c, r)) continue;
      let touchesEdge = false;
      const cells = [];
      const queue = [[c, r]];
      seen.add(start);
      while (queue.length > 0) {
        const [qc, qr] = queue.pop();
        cells.push({ col: qc, row: qr });
        if (qc === 0 || qr === 0 || qc === width - 1 || qr === height - 1) touchesEdge = true;
        for (const [dc, dr] of STEPS) {
          const nc = qc + dc;
          const nr = qr + dr;
          if (nc < 0 || nr < 0 || nc >= width || nr >= height) continue;
          const i = nr * width + nc;
          if (!seen.has(i) && isWallCell(map, nc, nr)) {
            seen.add(i);
            queue.push([nc, nr]);
          }
        }
      }
      if (!touchesEdge) groups.push(cells);
    }
  }
  return groups;
}

/**
 * Number of open cells between two groups along the less-separated axis (Chebyshev distance - 1):
 * the narrowest corridor a body could squeeze through between them.
 * @param {Array<{ col: number, row: number }>} a
 * @param {Array<{ col: number, row: number }>} b
 */
export function gapBetween(a, b) {
  let best = Infinity;
  for (const p of a) {
    for (const q of b) best = Math.min(best, Math.max(Math.abs(p.col - q.col), Math.abs(p.row - q.row)) - 1);
  }
  return best;
}
