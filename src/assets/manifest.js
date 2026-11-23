// The single list of every graphic the game uses. Pure data: no Phaser imports,
// so it can be unit-tested. Game code refers to assets ONLY by `key`.
//
// Fields:
//   key          stable id used in code ('player_body_idle')
//   file         file name in src/assets/img/ ('gh_player_body_idle.png')
//   type         'spritesheet' (single-row strip), 'image', or 'tileset' (grid)
//   frameWidth   width of one frame (or of the whole image for 'image')
//   frameHeight  height of one frame
//   frames       frame count (1 for 'image'; columns*rows for 'tileset')
//   columns      'tileset' only: tiles per row
//   category     player | enemy | fx | pickup | ui | tiles (placeholder color)
//   ticket       Art ticket that delivers it
//
// ASSETS.md must list exactly the same files, sizes and frame counts
// (tests/manifest.test.js checks this).

export const TYPES = ['spritesheet', 'image', 'tileset'];
export const CATEGORIES = ['player', 'enemy', 'fx', 'pickup', 'ui', 'tiles'];
export const FILE_PATTERN = /^gh_[a-z0-9]+(_[a-z0-9]+)+\.png$/;

const sheet = (file, size, frames, category, ticket) => {
  const [frameWidth, frameHeight] = Array.isArray(size) ? size : [size, size];
  return { key: keyFor(file), file, type: 'spritesheet', frameWidth, frameHeight, frames, category, ticket };
};

const image = (file, width, height, category, ticket) => ({
  key: keyFor(file),
  file,
  type: 'image',
  frameWidth: width,
  frameHeight: height,
  frames: 1,
  category,
  ticket,
});

/** 'gh_player_body_idle.png' -> 'player_body_idle' */
export function keyFor(file) {
  return file.replace(/^gh_/, '').replace(/\.png$/, '');
}

export const MANIFEST = [
  // GH-16 Player: body (faces right) + separate gun-hands layer (points right, pivot at center)
  sheet('gh_player_body_idle.png', 32, 4, 'player', 'GH-16'),
  sheet('gh_player_body_run.png', 32, 6, 'player', 'GH-16'),
  sheet('gh_player_body_hurt.png', 32, 2, 'player', 'GH-16'),
  sheet('gh_player_body_death.png', 32, 6, 'player', 'GH-16'),
  sheet('gh_player_guns_idle.png', 32, 1, 'player', 'GH-16'),
  sheet('gh_player_guns_recoil.png', 32, 3, 'player', 'GH-16'),

  // GH-17 Enemies (face right)
  sheet('gh_enemy_grunt_walk.png', 32, 6, 'enemy', 'GH-17'),
  sheet('gh_enemy_grunt_death.png', 32, 6, 'enemy', 'GH-17'),
  sheet('gh_enemy_runner_walk.png', 32, 6, 'enemy', 'GH-17'),
  sheet('gh_enemy_runner_death.png', 32, 6, 'enemy', 'GH-17'),
  sheet('gh_enemy_brute_walk.png', 64, 6, 'enemy', 'GH-17'),
  sheet('gh_enemy_brute_death.png', 64, 6, 'enemy', 'GH-17'),

  // GH-18 Projectiles & combat FX
  sheet('gh_fx_bullet.png', 8, 2, 'fx', 'GH-18'),
  sheet('gh_fx_muzzle.png', 16, 3, 'fx', 'GH-18'),
  sheet('gh_fx_impact.png', 16, 4, 'fx', 'GH-18'),
  sheet('gh_fx_enemy_puff.png', 32, 6, 'fx', 'GH-18'),
  sheet('gh_fx_bomb_blast.png', 64, 6, 'fx', 'GH-18'),
  sheet('gh_fx_levelup.png', 48, 6, 'fx', 'GH-18'),

  // GH-19 Arena tileset: 8x8 grid of 32x32 tiles, no spacing/margin
  {
    key: keyFor('gh_tiles_arena.png'),
    file: 'gh_tiles_arena.png',
    type: 'tileset',
    frameWidth: 32,
    frameHeight: 32,
    frames: 64,
    columns: 8,
    category: 'tiles',
    ticket: 'GH-19',
  },

  // GH-20 Pickups
  sheet('gh_pickup_xp_small.png', 16, 4, 'pickup', 'GH-20'),
  sheet('gh_pickup_xp_medium.png', 16, 4, 'pickup', 'GH-20'),
  sheet('gh_pickup_xp_large.png', 16, 4, 'pickup', 'GH-20'),
  sheet('gh_pickup_rapidfire.png', 24, 4, 'pickup', 'GH-20'),
  sheet('gh_pickup_spread.png', 24, 4, 'pickup', 'GH-20'),
  sheet('gh_pickup_shield.png', 24, 4, 'pickup', 'GH-20'),
  sheet('gh_pickup_health.png', 24, 4, 'pickup', 'GH-20'),
  sheet('gh_pickup_bomb.png', 24, 4, 'pickup', 'GH-20'),
  sheet('gh_pickup_magnet.png', 24, 4, 'pickup', 'GH-20'),
  sheet('gh_fx_shield.png', 48, 4, 'fx', 'GH-20'),

  // GH-21 UI kit
  image('gh_ui_bar_frame.png', 200, 16, 'ui', 'GH-21'),
  image('gh_ui_bar_fill_hp.png', 196, 12, 'ui', 'GH-21'),
  image('gh_ui_bar_fill_xp.png', 196, 12, 'ui', 'GH-21'),
  image('gh_ui_icon_rapidfire.png', 16, 16, 'ui', 'GH-21'),
  image('gh_ui_icon_spread.png', 16, 16, 'ui', 'GH-21'),
  image('gh_ui_icon_shield.png', 16, 16, 'ui', 'GH-21'),
  image('gh_ui_icon_health.png', 16, 16, 'ui', 'GH-21'),
  image('gh_ui_icon_bomb.png', 16, 16, 'ui', 'GH-21'),
  image('gh_ui_icon_magnet.png', 16, 16, 'ui', 'GH-21'),
  image('gh_ui_card.png', 160, 220, 'ui', 'GH-21'),
  image('gh_ui_up_damage.png', 32, 32, 'ui', 'GH-21'),
  image('gh_ui_up_firerate.png', 32, 32, 'ui', 'GH-21'),
  image('gh_ui_up_multishot.png', 32, 32, 'ui', 'GH-21'),
  image('gh_ui_up_pierce.png', 32, 32, 'ui', 'GH-21'),
  image('gh_ui_up_movespeed.png', 32, 32, 'ui', 'GH-21'),
  image('gh_ui_up_maxhp.png', 32, 32, 'ui', 'GH-21'),
  image('gh_ui_up_pickup.png', 32, 32, 'ui', 'GH-21'),
  sheet('gh_ui_button.png', [160, 48], 3, 'ui', 'GH-21'),

  // GH-22 Title & game over
  image('gh_ui_logo.png', 480, 160, 'ui', 'GH-22'),
  image('gh_ui_title_bg.png', 960, 540, 'ui', 'GH-22'),
  image('gh_ui_gameover_panel.png', 400, 300, 'ui', 'GH-22'),
];

/** Look up an entry by key (throws on typos so they surface immediately). */
export function asset(key) {
  const entry = MANIFEST.find((e) => e.key === key);
  if (!entry) throw new Error(`Unknown asset key: ${key}`);
  return entry;
}

const isPosInt = (n) => Number.isInteger(n) && n > 0;

/**
 * Check a manifest for mistakes. Returns a list of human-readable errors
 * (empty when valid).
 * @param {Array<Record<string, any>>} [entries] entries to check; may be malformed (that's what this finds)
 * @returns {string[]}
 */
export function validate(entries = MANIFEST) {
  const errors = [];
  const seenKeys = new Map();
  const seenFiles = new Map();

  entries.forEach((e, i) => {
    const where = `entry ${i} (${e.key ?? e.file ?? '?'})`;

    if (!e.key) errors.push(`${where}: missing key`);
    else if (seenKeys.has(e.key)) errors.push(`duplicate key "${e.key}" (entries ${seenKeys.get(e.key)} and ${i})`);
    else seenKeys.set(e.key, i);

    if (!FILE_PATTERN.test(e.file ?? ''))
      errors.push(`${where}: file "${e.file}" does not match gh_<category>_<name>[_<anim>].png`);
    else if (seenFiles.has(e.file))
      errors.push(`duplicate file "${e.file}" (entries ${seenFiles.get(e.file)} and ${i})`);
    else seenFiles.set(e.file, i);

    if (!TYPES.includes(e.type)) errors.push(`${where}: unknown type "${e.type}"`);
    if (!CATEGORIES.includes(e.category)) errors.push(`${where}: unknown category "${e.category}"`);
    if (!isPosInt(e.frameWidth) || !isPosInt(e.frameHeight))
      errors.push(`${where}: frame size must be positive integers`);
    if (!isPosInt(e.frames)) errors.push(`${where}: frames must be an integer >= 1`);
    if (e.type === 'image' && e.frames !== 1) errors.push(`${where}: images have exactly 1 frame`);
    if (e.type === 'tileset' && (!isPosInt(e.columns) || e.frames % e.columns !== 0)) {
      errors.push(`${where}: tileset needs integer columns that divide frames`);
    }
  });

  return errors;
}
