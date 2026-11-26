// Remembered mute state (GH-29). Browser storage can be missing or throw (private windows, blocked
// site data), so every access is wrapped: a failed read means "not muted", a failed write is ignored.

/**
 * @typedef {object} MuteStore
 * @property {() => boolean} loadMuted
 * @property {(muted: boolean) => void} saveMuted
 */

/**
 * @param {string} key
 * @param {() => Pick<Storage, 'getItem' | 'setItem'> | undefined} [getStorage] defaults to `localStorage`
 * @returns {MuteStore}
 */
export function createMuteStore(key, getStorage = () => globalThis.localStorage) {
  return {
    loadMuted() {
      try {
        return getStorage()?.getItem(key) === '1';
      } catch (_err) {
        return false;
      }
    },
    saveMuted(muted) {
      try {
        getStorage()?.setItem(key, muted ? '1' : '0');
      } catch (_err) {
        // Not remembered; the in-memory state still applies for this visit.
      }
    },
  };
}
