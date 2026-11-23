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

  it('darkens colors for outlines', () => {
    expect(shade('#ffffff', 0.5)).toBe('#808080');
    expect(shade('#22d3ee', 0)).toBe('#22d3ee');
  });
});
