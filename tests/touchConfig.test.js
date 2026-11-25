import { describe, expect, it } from 'vitest';
import { DISPLAY, TOUCH, UPGRADES } from '../src/config/index.js';

describe('TOUCH config', () => {
  it('has a positive dead zone inside the stick radius', () => {
    expect(TOUCH.stick.deadZone).toBeGreaterThan(0);
    expect(TOUCH.stick.knobRadius).toBeGreaterThan(0);
    expect(TOUCH.stick.deadZone).toBeLessThan(TOUCH.stick.radius);
  });

  it('has an on-screen pause button big enough for a thumb', () => {
    const { x, y, hitSize, size } = TOUCH.pause;
    expect(hitSize).toBeGreaterThanOrEqual(64);
    expect(size).toBeLessThanOrEqual(hitSize);
    expect(x - hitSize / 2).toBeGreaterThanOrEqual(0);
    expect(x + hitSize / 2).toBeLessThanOrEqual(DISPLAY.width);
    expect(y - hitSize / 2).toBeGreaterThanOrEqual(0);
    expect(y + hitSize / 2).toBeLessThanOrEqual(DISPLAY.height);
  });

  it('waits at least as long for touches as for other LevelUp input', () => {
    expect(TOUCH.levelUpDelayMs).toBeGreaterThanOrEqual(UPGRADES.inputDelayMs);
  });
});
