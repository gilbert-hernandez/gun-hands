# Gun Hands: Art Spec

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
| GH-18  | `gh_fx_enemy_puff.png` | 32×32 | 6      | Enemy death poof                                                      |
| GH-18  | `gh_fx_bomb_blast.png` | 64×64 | 6      | Bomb powerup burst; gets scaled up, keep shapes chunky                |
| GH-18  | `gh_fx_levelup.png`    | 48×48 | 6      | Burst centered on the player                                          |

### GH-19: Arena tileset

One image on a 32×32 grid, **8 columns × 8 rows = 256×256 px**, with no spacing or margin (Tiled-ready). Leave unused cells transparent. Suggested layout: rows 1–2 floors and floor details, rows 3–4 walls and corners, row 5 obstacles (a 2×2 obstacle uses a 2×2 block of cells), row 6 walk-over props.

| Ticket | File                 | Size  | Frames | Notes                                                  |
| ------ | -------------------- | ----- | ------ | ------------------------------------------------------ |
| GH-19  | `gh_tiles_arena.png` | 32×32 | 64     | 8×8 grid of tiles (256×256 image); floors low-contrast |

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
| GH-21  | `gh_ui_bar_fill_hp.png`    | 196×12  | 1      | Sits 2 px inside the frame; stretched horizontally      |
| GH-21  | `gh_ui_bar_fill_xp.png`    | 196×12  | 1      | Sits 2 px inside the frame; stretched horizontally      |
| GH-21  | `gh_ui_icon_rapidfire.png` | 16×16   | 1      | HUD powerup icon                                        |
| GH-21  | `gh_ui_icon_spread.png`    | 16×16   | 1      | HUD powerup icon                                        |
| GH-21  | `gh_ui_icon_shield.png`    | 16×16   | 1      | HUD powerup icon                                        |
| GH-21  | `gh_ui_icon_health.png`    | 16×16   | 1      | HUD powerup icon                                        |
| GH-21  | `gh_ui_icon_bomb.png`      | 16×16   | 1      | HUD powerup icon                                        |
| GH-21  | `gh_ui_icon_magnet.png`    | 16×16   | 1      | HUD powerup icon                                        |
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

### GH-22: Title & game over

| Ticket | File                       | Size    | Frames | Notes                                                        |
| ------ | -------------------------- | ------- | ------ | ------------------------------------------------------------ |
| GH-22  | `gh_ui_logo.png`           | 480×160 | 1      | "Gun Hands" logo                                             |
| GH-22  | `gh_ui_title_bg.png`       | 960×540 | 1      | Opaque; leave the center clear for the logo and Start button |
| GH-22  | `gh_ui_gameover_panel.png` | 400×300 | 1      | Panel behind the run stats and Restart button                |

Optional (not loaded by the game): a 1200×630 social-preview image, attached to GH-22.
