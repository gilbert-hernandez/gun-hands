import { describe, expect, it } from 'vitest';
import { buildRunSummary, createRunLog } from '../src/util/runLog.js';

const stats = {
  timeMs: 312345.6,
  kills: 410,
  level: 11,
  killsByType: { grunt: 300, runner: 100, brute: 10 },
  damageTaken: { grunt: 60, runner: 24, brute: 40 },
  upgrades: { damage: 3, firerate: 2 },
  powerups: { bomb: 1 },
};

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

describe('buildRunSummary', () => {
  it('copies the run stats with the version and end time', () => {
    const s = buildRunSummary(stats, '0.2.3', new Date('2026-11-27T16:00:00Z'));
    expect(s).toEqual({
      version: '0.2.3',
      timeMs: 312346,
      level: 11,
      kills: 410,
      killsByType: stats.killsByType,
      upgrades: stats.upgrades,
      damageTaken: stats.damageTaken,
      powerups: stats.powerups,
      endedAt: '2026-11-27T16:00:00.000Z',
    });
    expect(s.killsByType).not.toBe(stats.killsByType);
  });

  it('fills missing tallies with empty objects', () => {
    const s = buildRunSummary(/** @type {any} */ ({ timeMs: 1000, kills: 0, level: 1 }), 'x');
    expect([s.killsByType, s.upgrades, s.damageTaken, s.powerups]).toEqual([{}, {}, {}, {}]);
  });
});

describe('createRunLog', () => {
  it('keeps the newest `max` entries, oldest first', () => {
    const storage = memoryStorage();
    const log = createRunLog('runs', 3, () => storage);
    for (let i = 1; i <= 5; i++) log.append(/** @type {any} */ ({ kills: i }));
    expect(log.load().map((s) => s.kills)).toEqual([3, 4, 5]);
  });

  it('starts empty and survives junk in storage', () => {
    const storage = memoryStorage();
    const log = createRunLog('runs', 20, () => storage);
    expect(log.load()).toEqual([]);
    storage.setItem('runs', '{not json');
    expect(log.load()).toEqual([]);
    storage.setItem('runs', '{"a":1}');
    expect(log.load()).toEqual([]);
  });

  it('ignores storage that throws on every call', () => {
    const throwing = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    const log = createRunLog('runs', 20, () => throwing);
    expect(log.load()).toEqual([]);
    expect(log.append(/** @type {any} */ ({ kills: 1 }))).toEqual([{ kills: 1 }]);
  });

  it('works with no storage at all', () => {
    const log = createRunLog('runs', 20, () => undefined);
    expect(log.append(/** @type {any} */ ({ kills: 2 }))).toEqual([{ kills: 2 }]);
  });
});
