import { describe, expect, it } from 'vitest';
import Sfx, { MUTE_CHANGED, getSfx } from '../src/audio/Sfx.js';
import { createMuteStore } from '../src/audio/storage.js';
import { AUDIO } from '../src/config/index.js';

/** A fake Phaser sound manager that records plays and lets tests finish them. */
function fakeManager() {
  const played = [];
  const manager = {
    locked: false,
    mute: false,
    played,
    add(key, config) {
      const handlers = {};
      const s = {
        key,
        config,
        destroyed: false,
        once: (event, fn) => {
          handlers[event] = fn;
        },
        play: () => played.push(s),
        destroy: () => {
          s.destroyed = true;
          handlers.destroy?.();
        },
        complete: () => handlers.complete?.(),
      };
      return s;
    },
  };
  return manager;
}

function memoryStore(initial = false) {
  const s = { muted: initial, saves: 0 };
  return {
    s,
    store: {
      loadMuted: () => s.muted,
      saveMuted: (m) => {
        s.muted = m;
        s.saves++;
      },
    },
  };
}

/** @param {{ available?: string[], muted?: boolean, rng?: () => number }} [opts] */
function make({ available = Object.keys(AUDIO.sounds), muted = false, rng = () => 0.5 } = {}) {
  const sound = fakeManager();
  const clock = { t: 0 };
  const mem = memoryStore(muted);
  const sfx = new Sfx({ sound, available, now: () => clock.t, rng, store: mem.store });
  return { sfx, sound, clock, mem };
}

describe('Sfx gates', () => {
  it('plays a configured, loaded sound', () => {
    const { sfx, sound } = make();
    expect(sfx.play('card-pick')).toBe('played');
    expect(sound.played).toHaveLength(1);
    expect(sound.played[0].key).toBe('card-pick');
  });

  it('drops unknown, missing, muted and locked requests without throwing', () => {
    const { sfx, sound } = make({ available: ['heal'] });
    expect(sfx.play('nope')).toBe('unknown');
    expect(sfx.play('bomb')).toBe('missing');
    sound.locked = true;
    expect(sfx.play('heal')).toBe('locked');
    sound.locked = false;
    sfx.setMuted(true);
    expect(sfx.play('heal')).toBe('muted');
    expect(sound.played).toHaveLength(0);
  });

  it('does not queue requests made while locked', () => {
    const { sfx, sound } = make();
    sound.locked = true;
    sfx.play('ui-hover');
    sound.locked = false;
    expect(sound.played).toHaveLength(0);
  });

  it('throttles by interval', () => {
    const { sfx, clock } = make();
    expect(sfx.play('shoot')).toBe('played');
    clock.t = AUDIO.sounds.shoot.minIntervalMs - 1;
    expect(sfx.play('shoot')).toBe('throttled');
    clock.t = AUDIO.sounds.shoot.minIntervalMs;
    expect(sfx.play('shoot')).toBe('played');
  });

  it('caps voices and frees one when a play completes or is destroyed', () => {
    const { sfx, sound, clock } = make();
    const cap = AUDIO.sounds['shield-block'].maxVoices;
    expect(cap).toBe(1);
    expect(sfx.play('shield-block')).toBe('played');
    clock.t = 10000;
    expect(sfx.play('shield-block')).toBe('throttled');
    sound.played[0].complete();
    expect(sound.played[0].destroyed).toBe(true);
    expect(sfx.play('shield-block')).toBe('played');
    // destroy after complete, or destroy alone, releases exactly once
    sound.played[1].destroy();
    sound.played[1].destroy();
    clock.t = 20000;
    expect(sfx.state.get('shield-block')?.voices).toBe(0);
  });

  it('returns error, not a throw, if the manager fails', () => {
    const { sfx, sound } = make();
    sound.add = () => {
      throw new Error('decode failed');
    };
    expect(sfx.play('heal')).toBe('error');
  });
});

describe('Sfx volume and pitch', () => {
  it('plays at master × sound volume', () => {
    const { sfx, sound } = make();
    sfx.play('bomb');
    expect(sound.played[0].config.volume).toBeCloseTo(AUDIO.masterVolume * AUDIO.sounds.bomb.volume);
  });

  it('shifts pitch by semitones (no jitter on sounds without it)', () => {
    const { sfx, sound, clock } = make();
    sfx.play('xp-pickup', { semitones: 12 });
    clock.t = 10000;
    sfx.play('xp-pickup', { semitones: -12 });
    expect(sound.played[0].config.rate).toBeCloseTo(2);
    expect(sound.played[1].config.rate).toBeCloseTo(0.5);
  });

  it('adds jitter within the sound range', () => {
    const { sfx, sound } = make({ rng: () => 0.999999 });
    sfx.play('shoot');
    expect(sound.played[0].config.rate).toBeCloseTo(2 ** (AUDIO.sounds.shoot.pitchJitter / 12), 4);
  });
});

describe('Sfx mute', () => {
  it('starts with the remembered state and applies it to the manager', () => {
    const { sfx, sound } = make({ muted: true });
    expect(sfx.muted).toBe(true);
    expect(sound.mute).toBe(true);
  });

  it('toggles, saves, sets the manager mute and notifies listeners', () => {
    const { sfx, sound, mem } = make();
    const seen = [];
    const fn = (m) => seen.push(m);
    sfx.on(MUTE_CHANGED, fn);
    sfx.toggleMuted();
    expect(sfx.muted).toBe(true);
    expect(sound.mute).toBe(true);
    expect(mem.s.muted).toBe(true);
    sfx.toggleMuted();
    sfx.off(MUTE_CHANGED, fn);
    sfx.toggleMuted();
    expect(seen).toEqual([true, false]);
  });

  it('ignores setting the same state', () => {
    const { sfx, mem } = make();
    sfx.setMuted(false);
    expect(mem.s.saves).toBe(0);
  });

  it('works for the visit when storage throws on every call', () => {
    const throwing = () => ({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const store = createMuteStore('k', throwing);
    const sfx = new Sfx({ sound: fakeManager(), available: [], now: () => 0, store });
    expect(sfx.muted).toBe(false);
    sfx.toggleMuted();
    expect(sfx.muted).toBe(true);
  });

  it('survives storage that is missing or whose getter throws', () => {
    expect(createMuteStore('k', () => undefined).loadMuted()).toBe(false);
    const getterThrows = () => {
      throw new Error('SecurityError');
    };
    const store = createMuteStore('k', getterThrows);
    expect(store.loadMuted()).toBe(false);
    expect(() => store.saveMuted(true)).not.toThrow();
  });

  it('round-trips through a working storage', () => {
    const data = new Map();
    const ls = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
    const store = createMuteStore('k', () => ls);
    store.saveMuted(true);
    expect(store.loadMuted()).toBe(true);
    store.saveMuted(false);
    expect(store.loadMuted()).toBe(false);
  });
});

describe('getSfx', () => {
  it('returns the registry instance, or a silent stand-in that never throws', () => {
    const { sfx } = make();
    expect(getSfx({ registry: { get: () => sfx } })).toBe(sfx);
    const stand = getSfx({ registry: { get: () => undefined } });
    expect(stand.play('shoot')).toBe('missing');
    expect(stand.play('nope')).toBe('unknown');
  });

  it('lists missing slugs', () => {
    const { sfx } = make({ available: ['shoot'] });
    expect(sfx.missing()).toHaveLength(Object.keys(AUDIO.sounds).length - 1);
    expect(sfx.missing()).not.toContain('shoot');
  });
});

describe('muteKeyHandler', () => {
  it('toggles once per key event, even if the same event is handled twice', async () => {
    const { muteKeyHandler } = await import('../src/audio/muteKey.js');
    const { sfx } = make();
    const state = { lastStamp: null };
    const onKey = muteKeyHandler(sfx, state);
    const ev = { timeStamp: 1234.5 };
    onKey(ev);
    onKey(ev);
    expect(sfx.muted).toBe(true);
    onKey({ timeStamp: 2000 });
    expect(sfx.muted).toBe(false);
  });

  it('shares the dedupe between scenes', async () => {
    const { muteKeyHandler } = await import('../src/audio/muteKey.js');
    const { sfx } = make();
    const state = { lastStamp: null };
    muteKeyHandler(sfx, state)({ timeStamp: 50 });
    muteKeyHandler(sfx, state)({ timeStamp: 50 });
    expect(sfx.muted).toBe(true);
  });
});
