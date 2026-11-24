/**
 * Format a duration as m:ss.
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Format a duration as a mm:ss clock (minutes padded to at least two digits), for the HUD.
 * @param {number} ms
 * @returns {string}
 */
export function formatClock(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
