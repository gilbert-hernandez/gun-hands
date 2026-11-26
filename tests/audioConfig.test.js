import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AUDIO, DISPLAY } from '../src/config/index.js';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

// The GH-28 sound list.
const GH28_SLUGS = [
  'shoot',
  'bullet-wall',
  'enemy-hit',
  'enemy-die',
  'brute-die',
  'player-hurt',
  'player-die',
  'xp-pickup',
  'level-up',
  'card-pick',
  'powerup-pickup',
  'heal',
  'shield-up',
  'shield-block',
  'bomb',
  'powerup-expire',
  'ui-hover',
  'ui-click',
  'game-start',
  'game-over',
];

/** Slugs in the ASSETS.md Audio table: | `slug` | trigger | notes | */
function parseAudioTable(md) {
  const section = md.slice(md.indexOf('## Audio'));
  return [...section.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((m) => m[1]);
}

describe('AUDIO config', () => {
  it('configures exactly the GH-28 sounds', () => {
    expect(Object.keys(AUDIO.sounds).sort()).toEqual([...GH28_SLUGS].sort());
  });

  it('uses slugs of lowercase letters, digits and single hyphens', () => {
    for (const slug of Object.keys(AUDIO.sounds)) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('has sane per-sound values', () => {
    for (const s of Object.values(AUDIO.sounds)) {
      expect(s.volume).toBeGreaterThan(0);
      expect(s.volume).toBeLessThanOrEqual(1);
      expect(s.minIntervalMs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(s.maxVoices)).toBe(true);
      expect(s.maxVoices).toBeGreaterThanOrEqual(1);
      expect(s.pitchJitter).toBeGreaterThanOrEqual(0);
      expect(s.pitchJitter).toBeLessThanOrEqual(12);
    }
  });

  it('has a master volume between 0 and 1 and a rising XP chain', () => {
    expect(AUDIO.masterVolume).toBeGreaterThan(0);
    expect(AUDIO.masterVolume).toBeLessThanOrEqual(1);
    const { step, max, gapMs } = AUDIO.xpChain;
    expect(step).toBeGreaterThan(0);
    expect(max).toBeGreaterThanOrEqual(step);
    expect(gapMs).toBeGreaterThan(0);
  });

  it('places the sound toggles on screen', () => {
    for (const p of [AUDIO.toggle.title, AUDIO.toggle.pause]) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThanOrEqual(DISPLAY.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(DISPLAY.height);
    }
  });

  it('has a WAV only for configured slugs (catches misspelled files)', () => {
    const wavs = readdirSync(root('src/assets/sfx')).filter((f) => f.endsWith('.wav'));
    for (const f of wavs) expect(Object.keys(AUDIO.sounds)).toContain(f.replace(/\.wav$/, ''));
  });

  it('matches the ASSETS.md Audio table exactly', () => {
    const md = readFileSync(root('ASSETS.md'), 'utf8');
    expect(parseAudioTable(md).sort()).toEqual(Object.keys(AUDIO.sounds).sort());
  });
});
