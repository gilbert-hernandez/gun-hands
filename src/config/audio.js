// Sound effect tunables (GH-29). The audio code reads these; don't hard-code them elsewhere.
// Levels and throttles are first guesses, to be tuned in GH-13 (juice & balance pass).

/**
 * @typedef {object} SoundConfig
 * @property {number} volume 0-1, multiplied by `masterVolume`
 * @property {number} minIntervalMs a request this soon after the last accepted play of the same sound is dropped
 * @property {number} maxVoices a request while this many plays of the sound are sounding is dropped
 * @property {number} pitchJitter each accepted play is shifted by a random amount in ±this many semitones
 */

/** @type {(o?: Partial<SoundConfig>) => SoundConfig} */
const sound = ({ volume = 1, minIntervalMs = 0, maxVoices = 2, pitchJitter = 0 } = {}) => ({
  volume,
  minIntervalMs,
  maxVoices,
  pitchJitter,
});

// Every sound the game plays, keyed by slug: the WAV is src/assets/sfx/<slug>.wav (GH-28 pack).
// ASSETS.md's Audio table lists exactly these slugs (tests/audioConfig.test.js checks this).
const sounds = {
  shoot: sound({ minIntervalMs: 60, maxVoices: 4, pitchJitter: 1 }),
  'bullet-wall': sound({ minIntervalMs: 50, maxVoices: 4, pitchJitter: 1 }),
  'enemy-hit': sound({ minIntervalMs: 50, maxVoices: 4, pitchJitter: 1 }),
  'enemy-die': sound(),
  'brute-die': sound(),
  'player-hurt': sound(),
  'player-die': sound(),
  'xp-pickup': sound({ minIntervalMs: 40, maxVoices: 3 }),
  'level-up': sound({ minIntervalMs: 300, maxVoices: 1 }),
  'card-pick': sound(),
  'powerup-pickup': sound(),
  heal: sound(),
  'shield-up': sound(),
  'shield-block': sound({ minIntervalMs: 300, maxVoices: 1 }),
  bomb: sound(),
  'powerup-expire': sound(),
  'ui-hover': sound({ minIntervalMs: 80, maxVoices: 1 }),
  'ui-click': sound(),
  'game-start': sound(),
  'game-over': sound(),
};

/** @typedef {keyof typeof sounds} SoundSlug */

export const AUDIO = {
  masterVolume: 0.8,
  sounds,
  // Quick XP pickups rise `step` semitones each, up to `max`; a pickup more than `gapMs` after the
  // previous one starts again at the base pitch.
  xpChain: { step: 1, max: 12, gapMs: 350 },
  // localStorage key for the remembered mute state.
  storageKey: 'gunhands.muted',
  // The SOUND ON/OFF toggle (screen px at 960×540). `originX` 1 anchors its right edge at `x`.
  toggle: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#9ca3af',
    // Extra clickable margin around the text (px each side).
    hitPadding: 8,
    title: { x: 948, y: 12, originX: 1 },
    // Centered below Quit, clear of the HUD's kill counter in the top-right corner.
    pause: { x: 480, y: 400, originX: 0.5 },
    touch: { fontSize: 20, hitPadding: 22, title: { y: 8 }, pause: { y: 430 } },
  },
};
