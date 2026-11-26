import { describe, expect, it } from 'vitest';
import GameAudio from '../src/audio/GameAudio.js';
import Sfx from '../src/audio/Sfx.js';
import { BULLET_WALL, ENEMY_HIT, ENEMY_KILLED, PLAYER_DIED, PLAYER_HIT, SHIELD_BLOCKED } from '../src/combat/events.js';
import { AUDIO } from '../src/config/index.js';
import { PLAYER_FIRED } from '../src/player/events.js';
import { POWERUP_COLLECTED, POWERUP_EXPIRED } from '../src/powerups/events.js';
import { UPGRADE_CHOSEN } from '../src/upgrades/events.js';
import { PLAYER_LEVELED, XP_COLLECTED } from '../src/xp/events.js';

/** Minimal emitter with Phaser's on/off/once/emit shape. */
function emitter() {
  /** @type {Map<string, Set<Function>>} */
  const map = new Map();
  const e = {
    on(name, fn) {
      if (!map.has(name)) map.set(name, new Set());
      map.get(name)?.add(fn);
    },
    off(name, fn) {
      map.get(name)?.delete(fn);
    },
    once(name, fn) {
      const wrap = (...a) => {
        e.off(name, wrap);
        fn(...a);
      };
      e.on(name, wrap);
    },
    emit(name, data) {
      for (const fn of [...(map.get(name) ?? [])]) fn(data);
    },
    count: () => [...map.values()].reduce((n, s) => n + s.size, 0),
  };
  return e;
}

/** A recording sfx: every request is accepted, unless `reject` names the slug. */
function recorder() {
  const clock = { t: 0 };
  /** @type {[string, number][]} */
  const calls = [];
  const sfx = {
    reject: new Set(),
    now: () => clock.t,
    play(slug, { semitones = 0 } = {}) {
      calls.push([slug, semitones]);
      return sfx.reject.has(slug) ? 'throttled' : 'played';
    },
  };
  return { sfx, calls, clock };
}

function setup() {
  const events = emitter();
  const r = recorder();
  const audio = new GameAudio({ events }, /** @type {any} */ (r.sfx));
  const slugs = () => r.calls.map((c) => c[0]);
  return { events, audio, ...r, slugs };
}

describe('GameAudio mapping', () => {
  it('plays shoot, or bullet-wall for a blocked shot and a wall hit', () => {
    const { events, slugs } = setup();
    events.emit(PLAYER_FIRED, { blocked: false });
    events.emit(PLAYER_FIRED, { blocked: true });
    events.emit(BULLET_WALL, { x: 0, y: 0 });
    expect(slugs()).toEqual(['shoot', 'bullet-wall', 'bullet-wall']);
  });

  it('plays enemy-hit only for a surviving enemy, and the right death sound', () => {
    const { events, slugs } = setup();
    events.emit(ENEMY_HIT, { typeId: 'grunt', hpLeft: 5 });
    events.emit(ENEMY_HIT, { typeId: 'grunt', hpLeft: 0 });
    events.emit(ENEMY_KILLED, { typeId: 'grunt' });
    events.emit(ENEMY_KILLED, { typeId: 'runner' });
    events.emit(ENEMY_HIT, { typeId: 'brute', hpLeft: -3 });
    events.emit(ENEMY_KILLED, { typeId: 'brute' });
    expect(slugs()).toEqual(['enemy-hit', 'enemy-die', 'enemy-die', 'brute-die']);
  });

  it('plays player-hurt for a survivable hit and only player-die for a fatal one', () => {
    const { events, slugs } = setup();
    events.emit(PLAYER_HIT, { damage: 10, hp: 90, maxHp: 100 });
    events.emit(PLAYER_HIT, { damage: 90, hp: 0, maxHp: 100 });
    events.emit(PLAYER_DIED, {});
    expect(slugs()).toEqual(['player-hurt', 'player-die']);
  });

  it('maps shield blocks, level-ups, card picks and expiry', () => {
    const { events, slugs } = setup();
    events.emit(SHIELD_BLOCKED, { typeId: 'grunt' });
    events.emit(PLAYER_LEVELED, { level: 2 });
    events.emit(UPGRADE_CHOSEN, { id: 'damage', rank: 1 });
    events.emit(POWERUP_EXPIRED, { id: 'spread' });
    expect(slugs()).toEqual(['shield-block', 'level-up', 'card-pick', 'powerup-expire']);
  });

  it('gives Health, Shield and Bomb their own pickup sounds', () => {
    const { events, slugs } = setup();
    for (const id of ['rapidfire', 'spread', 'magnet', 'health', 'shield', 'bomb'])
      events.emit(POWERUP_COLLECTED, { id });
    expect(slugs()).toEqual(['powerup-pickup', 'powerup-pickup', 'powerup-pickup', 'heal', 'shield-up', 'bomb']);
  });
});

describe('GameAudio XP chain', () => {
  const { step, gapMs } = AUDIO.xpChain;

  it('rises one step per quick pickup and resets after a pause', () => {
    const { events, calls, clock } = setup();
    for (const t of [0, 100, 200, 300]) {
      clock.t = t;
      events.emit(XP_COLLECTED, { amount: 1 });
    }
    clock.t = 300 + gapMs + 1;
    events.emit(XP_COLLECTED, { amount: 1 });
    expect(calls.map((c) => c[1])).toEqual([0, step, 2 * step, 3 * step, 0]);
  });

  it('does not advance on throttled pickups', () => {
    const { events, calls, clock, sfx } = setup();
    events.emit(XP_COLLECTED, { amount: 1 });
    sfx.reject.add('xp-pickup');
    clock.t = 16;
    events.emit(XP_COLLECTED, { amount: 1 });
    clock.t = 32;
    events.emit(XP_COLLECTED, { amount: 1 });
    sfx.reject.clear();
    clock.t = 48;
    events.emit(XP_COLLECTED, { amount: 1 });
    expect(calls.map((c) => c[1])).toEqual([0, step, step, step]);
  });

  it('with the real Sfx throttle: frame-rate pickups play base, then one step up', () => {
    const events = emitter();
    const clock = { t: 0 };
    const played = [];
    const sound = {
      locked: false,
      mute: false,
      add: (key, cfg) => ({ once: () => {}, play: () => played.push(cfg.rate), destroy: () => {} }),
    };
    const sfx = new Sfx({
      sound,
      available: ['xp-pickup'],
      now: () => clock.t,
      store: { loadMuted: () => false, saveMuted: () => {} },
    });
    new GameAudio({ events }, sfx);
    for (const t of [0, 16, 32, 48]) {
      clock.t = t;
      events.emit(XP_COLLECTED, { amount: 1 });
    }
    expect(played).toHaveLength(2);
    expect(played[0]).toBeCloseTo(1);
    expect(played[1]).toBeCloseTo(2 ** (step / 12));
  });
});

describe('GameAudio lifecycle', () => {
  it('removes every listener on shutdown, so a restart does not double sounds', () => {
    const events = emitter();
    const r = recorder();
    new GameAudio({ events }, /** @type {any} */ (r.sfx));
    events.emit('shutdown');
    expect(events.count()).toBe(0);
    new GameAudio({ events }, /** @type {any} */ (r.sfx));
    events.emit(PLAYER_FIRED, { blocked: false });
    expect(r.calls).toHaveLength(1);
  });
});
