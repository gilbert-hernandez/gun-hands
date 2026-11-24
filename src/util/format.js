/**
 * Format a duration as m:ss.
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
