// Pure sound rules (GH-29): throttling, the XP pickup pitch chain and pitch jitter.
// No Phaser imports, so they can be unit-tested.

/** @typedef {import('../config/audio.js').SoundConfig} SoundConfig */

/**
 * Should a request for a sound be played? It is dropped when it comes sooner than
 * `minIntervalMs` after the last accepted play, or while `maxVoices` plays are sounding.
 * @param {{ lastMs: number | null, voices: number }} state the sound's last accepted play time and live plays
 * @param {number} now ms
 * @param {Pick<SoundConfig, 'minIntervalMs' | 'maxVoices'>} cfg
 * @returns {boolean}
 */
export function throttle(state, now, cfg) {
  if (state.voices >= cfg.maxVoices) return false;
  if (state.lastMs !== null && now - state.lastMs < cfg.minIntervalMs) return false;
  return true;
}

/**
 * The pitch of an XP pickup: one `step` higher than the previous pickup if it came within
 * `gapMs`, capped at `max`; otherwise the base pitch.
 * @param {{ lastMs: number | null, semitones: number }} chain the previous pickup
 * @param {number} now ms
 * @param {{ step: number, max: number, gapMs: number }} cfg
 * @returns {{ semitones: number, chain: { lastMs: number, semitones: number } }}
 */
export function xpChainSemitones(chain, now, cfg) {
  const continues = chain.lastMs !== null && now - chain.lastMs <= cfg.gapMs;
  const semitones = continues ? Math.min(chain.semitones + cfg.step, cfg.max) : 0;
  return { semitones, chain: { lastMs: now, semitones } };
}

/**
 * A random pitch offset in [-range, range] semitones (0 when range is 0).
 * @param {() => number} rng returns [0, 1)
 * @param {number} range
 */
export function jitter(rng, range) {
  return range > 0 ? (rng() * 2 - 1) * range : 0;
}

/** Playback rate for a pitch shift in semitones (12 = one octave up, double speed). */
export function rateFor(semitones) {
  return 2 ** (semitones / 12);
}
