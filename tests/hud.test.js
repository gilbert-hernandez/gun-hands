import { describe, expect, it } from 'vitest';
import { activePowerups, fillWidth, iconVisible } from '../src/hud/rules.js';
import { formatClock } from '../src/util/format.js';

const ORDER = /** @type {const} */ (['rapidfire', 'spread', 'shield']);

describe('fillWidth', () => {
  it('scales exact fractions of the full width', () => {
    expect(fillWidth(75, 100, 196)).toBe(147);
    expect(fillWidth(50, 100, 196)).toBe(98);
    expect(fillWidth(100, 100, 196)).toBe(196);
    expect(fillWidth(0, 100, 196)).toBe(0);
  });

  it('clamps to [0, full]', () => {
    expect(fillWidth(-5, 100, 196)).toBe(0);
    expect(fillWidth(150, 100, 196)).toBe(196);
  });

  it('is 0 when max is 0 or negative', () => {
    expect(fillWidth(5, 0, 196)).toBe(0);
    expect(fillWidth(5, -1, 196)).toBe(0);
  });

  it('always returns whole pixels', () => {
    for (let v = 0; v <= 137; v++) expect(Number.isInteger(fillWidth(v, 137, 196))).toBe(true);
  });
});

describe('activePowerups', () => {
  it('lists active ones in display order, whatever the insertion order', () => {
    const list = activePowerups({ shield: 5000, rapidfire: 9000 }, ORDER);
    expect(list.map((p) => p.id)).toEqual(['rapidfire', 'shield']);
  });

  it('skips missing and expired timers', () => {
    expect(activePowerups({ spread: 0 }, ORDER)).toEqual([]);
    expect(activePowerups({}, ORDER)).toEqual([]);
  });

  it('rounds seconds up', () => {
    const s = (ms) => activePowerups({ spread: ms }, ORDER)[0].seconds;
    expect(s(1200)).toBe(2);
    expect(s(1000)).toBe(1);
    expect(s(1)).toBe(1);
    expect(s(10000)).toBe(10);
  });
});

describe('iconVisible', () => {
  it('is steady above the warning time and alternates inside it', () => {
    expect(iconVisible(5000, 2000, 120)).toBe(true);
    expect(iconVisible(2001, 2000, 120)).toBe(true);
    const seen = new Set();
    for (let ms = 2000; ms > 0; ms -= 60) seen.add(iconVisible(ms, 2000, 120));
    expect(seen).toEqual(new Set([true, false]));
  });
});

describe('formatClock', () => {
  it('formats mm:ss with two-digit minutes', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(127_000)).toBe('02:07');
    expect(formatClock(599_999)).toBe('09:59');
    expect(formatClock(6_000_000)).toBe('100:00');
    expect(formatClock(-10)).toBe('00:00');
  });
});
