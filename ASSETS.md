# Gun Hands: Asset Spec

This is the technical spec for every graphic in the game. Each Art ticket (GH-16 to GH-22) points here. If a ticket and this file disagree, **this file wins**. Tell Gilbert, and one of them gets fixed.

> The game already runs without any art: every missing file is replaced by a colored placeholder of the right size. Deliver files in any order.

## Export conventions

- **Style:** top-down 3/4 pixel art on a 32 px grid. The palette and look come from GH-15 (the style guide).
- **Format:** PNG, transparent background (only `gh_ui_title_bg.png` is opaque). Export at **1× (100%)**. No scaling, no smoothing or anti-aliasing on resize, no color profile.
- **Sprite sheets:** one **horizontal row** of frames, all the same size, with **no padding, spacing, or margin**. Sheet width = frame width × frames. Example: `gh_player_body_run.png` is 6 frames of 32×32, so it's **192×32**.
- **Facing:** characters face **right** (the game mirrors them for left). Guns, bullets, and muzzle flashes **point right** (the game rotates them).
- **Pivot:** the game treats the **center of each frame** as the pivot unless the notes say otherwise. Keep characters centered in their frames, with feet near the bottom, and in the same place on every frame so the animation doesn't jitter.
- **Hit flashes:** don't draw them. The game tints sprites white when they get hit.
- **File names:** exactly as listed below: lowercase, `gh_<category>_<name>_<anim>.png`. A misspelled file is silently ignored, and the placeholder stays.
- **Frame counts:** where an Art ticket says "4–6f", deliver the count listed here. If you end up with fewer frames, that's fine (the game reads the frame count from the image width), but please mention it on the ticket.

## Where files go

Final PNGs live in **`src/assets/img/`** (not `public/`). Reload the game and the real art replaces the placeholder automatically. Source files (`.psd`, `.ai`, `.ase`) stay out of the repo, or go in `art/` if you want them versioned.

## Delivery steps

1. Export each file with the exact name and size from the tables below.
2. Attach the PNGs (and the source file, if you like) to the Art ticket in Vikunja.
3. Move the ticket to **Review**.
4. Gilbert copies the files into `src/assets/img/` and checks them in the game. The dev console lists every key that's still a placeholder.

## Asset list

Sizes are **per frame** (W×H). "Frames" is the number of frames in the strip.

### GH-16: Player

| Ticket | File                        | Size  | Frames | Notes                                                                    |
| ------ | --------------------------- | ----- | ------ | ------------------------------------------------------------------------ |
| GH-16  | `gh_player_body_idle.png`   | 32×32 | 4      | Body only, faces right; arms off or tucked                               |
| GH-16  | `gh_player_body_run.png`    | 32×32 | 6      | Faces right                                                              |
| GH-16  | `gh_player_body_hurt.png`   | 32×32 | 2      | Faces right                                                              |
| GH-16  | `gh_player_body_death.png`  | 32×32 | 6      | Faces right; last frame is held                                          |
| GH-16  | `gh_player_guns_idle.png`   | 32×32 | 1      | Gun hands only, point right; pivot = frame center (where guns meet body) |
| GH-16  | `gh_player_guns_recoil.png` | 32×32 | 3      | Same pivot as guns idle                                                  |

### GH-17: Enemies

| Ticket | File                        | Size  | Frames | Notes                                                            |
| ------ | --------------------------- | ----- | ------ | ---------------------------------------------------------------- |
| GH-17  | `gh_enemy_grunt_walk.png`   | 32×32 | 6      | Baseline chaser; faces right                                     |
| GH-17  | `gh_enemy_grunt_death.png`  | 32×32 | 6      | Faces right                                                      |
| GH-17  | `gh_enemy_runner_walk.png`  | 32×32 | 6      | Fast, small, fragile; faces right; noticeably smaller silhouette |
| GH-17  | `gh_enemy_runner_death.png` | 32×32 | 6      | Faces right                                                      |
| GH-17  | `gh_enemy_brute_walk.png`   | 64×64 | 6      | Big, slow, tanky; faces right                                    |
| GH-17  | `gh_enemy_brute_death.png`  | 64×64 | 6      | Faces right                                                      |

### GH-18: Projectiles & combat FX

| Ticket | File                   | Size  | Frames | Notes                                                                 |
| ------ | ---------------------- | ----- | ------ | --------------------------------------------------------------------- |
| GH-18  | `gh_fx_bullet.png`     | 8×8   | 2      | Player bullet, points right; pivot = center                           |
| GH-18  | `gh_fx_muzzle.png`     | 16×16 | 3      | Muzzle flash, points right; pivot = left-center (attaches to gun tip) |
| GH-18  | `gh_fx_impact.png`     | 16×16 | 4      | Spark on wall/enemy hit                                               |
| GH-18  | `gh_fx_enemy_puff.png` | 32×32 | 6      | Generic death poof; reserved (enemies play their own GH-17 deaths)    |
| GH-18  | `gh_fx_bomb_blast.png` | 64×64 | 6      | Bomb powerup burst; gets scaled up, keep shapes chunky                |
| GH-18  | `gh_fx_levelup.png`    | 48×48 | 6      | Burst centered on the player                                          |

### GH-19: Arena tileset

One image on a 32×32 grid, **8 columns × 6 rows = 256×192 px**, with no spacing or margin (Tiled-ready). This is the layout david delivered (GH-19, 2026-11-26). The arena map refers to tiles by these ids, so **keep each tile where it is** when you edit the image. New tiles go in the empty cells (40–45) or in a new row at the bottom; tell Gilbert, so the map and this table get updated.

| Ids   | Tiles (by `name`)                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0–7   | `floor_1`–`floor_5`, `floor_crack`, `floor_oil`, `floor_tracks`                                                               |
| 8–15  | `wall_nw`, `wall_n`, `wall_ne`, `wall_inner_nw`, `wall_inner_ne`, `floor_plate`, `floor_scorch`, `floor_drift`                |
| 16–23 | `wall_w`, `wall_fill`, `wall_e`, `wall_inner_sw`, `wall_inner_se`, `wall_n_sign`, `obstacle_boulder_1`, `_2`                  |
| 24–31 | `wall_sw`, `wall_s`, `wall_se`, `obstacle_crate`, `obstacle_barrel`, `wall_n_dish`, `obstacle_boulder_3`, `_4`                |
| 32–39 | `prop_tumbleweed`, `prop_skull`, `prop_grass`, `prop_bolts`, `prop_shells`, `prop_neon_shards`, `obstacle_mech_wreck_1`, `_2` |
| 40–47 | empty (40–45), `obstacle_mech_wreck_3`, `_4`                                                                                  |

2×2 obstacles: the boulder is 22, 23 (top) and 30, 31 (bottom); the mech wreck is 38, 39 (top) and 46, 47 (bottom). Tile names are kept in the map's tileset (and in david's `gh_tiles_arena.tsx` on GH-19). Whether a tile blocks movement is set by the map layer it sits on, not by the tile, so decor can never become a wall by accident. `scripts/reskin-arena.js` re-dresses the map from these names.

| Ticket | File                 | Size  | Frames | Notes                                                  |
| ------ | -------------------- | ----- | ------ | ------------------------------------------------------ |
| GH-19  | `gh_tiles_arena.png` | 32×32 | 48     | 8×6 grid of tiles (256×192 image); floors low-contrast |

### GH-20: Pickups

| Ticket | File                      | Size  | Frames | Notes                                                             |
| ------ | ------------------------- | ----- | ------ | ----------------------------------------------------------------- |
| GH-20  | `gh_pickup_xp_small.png`  | 16×16 | 4      | Shimmer; common tier, own color                                   |
| GH-20  | `gh_pickup_xp_medium.png` | 16×16 | 4      | Shimmer; own color                                                |
| GH-20  | `gh_pickup_xp_large.png`  | 16×16 | 4      | Shimmer; own color                                                |
| GH-20  | `gh_pickup_rapidfire.png` | 24×24 | 4      | Bob/glow; bright outline                                          |
| GH-20  | `gh_pickup_spread.png`    | 24×24 | 4      | Bob/glow; bright outline                                          |
| GH-20  | `gh_pickup_shield.png`    | 24×24 | 4      | Bob/glow; bright outline                                          |
| GH-20  | `gh_pickup_health.png`    | 24×24 | 4      | Bob/glow; bright outline                                          |
| GH-20  | `gh_pickup_bomb.png`      | 24×24 | 4      | Bob/glow; bright outline                                          |
| GH-20  | `gh_pickup_magnet.png`    | 24×24 | 4      | Bob/glow; bright outline                                          |
| GH-20  | `gh_fx_shield.png`        | 48×48 | 4      | Shield bubble around the player; semi-transparent; pivot = center |

### GH-21: UI kit

UI images are single images (1 frame) unless noted. The game runs at 960×540.

| Ticket | File                       | Size    | Frames | Notes                                                   |
| ------ | -------------------------- | ------- | ------ | ------------------------------------------------------- |
| GH-21  | `gh_ui_bar_frame.png`      | 200×16  | 1      | Frame for the HP and XP bars                            |
| GH-21  | `gh_ui_bar_fill_hp.png`    | 174×8   | 1      | Fill slot at x=18, y=4 in the frame; cropped by width   |
| GH-21  | `gh_ui_bar_fill_xp.png`    | 174×8   | 1      | Fill slot at x=18, y=4 in the frame; cropped by width   |
| GH-21  | `gh_ui_icon_rapidfire.png` | 16×16   | 1      | HUD powerup icon                                        |
| GH-21  | `gh_ui_icon_spread.png`    | 16×16   | 1      | HUD powerup icon                                        |
| GH-21  | `gh_ui_icon_shield.png`    | 16×16   | 1      | HUD powerup icon                                        |
| GH-21  | `gh_ui_card.png`           | 160×220 | 1      | Upgrade card frame; game draws the icon and text on top |
| GH-21  | `gh_ui_up_damage.png`      | 32×32   | 1      | Upgrade icon                                            |
| GH-21  | `gh_ui_up_firerate.png`    | 32×32   | 1      | Upgrade icon                                            |
| GH-21  | `gh_ui_up_multishot.png`   | 32×32   | 1      | Upgrade icon                                            |
| GH-21  | `gh_ui_up_pierce.png`      | 32×32   | 1      | Upgrade icon                                            |
| GH-21  | `gh_ui_up_movespeed.png`   | 32×32   | 1      | Upgrade icon                                            |
| GH-21  | `gh_ui_up_maxhp.png`       | 32×32   | 1      | Upgrade icon                                            |
| GH-21  | `gh_ui_up_pickup.png`      | 32×32   | 1      | Upgrade icon (pickup radius)                            |
| GH-21  | `gh_ui_button.png`         | 160×48  | 3      | Frames: normal, hover, pressed (sheet is 480×48)        |

Font: recommend a free pixel font in a comment on GH-21.

The HUD shows icons only for timed powerups. The instant-powerup icons (`gh_ui_icon_health.png`, `gh_ui_icon_bomb.png`, `gh_ui_icon_magnet.png`) were delivered, but the game never displayed them, so they're kept in `art/unused/` and aren't loaded (GH-31).

### GH-22: Title & game over

| Ticket | File                       | Size    | Frames | Notes                                                        |
| ------ | -------------------------- | ------- | ------ | ------------------------------------------------------------ |
| GH-22  | `gh_ui_logo.png`           | 480×160 | 1      | "Gun Hands" logo                                             |
| GH-22  | `gh_ui_title_bg.png`       | 960×540 | 1      | Opaque; leave the center clear for the logo and Start button |
| GH-22  | `gh_ui_gameover_panel.png` | 400×300 | 1      | Panel behind the run stats and Restart button                |

Optional (not loaded by the game): a 1200×630 social-preview image, attached to GH-22.

## Audio

Sound effects come from GH-28: one WAV per sound, made in the Arcade sound editor (`/sfx`) and exported as `gun-hands-sfx.zip`. The source library is `assets-src/sfx/gun-hands.sfx.json` (import it into `/sfx` to audition or tweak). Like the art, nothing waits on these files: a missing sound plays nothing, and the dev console lists every missing slug.

- **Where files go:** `src/assets/sfx/<slug>.wav`. Keep `sounds.json` beside them for reference and leave out `sounds.js`, because the game doesn't use it.
- **Names:** the slug is the audio key in code, so file names must match the table exactly. A misspelled file is ignored (`tests/audioConfig.test.js` fails on it).
- **Levels:** frequent sounds (`shoot`, `enemy-hit`, `bullet-wall`, `xp-pickup`, `ui-hover`) stay quiet and short. The game also throttles them and sets per-sound volume in `src/config/audio.js`.

### Delivery steps

1. In `/sfx` (or with the arcade-sfx MCP), keep one preset per slug in the **Gun Hands** project and export the project ZIP.
2. Attach the ZIP and the library JSON to the audio ticket in Vikunja and move it to **Review**.
3. Gilbert unzips it into `src/assets/sfx/`, deletes `sounds.js`, and checks the sounds in the game.

| Slug             | Trigger                                         | Notes                                                          |
| ---------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| `shoot`          | every shot fired                                | very short and quiet; it plays constantly                      |
| `bullet-wall`    | bullet hits a wall, or a shot is blocked by one | soft tick                                                      |
| `enemy-hit`      | bullet damages an enemy (not a killing hit)     | short, punchy                                                  |
| `enemy-die`      | Grunt or Runner dies                            |                                                                |
| `brute-die`      | Brute dies                                      | heavier/lower version of `enemy-die`                           |
| `player-hurt`    | player takes damage and survives                | clearly different from `enemy-hit`                             |
| `player-die`     | player dies                                     | longer, falling                                                |
| `xp-pickup`      | XP gems collected                               | tiny blip; the game raises the pitch on quick pickups in a row |
| `level-up`       | level gained                                    | bright rising jingle                                           |
| `card-pick`      | upgrade card chosen                             |                                                                |
| `powerup-pickup` | Rapid Fire, Spread Shot or Magnet collected     |                                                                |
| `heal`           | Health Pack collected                           |                                                                |
| `shield-up`      | Shield collected                                |                                                                |
| `shield-block`   | the shield absorbs an enemy contact             |                                                                |
| `bomb`           | Bomb collected                                  | big boom                                                       |
| `powerup-expire` | a timed powerup runs out                        | soft down-blip                                                 |
| `ui-hover`       | pointer moves onto a menu button                | very subtle                                                    |
| `ui-click`       | menu button pressed                             |                                                                |
| `game-start`     | session started from the title screen           |                                                                |
| `game-over`      | game over screen appears                        |                                                                |
