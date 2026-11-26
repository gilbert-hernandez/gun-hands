import Phaser from 'phaser';
import { AUDIO, DISPLAY } from '../config/index.js';
import { MANIFEST } from '../assets/manifest.js';
import { AVAILABLE_FILES } from '../assets/available.js';
import { createPlaceholder } from '../assets/placeholders.js';
import { AVAILABLE_SOUNDS } from '../audio/available.js';
import Sfx from '../audio/Sfx.js';
import arenaMap from '../assets/maps/gh_arena.json';
import { MAP_KEY } from '../world/Arena.js';
import { addSceneLabel } from './sceneLabel.js';

// Loads every manifest entry whose PNG exists and generates placeholders for the rest,
// plus the arena tilemap (bundled JSON, so no extra request) and every delivered sound effect.
// It creates the game's one sound player (GH-29), kept in the registry as 'sfx'.
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    addSceneLabel(this);
    this.createProgressBar();

    for (const entry of MANIFEST) {
      const url = AVAILABLE_FILES[entry.file];
      if (!url) continue;
      if (entry.type === 'spritesheet') {
        this.load.spritesheet(entry.key, url, { frameWidth: entry.frameWidth, frameHeight: entry.frameHeight });
      } else {
        this.load.image(entry.key, url);
      }
    }
    this.load.tilemapTiledJSON(MAP_KEY, arenaMap);

    for (const slug of Object.keys(AUDIO.sounds)) {
      const url = AVAILABLE_SOUNDS[slug];
      if (url) this.load.audio(slug, url);
    }
  }

  createProgressBar() {
    const { width, height } = DISPLAY;
    const barW = 320;
    const barH = 16;
    const x = (width - barW) / 2;
    const y = height / 2;

    this.add
      .text(width / 2, y - 24, 'Loading...', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);
    const frame = this.add.graphics();
    frame.lineStyle(2, 0xffffff, 1).strokeRect(x - 2, y - 2, barW + 4, barH + 4);
    const fill = this.add.graphics();

    this.load.on('progress', (p) => {
      fill
        .clear()
        .fillStyle(0x22d3ee, 1)
        .fillRect(x, y, barW * p, barH);
    });
  }

  create() {
    const placeholders = [];
    for (const entry of MANIFEST) {
      if (!this.textures.exists(entry.key)) {
        createPlaceholder(this, entry);
        placeholders.push(entry.key);
      }
    }

    // Game code checks this to style placeholders (e.g. per-type enemy tints).
    this.registry.set('placeholders', placeholders);

    if (import.meta.env.DEV && placeholders.length > 0) {
      console.warn(
        `[assets] ${placeholders.length} placeholder(s) in use (art not delivered yet): ${placeholders.join(', ')}`,
      );
    }

    // A sound counts as available only once it loaded (and decoded); anything else stays silent.
    const sfx = new Sfx({
      sound: this.sound,
      available: Object.keys(AUDIO.sounds).filter((slug) => this.cache.audio.exists(slug)),
      now: () => this.game.loop.time,
    });
    this.registry.set('sfx', sfx);
    const missingSounds = sfx.missing();
    if (import.meta.env.DEV && missingSounds.length > 0) {
      console.warn(`[audio] ${missingSounds.length} sound(s) missing (silent): ${missingSounds.join(', ')}`);
    }

    this.scene.start('Title');
  }
}
