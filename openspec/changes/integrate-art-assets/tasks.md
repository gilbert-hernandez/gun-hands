# Tasks

## 1. Art files and manifest

- [ ] 1.1 Copy the 51 delivered PNGs that have manifest entries from the GH-16 to GH-22 attachments into `src/assets/img/` (not the previews, mocks, sources zips, `gh_pickup_power/pierce/speed` or `gh_ui_icon_power/pierce/speed`). Verify `ls src/assets/img/*.png | wc -l` is 51.
- [ ] 1.2 Update `src/assets/manifest.js`: the tileset becomes 8 columns × 6 rows (48 tiles), and the bar fills become 174×8. Update ASSETS.md to match: the GH-19 section documents the delivered 8×6 layout with tile names, GH-21 documents the 174×8 fills at slot (18, 4), and `fx_enemy_puff` is marked reserved. Verify `tests/manifest.test.js` passes.
- [ ] 1.3 Add a unit test in `tests/manifest.test.js` that reads each PNG header in `src/assets/img/` and checks its size against its manifest entry (sheet, image and tileset rules), and that fails on any `gh_*.png` with no entry, naming the file and both sizes. Verify that it passes and that it fails when a test copy of a file is the wrong size.
- [ ] 1.4 Replace `TILE_ROW_COLORS` in `src/assets/placeholders.js` with a plain checker for the 8×6 tileset and update `tests/placeholders.test.js`. Verify `npm test` passes and the dev console shows no placeholder warning on `npm run dev`.

## 2. Arena re-skin

- [ ] 2.1 Write `scripts/reskin-arena.js`, following design decision 2: embed tile names from david's `.tsx` in the map tileset (tilecount 48, imageheight 192), and do the border edges and corners, north-wall sign and dish, boulders and wrecks for 2×2 obstacles, crates and barrels for single cells, floor variants plus a seeded detail sprinkle, and the decor mapping. It must exit non-zero without writing if the solid cells or spawn change. Run it, commit the new `gh_arena.json`, and verify that a second run produces no diff.
- [ ] 2.2 Update `tests/arenaMap.test.js`: 48 tiles in the structure test, plus new tests for corner and edge tiles, whole 2×2 obstacles, and that every layer uses its own tile kinds (by tile name). Verify `npm test` passes, including the existing border, obstacle-group, flood-fill and spawn tests. Confirm the map still opens in Tiled if it is installed; otherwise the browser check in 7.3 covers it.
- [ ] 2.3 Verify `npx playwright test e2e/arena.spec.js e2e/movement.spec.js e2e/enemies.spec.js` passes unchanged.

## 3. Animation timings

- [ ] 3.1 Add a shared `ensureAnim(scene, key, frameMs, { loop })` helper (in `src/fx/anims.js`). Move every animation's timing to `frameMs` in config, using the design's table: `PLAYER.anims`, `ENEMIES.types.*.walkMs/deathMs`, the bullet, muzzle, impact, bomb and level-up in `WEAPON`/`COMBAT`/`POWERUPS`/`XP`, and the gems, pickups and shield. Then switch Player, Enemy, Bullets, Gems, Pickups and Powerups to the helper. Add unit tests that every config `frameMs` is a positive integer, and that each referenced sheet key exists in the manifest. Verify `npm test` passes.
- [ ] 3.2 Make the muzzle flash hide when its animation completes, and remove `WEAPON.muzzleFlashMs`. Update `e2e/shooting.spec.js` if it waited on `muzzleFlashMs`. Verify `npx playwright test e2e/shooting.spec.js` passes.

## 4. Player: hurt, recoil, hurtbox

- [ ] 4.1 Change the player hurtbox to offset (5, 9), size unchanged. Add a pure helper `hurtboxOffsetX(facing, cfg, frameW)` with a unit test (right → 5, left → 11), and re-apply it in `Player.update` when the facing changes. Extend `e2e/movement.spec.js`: turning left sets the body offset to 11 with the same size, and turning while flush against the west wall never leaves the hurtbox overlapping a solid tile after the next step. Verify `npx playwright test e2e/movement.spec.js e2e/arena.spec.js` passes 3 runs in a row.
- [ ] 4.2 Add the hurt animation: a non-lethal `takeDamage` starts `hurtMs` (2 × hurt frame time, counted on scene delta), `update()` plays `player_body_hurt` while it lasts, and `die()` clears it. Add e2e tests in `e2e/combat.spec.js`: a hit plays hurt and then idle, `invulnerableMs` is unchanged from before, and a killing hit plays death, not hurt. Wait on `hurtMs === 0`, not on loop time (see the GH-6 timing note). Verify they pass.
- [ ] 4.3 Add recoil: each unblocked shot restarts `player_guns_recoil` on the guns, and on complete they go back to `player_guns_idle`. Add an e2e test in `e2e/shooting.spec.js`: record `guns.play` calls in the page, fire one shot, then stop. Recoil plays once and the guns end on the idle texture, and at 2× fire rate the fired-event count per second is unchanged. Verify it passes.

## 5. Enemy deaths, sparks, level-up burst

- [ ] 5.1 Replace `src/fx/Puffs.js` with `src/fx/Deaths.js` (a pool that plays `enemy_<type>_death`, mirrored to the enemy's `flipX`). Rename `combat.puffs` to `combat.deaths` and `puffPoolSize` to `deathPoolSize`. Update `e2e/combat.spec.js`: the kill test checks the Grunt death animation plays at the enemy's position, an enemy walking left dies mirrored, a Runner death changes no HP, and the pool-exhausted test still counts every death. Verify `npx playwright test e2e/combat.spec.js` passes 3 runs in a row.
- [ ] 5.2 Add enemy `footGap` (2 px each) to `ENEMIES.types`, so the hurtboxes end at the drawn feet, and update `tests/enemiesConfig.test.js`: the hurtbox plus foot gap fits the sprite. Verify `npm test` and `npx playwright test e2e/enemies.spec.js e2e/combat.spec.js` pass.
- [ ] 5.3 Add pooled impact sparks (`COMBAT.impactPoolSize` 24), played from `Combat.onBulletHit` (at the bullet position) and the `BULLET_WALL` handler (at `body.center`). Add e2e tests: a wall hit and an enemy hit each start one spark at the hit point, and exhausting the pool raises no error and still counts the hits. Verify they pass.
- [ ] 5.4 Add the level-up burst: one `fx_levelup` sprite at depth 1.2, played on `PLAYER_LEVELED` and synced to the player in `POST_UPDATE`. Add an e2e test in `e2e/levelup.spec.js`: after a debug level-up and a card pick, the burst is visible and playing on resume, centered on the player, and hidden after it completes. Verify `npx playwright test e2e/levelup.spec.js e2e/xp.spec.js` passes.

## 6. UI layout

- [ ] 6.1 HUD: change `barInset` to `{ x: 18, y: 4 }`, and update `UIScene` and `tests/hudConfig.test.js`. Verify `npx playwright test e2e/hud.spec.js e2e/mobile.spec.js` passes (`fullFill` = 174).
- [ ] 6.2 LevelUp card: icon at `y: −64`, scale 1; name at `y: −10`; text at `y: 10`; touch values scaled by 1.5 (design 7). Update `tests/upgradesConfig.test.js` if it checks the layout. Verify `npx playwright test e2e/levelup.spec.js e2e/mobile.spec.js` passes, and take a screenshot of the card in desktop and touch modes to check that the icon sits in the card window and the text stays inside the frame.
- [ ] 6.3 Title and GameOver: Title `logoY` 140, `startY` 286; GameOver `titleY` 156, `statsY` 255, `buttonsY` 377, touch buttons below the panel. Update `tests/flowConfig.test.js` and `tests/layout.test.js`. Verify `npx playwright test e2e/flow.spec.js e2e/mobile.spec.js` passes (including "version label doesn't overlap"), and take screenshots of both screens on desktop and the mobile project to check against `gh_title_mock.png` / `gh_gameover_mock.png`.

## 7. Integration check

- [ ] 7.1 Run `npm run check`, `npm run e2e` (with no SplatAttack run in parallel) and `npm run build`. Serve `dist/` from a sub-path with `npm run preview` and confirm that all 51 textures load with no placeholder warning (use a dev-mode build probe for the warning). Note the `dist/` size change in the PR or commit message.
- [ ] 7.2 Visual check at 1× and 2× zoom (desktop, and the mobile project for 2×): look for blurring or half-pixel smearing, and for bleeding between frames on every sheet (especially bullet, impact, muzzle and the 64×64 Brute). If any is found, fix it and re-check. Record a run with `npm run record -- videos/gh-12.webm 45` and attach it to GH-12 with a comment listing the file.
- [ ] 7.3 Manual check in the browser (`npm run dev`):
  - Title shows the dusk background, logo over the sun, and Start on the fence line.
  - The arena has fence corners, crates, barrels, boulders and wrecks, and the player and enemies collide exactly as before.
  - The player animates idle, run, hurt and death; the guns rotate, flip on the left and recoil; the hurtbox looks right in the physics debug view (`DEBUG.physics`) when facing both ways.
  - Grunt, Runner and Brute walk and play their own deaths (the Runner explodes but doesn't hurt anything).
  - Bullet, muzzle and impact sparks all show; P-key powerups show their tokens, the shield bubble and the bomb blast; gems shimmer.
  - Level-up plays the burst after the card pick, and cards show the icon in the window.
  - The HUD fills sit inside the cartridge frame and drain smoothly.
  - GameOver stats and buttons sit in the panel bands.
  - The health token still shows the old "+1" art until david re-delivers it (check GH-20).
