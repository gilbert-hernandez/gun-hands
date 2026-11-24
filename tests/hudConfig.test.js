import { describe, expect, it } from 'vitest';
import { DISPLAY, HUD, POWERUPS } from '../src/config/index.js';
import { asset } from '../src/assets/manifest.js';

const timedIds = Object.entries(POWERUPS.types)
  .filter(([, t]) => t.durationMs !== undefined)
  .map(([id]) => id);

describe('HUD config', () => {
  it('shows exactly the timed powerups, each with a 16x16 icon in the manifest', () => {
    expect([...HUD.powerupOrder].sort()).toEqual(timedIds.sort());
    for (const id of HUD.powerupOrder) {
      const entry = asset(`ui_icon_${id}`);
      expect(entry.frameWidth).toBe(16);
      expect(entry.frameHeight).toBe(16);
    }
  });

  it('starts the icon warning before every timed powerup runs out', () => {
    for (const id of timedIds) expect(HUD.powerupWarnMs).toBeLessThan(POWERUPS.types[id].durationMs);
    expect(HUD.blinkMs).toBeGreaterThan(0);
  });

  it('uses bar art from the manifest, with the fill fitting inside the frame', () => {
    const frame = asset(HUD.barFrame);
    for (const key of [HUD.hpFill, HUD.xpFill]) {
      const fill = asset(key);
      expect(fill.frameWidth + 2 * HUD.barInset).toBe(frame.frameWidth);
      expect(fill.frameHeight + 2 * HUD.barInset).toBe(frame.frameHeight);
    }
  });

  it('fits all powerup slots on screen', () => {
    expect(HUD.margin * 2 + HUD.powerupOrder.length * HUD.powerupSlot).toBeLessThan(DISPLAY.width);
  });

  it('uses whole, positive pixel sizes and offsets', () => {
    const ints = [
      HUD.margin,
      HUD.rowGap,
      HUD.barInset,
      HUD.labelGap,
      HUD.iconGap,
      HUD.shadowOffset,
      HUD.powerupSlot,
      ...Object.values(HUD.fontSize),
    ];
    for (const n of ints) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });

  it('has positive feedback timings', () => {
    expect(HUD.hitFlashMs).toBeGreaterThan(0);
    expect(HUD.levelPopMs).toBeGreaterThan(0);
    expect(HUD.levelPopScale).toBeGreaterThan(1);
  });
});
