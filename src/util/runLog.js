// Run summaries for balance tuning (GH-13). Dev builds log one per run at GameOver and keep the last
// few in browser storage; the autoplay bot reads the same object. Storage can be missing or throw, so
// every access is wrapped (like audio/storage.js): a failed read is an empty log, a failed write is ignored.

/**
 * @typedef {object} RunSummary
 * @property {string} version
 * @property {number} timeMs
 * @property {number} level
 * @property {number} kills
 * @property {Record<string, number>} killsByType
 * @property {Record<string, number>} upgrades rank per upgrade id
 * @property {Record<string, number>} damageTaken HP lost per enemy type
 * @property {Record<string, number>} powerups collected per powerup id
 * @property {string} endedAt ISO time
 */

/**
 * @param {import('../combat/events.js').RunStats} stats
 * @param {string} version
 * @param {Date} [now]
 * @returns {RunSummary}
 */
export function buildRunSummary(stats, version, now = new Date()) {
  return {
    version,
    timeMs: Math.round(stats.timeMs),
    level: stats.level,
    kills: stats.kills,
    killsByType: { ...(stats.killsByType ?? {}) },
    upgrades: { ...(stats.upgrades ?? {}) },
    damageTaken: { ...(stats.damageTaken ?? {}) },
    powerups: { ...(stats.powerups ?? {}) },
    endedAt: now.toISOString(),
  };
}

/**
 * The stored run log: the newest `max` summaries, oldest first.
 * @param {string} key
 * @param {number} max
 * @param {() => Pick<Storage, 'getItem' | 'setItem'> | undefined} [getStorage] defaults to `localStorage`
 */
export function createRunLog(key, max, getStorage = () => globalThis.localStorage) {
  return {
    /** @returns {RunSummary[]} */
    load() {
      try {
        const list = JSON.parse(getStorage()?.getItem(key) ?? '[]');
        return Array.isArray(list) ? list : [];
      } catch (_err) {
        return [];
      }
    },
    /**
     * Add `summary` as the newest entry, dropping the oldest past `max`.
     * @param {RunSummary} summary
     * @returns {RunSummary[]} the log as it now stands (also when it couldn't be saved)
     */
    append(summary) {
      const list = [...this.load(), summary].slice(-max);
      try {
        getStorage()?.setItem(key, JSON.stringify(list));
      } catch (_err) {
        // Not remembered; the console line still has it.
      }
      return list;
    },
  };
}
