import { AUDIO } from '../config/index.js';
import { jitter, rateFor, throttle } from './rules.js';
import { createMuteStore } from './storage.js';

/** @typedef {import('../config/audio.js').SoundSlug} SoundSlug */
/** @typedef {'played' | 'unknown' | 'missing' | 'muted' | 'locked' | 'throttled' | 'error'} PlayResult */

/**
 * The parts of Phaser's sound manager this uses (a fake one in unit tests).
 * @typedef {object} SoundManagerLike
 * @property {boolean} locked true until the browser allows audio
 * @property {boolean} mute
 * @property {(key: string, config: { volume: number, rate: number }) => SoundLike} add
 */
/**
 * @typedef {object} SoundLike
 * @property {(event: string, fn: () => void) => unknown} once
 * @property {() => unknown} play
 * @property {() => void} destroy
 */

/** Emitted with the new state whenever mute changes. */
export const MUTE_CHANGED = 'mute-changed';

/**
 * The game's one sound effect player (GH-29). Plays sounds by slug and never throws: a request for
 * an unknown or missing sound, while muted, before audio unlocks, or inside a sound's throttle
 * plays nothing and returns why. Created in Preload and kept in the registry (`getSfx`).
 */
export default class Sfx {
  /**
   * @param {object} opts
   * @param {SoundManagerLike} opts.sound
   * @param {Iterable<string>} opts.available slugs whose WAV was loaded
   * @param {() => number} opts.now clock in ms
   * @param {() => number} [opts.rng] for pitch jitter; replaceable in tests
   * @param {import('./storage.js').MuteStore} [opts.store]
   * @param {typeof AUDIO} [opts.config]
   */
  constructor({ sound, available, now, rng = Math.random, store = createMuteStore(AUDIO.storageKey), config = AUDIO }) {
    this.sound = sound;
    this.available = new Set(available);
    this.now = now;
    this.rng = rng;
    this.store = store;
    this.config = config;
    /** @type {Map<string, { lastMs: number | null, voices: number }>} */
    this.state = new Map();
    /** @type {Map<string, Set<(muted: boolean) => void>>} */
    this.listeners = new Map();
    this.muted = store.loadMuted();
    this.sound.mute = this.muted;
  }

  /**
   * Play a sound. `semitones` shifts its pitch (and speed); the sound's pitch jitter is added.
   * @param {string} slug
   * @param {{ semitones?: number }} [opts]
   * @returns {PlayResult}
   */
  play(slug, { semitones = 0 } = {}) {
    const cfg = this.config.sounds[/** @type {SoundSlug} */ (slug)];
    if (!cfg) return 'unknown';
    if (!this.available.has(slug)) return 'missing';
    if (this.muted) return 'muted';
    if (this.sound.locked) return 'locked';
    const state = this.stateFor(slug);
    const now = this.now();
    if (!throttle(state, now, cfg)) return 'throttled';

    try {
      const rate = rateFor(semitones + jitter(this.rng, cfg.pitchJitter));
      const s = this.sound.add(slug, { volume: this.config.masterVolume * cfg.volume, rate });
      state.lastMs = now;
      state.voices++;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        state.voices--;
      };
      s.once('complete', () => {
        release();
        s.destroy();
      });
      s.once('destroy', release);
      s.play();
      return 'played';
    } catch (_err) {
      return 'error';
    }
  }

  /** @param {boolean} muted */
  setMuted(muted) {
    if (muted === this.muted) return;
    this.muted = muted;
    this.sound.mute = muted;
    this.store.saveMuted(muted);
    for (const fn of this.listeners.get(MUTE_CHANGED) ?? []) fn(muted);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  /** Configured slugs with no loaded WAV. */
  missing() {
    return Object.keys(this.config.sounds).filter((slug) => !this.available.has(slug));
  }

  /**
   * @param {typeof MUTE_CHANGED} event
   * @param {(muted: boolean) => void} fn
   */
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(fn);
  }

  /**
   * @param {typeof MUTE_CHANGED} event
   * @param {(muted: boolean) => void} fn
   */
  off(event, fn) {
    this.listeners.get(event)?.delete(fn);
  }

  /** @param {string} slug */
  stateFor(slug) {
    let s = this.state.get(slug);
    if (!s) {
      s = { lastMs: null, voices: 0 };
      this.state.set(slug, s);
    }
    return s;
  }
}

/** Used before Preload has made the real one: plays nothing, mute works in memory. */
const silent = new Sfx({
  sound: {
    locked: false,
    mute: false,
    add: () => {
      throw new Error('silent');
    },
  },
  available: [],
  now: () => 0,
  store: { loadMuted: () => false, saveMuted: () => {} },
});

/**
 * The game's sound player, or a silent stand-in if Preload hasn't created it.
 * @param {{ registry: { get: (key: string) => unknown } }} scene
 * @returns {Sfx}
 */
export function getSfx(scene) {
  return /** @type {Sfx | undefined} */ (scene.registry.get('sfx')) ?? silent;
}
