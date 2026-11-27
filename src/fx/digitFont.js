import Phaser from 'phaser';

const DIGITS = '0123456789';
// Glyphs are drawn white with a dark outline; BitmapText tints only multiply, so the white fill
// takes the tint and the outline stays dark.
const FILL = '#ffffff';
const OUTLINE = '#111827';

/**
 * Generate the damage-number font (GH-13): the ten digits drawn on a canvas, hardened to pixel-art
 * edges, and registered as a retro bitmap font under `key` (texture and font share the key). Bitmap
 * text costs no canvas redraw when its text changes, unlike `Text`. Does nothing if `key` exists.
 * @param {Phaser.Scene} scene
 * @param {{ key: string, width: number, height: number }} font glyph cell size in px
 */
export function createDigitFont(scene, { key, width, height }) {
  if (scene.cache.bitmapFont.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, width * DIGITS.length, height);
  const ctx = canvas.getContext();
  ctx.font = `bold ${height - 2}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = FILL;
  for (let i = 0; i < DIGITS.length; i++) {
    const x = i * width + width / 2;
    ctx.strokeText(DIGITS[i], x, height / 2 + 1);
    ctx.fillText(DIGITS[i], x, height / 2 + 1);
  }
  // No anti-aliasing: every pixel is either fully drawn or empty, matching the pixel art.
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] >= 128 ? 255 : 0;
  ctx.putImageData(img, 0, 0);
  canvas.refresh();
  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: key,
    width,
    height,
    chars: DIGITS,
    charsPerRow: DIGITS.length,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 0,
  });
  scene.cache.bitmapFont.add(key, data);
}

/**
 * Generate the particle texture (GH-13): a white square tinted per burst. Does nothing if it exists.
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {number} [size]
 */
export function createDotTexture(scene, key, size = 3) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, size, size);
  const ctx = canvas.getContext();
  ctx.fillStyle = FILL;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}
