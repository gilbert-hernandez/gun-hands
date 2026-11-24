// Pure HUD math (GH-10): bar fill widths, the active powerup list, and icon blinking.
import { pickupVisible } from '../powerups/rules.js';

/** @typedef {import('../config/powerups.js').TimedPowerupId} TimedPowerupId */

/**
 * Visible width of a bar fill in whole pixels: value / max of `full`, clamped to [0, full].
 * @param {number} value
 * @param {number} max
 * @param {number} full full fill width (px)
 * @returns {number}
 */
export function fillWidth(value, max, full) {
  if (!(max > 0)) return 0;
  return Math.round(Math.min(1, Math.max(0, value / max)) * full);
}

/**
 * The active timed powerups in display order, with whole seconds left (rounded up).
 * @param {Partial<Record<string, number>>} active powerup id -> ms left
 * @param {readonly TimedPowerupId[]} order
 * @returns {{ id: TimedPowerupId, msLeft: number, seconds: number }[]}
 */
export function activePowerups(active, order) {
  const list = [];
  for (const id of order) {
    const msLeft = active[id] ?? 0;
    if (msLeft > 0) list.push({ id, msLeft, seconds: Math.ceil(msLeft / 1000) });
  }
  return list;
}

/**
 * Whether a powerup icon is drawn this frame: steady above the warning time, blinking inside it.
 * Same rule as pickups on the floor.
 * @param {number} msLeft
 * @param {number} warnMs
 * @param {number} blinkMs
 * @returns {boolean}
 */
export function iconVisible(msLeft, warnMs, blinkMs) {
  return pickupVisible(msLeft, warnMs, blinkMs);
}
