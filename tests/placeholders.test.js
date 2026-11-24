import { describe, expect, it } from 'vitest';
import { MANIFEST, asset } from '../src/assets/manifest.js';
import { drawPlaceholderCanvas, CATEGORY_COLORS, shade } from '../src/assets/placeholders.js';

// Minimal stand-in for document/canvas: records size and fillRect calls.
const fakeDoc = {
  createElement: () => {
    const calls = [];
    return {
      width: 0,
      height: 0,
      calls,
      getContext: () => ({
        fillStyle: '',
        fillRect(x, y, w, h) {
          calls.push({ x, y, w, h, color: this.fillStyle });
        },
      }),
    };
  },
};

// The fake isn't a real Document/canvas, so loosen types at this one call site.
/** @param {any} entry @returns {any} */
const draw = (entry) => drawPlaceholderCanvas(entry, /** @type {any} */ (fakeDoc));

describe('placeholders', () => {
  it('has a color for every category', () => {
    for (const e of MANIFEST) expect(CATEGORY_COLORS[e.category]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('generates the declared size for every manifest entry', () => {
    for (const e of MANIFEST) {
      const c = draw(e);
      if (e.type === 'tileset') {
        expect([c.width, c.height]).toEqual([e.columns * e.frameWidth, (e.frames / e.columns) * e.frameHeight]);
      } else {
        expect([c.width, c.height]).toEqual([e.frameWidth * e.frames, e.frameHeight]);
      }
      // Nothing is drawn outside the canvas.
      for (const r of c.calls) {
        expect(r.x + r.w).toBeLessThanOrEqual(c.width);
        expect(r.y + r.h).toBeLessThanOrEqual(c.height);
      }
    }
  });

  it('makes the brute walk a 64x64 strip with its declared frame count', () => {
    const e = asset('enemy_brute_walk');
    const c = draw(e);
    expect(c.height).toBe(64);
    expect(c.width / 64).toBe(e.frames);
  });

  it('tints the arena tileset by row role and leaves the spare row transparent', () => {
    const e = asset('tiles_arena');
    const c = draw(e);
    expect([c.width, c.height]).toEqual([256, 256]);
    // The fill of a tile is the call covering its inner area (after the outline rect).
    const fillAt = (/** @type {number} */ id) => {
      const x = (id % 8) * 32;
      const y = Math.floor(id / 8) * 32;
      return c.calls.find((/** @type {any} */ r) => r.x === x + 1 && r.y === y + 1 && r.w === 30)?.color;
    };
    const floor = fillAt(0);
    const wall = fillAt(16);
    const obstacle = fillAt(32);
    const decor = fillAt(48);
    expect(new Set([floor, wall, obstacle, decor]).size).toBe(4);
    expect(c.calls.some((/** @type {any} */ r) => r.y >= 7 * 32)).toBe(false);
  });

  it('draws enemies in a light, neutral gray so per-type tints show their own hue', () => {
    const n = parseInt(CATEGORY_COLORS.enemy.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    expect(Math.min(r, g, b)).toBeGreaterThan(200);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(16);
  });

  it('darkens colors for outlines', () => {
    expect(shade('#ffffff', 0.5)).toBe('#808080');
    expect(shade('#22d3ee', 0)).toBe('#22d3ee');
  });
});
