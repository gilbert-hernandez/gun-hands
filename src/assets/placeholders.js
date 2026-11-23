// Generated stand-ins for art that hasn't been delivered yet. Each placeholder has the
// declared frame size and frame count and is registered under the real key, so game
// code behaves exactly the same with or without the PNG.

export const CATEGORY_COLORS = {
  player: '#22d3ee', // cyan
  enemy: '#ef4444', // red
  fx: '#facc15', // yellow
  pickup: '#22c55e', // green
  ui: '#9ca3af', // gray
  tiles: '#8b5a2b', // brown
};

/** Darken a #rrggbb color by `amount` (0..1). */
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - amount;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Fill + 1px darker outline for one cell, with `ticks` small marks (frame index) when there's room. */
function drawCell(ctx, x, y, w, h, color, ticks) {
  ctx.fillStyle = shade(color, 0.45);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  if (w > 2 && h > 2) ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  // Frame-index ticks: 1 tick on frame 0, 2 on frame 1, ... so animation is visible.
  if (ticks > 0 && w >= 6 && h >= 6) {
    const size = Math.max(1, Math.floor(Math.min(w, h) / 8));
    ctx.fillStyle = shade(color, 0.7);
    const maxTicks = Math.floor((w - 2) / (size * 2));
    for (let t = 0; t < Math.min(ticks, maxTicks); t++) {
      ctx.fillRect(x + 2 + t * size * 2, y + 2, size, size);
    }
  }
}

/** Draw a manifest entry's placeholder into a new canvas. Exported for testing/visual checks. */
export function drawPlaceholderCanvas(entry, doc = document) {
  const color = CATEGORY_COLORS[entry.category] ?? '#ff00ff';
  const { frameWidth: fw, frameHeight: fh, frames } = entry;
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (entry.type === 'tileset') {
    // A grid of tiles; alternating tint so individual tiles are distinguishable.
    const cols = entry.columns;
    const rows = Math.ceil(frames / cols);
    canvas.width = cols * fw;
    canvas.height = rows * fh;
    for (let i = 0; i < frames; i++) {
      const cx = (i % cols) * fw;
      const cy = Math.floor(i / cols) * fh;
      const odd = (i % cols + Math.floor(i / cols)) % 2 === 1;
      drawCell(ctx, cx, cy, fw, fh, odd ? shade(color, 0.2) : color, 0);
    }
  } else {
    // Single-row strip (an 'image' is just a 1-frame strip without ticks).
    canvas.width = fw * frames;
    canvas.height = fh;
    for (let i = 0; i < frames; i++) {
      drawCell(ctx, i * fw, 0, fw, fh, color, entry.type === 'spritesheet' ? i + 1 : 0);
    }
  }
  return canvas;
}

/** Register a placeholder texture for `entry` in a Phaser scene's texture manager. */
export function createPlaceholder(scene, entry) {
  const canvas = drawPlaceholderCanvas(entry);
  const textures = scene.textures;
  if (entry.type === 'spritesheet') {
    textures.addSpriteSheet(entry.key, canvas, { frameWidth: entry.frameWidth, frameHeight: entry.frameHeight });
  } else {
    // 'image' and 'tileset' load as plain images (Tilemaps slice tilesets themselves).
    textures.addCanvas(entry.key, canvas);
  }
}
