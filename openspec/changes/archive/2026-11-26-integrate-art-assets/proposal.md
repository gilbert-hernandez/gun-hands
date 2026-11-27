# Proposal

## Why

david has delivered the real art for every Art ticket (GH-16 to GH-22), and the game still draws generated placeholders. This change swaps them in, so v0.3.0 / the 12/6 demo looks like the game. Vikunja: **GH-12**.

The art arrived early (11/26 instead of 12/4), and a review found three differences from the plan. GH-12 handles two of them in code. The third goes back to david, because the rule for the demo is **no gameplay changes**: when the art and the game disagree, the art is corrected.

- **Tileset layout:** `gh_tiles_arena.png` is 8×6 (48 tiles) in david's own order, not the 8×8 layout in ASSETS.md. It also has proper edge, corner and obstacle tiles that the old map can't use, so we re-skin the map instead of asking for a redraw.
- **Bar fills:** they are 174×8 and sit at (18, 4) inside the frame, not 196×12 at 2 px.
- **Pickups (back to david):** extra `power`/`pierce`/`speed` pickups, and a health token drawn as "extra life". A change request is on GH-20 and GH-21. Those extra files are not integrated, and the health art is swapped in when it is re-delivered.

## What Changes

- Commit the delivered PNGs under `src/assets/img/` (every manifest entry, nothing else) and add a unit test that checks each PNG's pixel size against its manifest entry.
- Update the manifest and ASSETS.md for the delivered sizes: tileset 8 columns × 6 rows (48 tiles), bar fills 174×8. Document the GH-19 layout as delivered.
- Re-skin `gh_arena.json` with david's tileset. It keeps exactly the same solid cells, spawn and size, so movement, collision and spawning don't change. The border gets matching edge and corner tiles, interior wall runs become crates and barrels, 2×2 obstacles become boulders and the wrecked robot head, and floor and decor use the new variants. A script does this, so it can be repeated.
- Animate everything that was delivered, with david's suggested frame times (ms per frame in config): player idle/run/**hurt**/death, gun **recoil**, enemy walk and **per-type death**, bullet, muzzle, **impact**, bomb blast, **level-up burst**, gem and pickup shimmer, shield bubble. The bold ones are new to the game.
  - **Enemy death:** each type's own death animation replaces the generic puff (the Runner's is its explosion). It is visual only; the enemy still leaves play that frame.
  - **Impact sparks** play where a bullet hits an enemy or a wall. **Level-up burst** plays on the player when they level up. **Hurt** plays when the player takes a hit.
- Align hitboxes with the real sprites **without changing their sizes**. The player's hurtbox moves onto the drawn body (about 3 px left of the frame center) and mirrors when facing left. Enemy hurtboxes end at the drawn feet (2–3 px above the frame bottom).
- Lay out the UI to david's art notes: HUD fill slot (18, 4), card icon, title and text positions, Title logo and Start button, GameOver title, stats and button bands.
- Visual check at 1× and 2× zoom: no blurring and no bleeding between frames.

## Non-goals

- **No gameplay changes:** speeds, HP, damage, hurtbox sizes, drop tables, powerup set and effects stay as they are. The Runner's death stays an explosion in looks only; splash damage is a later idea, not part of this change.
- The `gh_pickup_power/pierce/speed` and `gh_ui_icon_power/pierce/speed` files are not committed (withdrawn in the GH-20/21 change request).
- **Fonts** (Press Start 2P, m6x11) are not included. They change every text size and layout, and m6x11's licence terms still need checking before bundling it in a public repo. That's a follow-up ticket; text stays `monospace`.
- The 1200×630 social-preview image belongs to the deploy ticket (GH-14).
- Screen shake, hit-stop and other juice stay in GH-13.
- david's source files (`gh_GH-*_sources.zip`, `.aseprite`) stay on the Art tickets; they are not committed.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `assets`: delivered art must match its manifest entry, and every animated sheet gets an animation with a configured frame time.
- `arena-map`: the tileset is 8×6 (48 tiles), and the map is dressed with edge, corner and obstacle tiles while keeping the same solid cells.
- `combat`: enemy death plays the type's death animation instead of the generic puff; bullet hits show impact sparks; the player plays a hurt animation on a hit.
- `player-movement`: the hurtbox stays on the drawn body when the player faces left.
- `player-shooting`: the muzzle flash is real art, and the guns play a recoil animation on each shot.
- `xp-leveling`: a level-up burst plays around the player.

## Impact

- **Assets:** `src/assets/img/*.png` (50 files, about 170 KB), `src/assets/manifest.js`, `src/assets/placeholders.js` (tileset rows), `ASSETS.md`, `src/assets/maps/gh_arena.json`, new `scripts/reskin-arena.js`.
- **Code:** `src/player/Player.js`, `src/enemy/Enemy.js`, `src/fx/Puffs.js` (becomes the death-animation pool), new pooled impact FX, `src/combat/Combat.js`, `src/scenes/GameScene.js`, `src/scenes/UIScene.js`, `src/scenes/LevelUpScene.js`, `src/scenes/TitleScene.js`, `src/scenes/GameOverScene.js`.
- **Config:** `player.js`, `enemies.js`, `hud.js`, `flow.js`, `upgrades.js` (layout), `combat.js`, `xp.js`, `powerups.js` (frame times).
- **Tests:** `tests/manifest.test.js`, `tests/arenaMap.test.js`, `tests/placeholders.test.js`, and e2e specs that read puffs, fill widths or layout (`combat`, `hud`, `levelup`, `flow`).
- **Build size:** the bundle grows by about 170 KB. Most sprites are under Vite's 4 KB inline limit, so they are inlined into the JS as data URLs (fewer requests). Phaser loads data URLs normally.
- **No new dependencies.**
