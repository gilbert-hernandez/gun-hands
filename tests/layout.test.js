import { describe, expect, it } from 'vitest';
import { DISPLAY, FLOW, HUD, TOUCH, UPGRADES } from '../src/config/index.js';
import { asset } from '../src/assets/manifest.js';
import { pickLayout } from '../src/ui/layout.js';

const MIN_TARGET = 64;
const MIN_TEXT = 20;

describe('pickLayout', () => {
  const base = { a: 1, nested: { x: 1, y: 2 }, touch: { a: 5, nested: { y: 9 } } };

  it('returns the base itself on desktop, or with no overrides', () => {
    expect(pickLayout(base, false)).toBe(base);
    const plain = { a: 1 };
    expect(pickLayout(plain, true)).toBe(plain);
  });

  it('merges touch overrides, nested too, without changing the base', () => {
    const picked = pickLayout(base, true);
    expect(picked.a).toBe(5);
    expect(picked.nested).toEqual({ x: 1, y: 9 });
    expect(base.nested).toEqual({ x: 1, y: 2 });
  });
});

describe('touch layout config', () => {
  const art = asset(FLOW.keys.button);
  const button = pickLayout(FLOW.button, true);
  const w = art.frameWidth * button.scale;
  const h = art.frameHeight * button.scale;

  it('has buttons big enough for a thumb, with readable labels', () => {
    expect(Math.min(w, h)).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(button.fontSize).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  it('keeps menu screens on-screen without overlaps', () => {
    const title = pickLayout(FLOW.title, true);
    expect(title.hintSize).toBeGreaterThanOrEqual(MIN_TEXT);
    expect(title.hintY - title.hintSize).toBeGreaterThanOrEqual(title.startY + h / 2);
    const pause = pickLayout(FLOW.pause, true);
    expect(pause.quitY - pause.resumeY).toBeGreaterThan(h);
    const over = pickLayout(FLOW.gameOver, true);
    const panelBottom = over.panelY + asset(FLOW.keys.gameOverPanel).frameHeight / 2;
    expect(over.buttonsY - h / 2).toBeGreaterThanOrEqual(panelBottom);
    expect(over.buttonsY + h / 2).toBeLessThanOrEqual(DISPLAY.height);
    expect(2 * w + over.buttonGap).toBeLessThanOrEqual(DISPLAY.width);
  });

  it('fits three readable cards under the prompt, hover included', () => {
    const l = pickLayout(UPGRADES.layout, true);
    const art = asset('ui_card');
    expect([l.cardWidth, l.cardHeight]).toEqual([art.frameWidth, art.frameHeight]);
    for (const size of [l.promptSize, l.number.size, l.name.size, l.text.size, l.rank.size])
      expect(size).toBeGreaterThanOrEqual(MIN_TEXT);
    const halfH = (l.cardHeight * l.cardScale * l.hoverScale) / 2;
    expect(l.cardY - halfH).toBeGreaterThan(l.promptY + l.promptSize);
    expect(l.cardY + halfH).toBeLessThanOrEqual(DISPLAY.height);
    expect(3 * l.cardWidth * l.cardScale + 2 * l.cardGap).toBeLessThanOrEqual(DISPLAY.width);
  });

  it('has readable HUD text on whole pixels, above the pause button', () => {
    const hud = pickLayout(HUD, true);
    for (const size of Object.values(hud.fontSize)) {
      expect(Number.isInteger(size)).toBe(true);
      expect(size).toBeGreaterThanOrEqual(MIN_TEXT);
    }
    expect(hud.margin + hud.fontSize.kills).toBeLessThan(TOUCH.pause.y - TOUCH.pause.hitSize / 2);
  });
});
