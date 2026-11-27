# Design

## Context

See proposal.md (Why) for the review findings. Current state:

- `PreloadScene` loads every manifest entry whose PNG is in `src/assets/img/` and generates placeholders for the rest. The game code already uses the real keys, so most art "just appears" once the PNG is committed.
- Animations exist for player idle/run/death, enemy walk, bullet, gem and pickup shimmer, shield and bomb blast, at fps values in config. **Not used yet:** `player_body_hurt`, `player_guns_recoil`, `enemy_*_death`, `fx_impact`, `fx_levelup`, and the `ui_icon_*` icons for health, bomb and magnet. Only timed powerups show in the HUD, so those three icons stay unused; that's fine.
- Enemy deaths play `fx_enemy_puff` from a pool in `src/fx/Puffs.js`. `combat.spec` reads `combat.puffs.playing`.
- The arena map (60×40) is solid by layer (`walls.setCollisionByExclusion([-1])`). It uses tile ids from the old 8×8 layout: floor 0–3, generic wall 16, 2×2 obstacles 32/33/40/41, decor 48–51.
- The HUD fill sits `barInset` = 2 px inside the frame on both axes, and cropping (not stretching) sets the fill width.
- Measured sprite bounds (opaque pixels): the player body spans x 4–21 and y 1–29 in its 32×32 frame, but the hurtbox is x 8–24 and y 10–30. Grunt, Runner and Brute feet end at y 29/29/61, while their hurtboxes are bottom-aligned to 32/32/64.

## Goals / Non-Goals

**Goals:** after this change, the game loads with zero placeholders, every delivered sheet animates at david's timings, and the arena uses the real tileset. Collision and balance stay the same as on `master`.

**Non-Goals:** autotiling at runtime or a general map editor workflow; changing how collision is decided (it stays per layer, not per tile property); fonts (see proposal).

## Decisions

### 1. Frame times in ms, from david's notes
Config switches from fps to **ms per frame** (`frameMs`), because that's how david specified them and how they're easiest to check against his notes. A small shared helper `ensureAnim(scene, key, frameMs, { loop })` builds every animation with `frameRate = 1000 / frameMs`. It replaces the per-file `scene.anims.create` calls and the existing `ensureAnim` in `Player.js`.

| Sheet | ms | Sheet | ms |
|---|---|---|---|
| player idle / run / hurt / death | 160 / 90 / 90 / 120 | bullet / muzzle / impact | 60 / 40 / 50 |
| guns recoil | 50 | bomb blast / level-up | 80 / 90 |
| grunt walk / death | 110 / 110 | gems / pickups / shield | 120 / 140 / 100 |
| runner walk / death | 70 / 80 | brute walk / death | 150 / 130 |

*Alternative:* keep fps and convert. That's rejected: it leaves odd numbers like 6.25 fps in config.

**Consequences:**
- The player death becomes 720 ms (it was 600). GameOver still waits for the animation-complete event, so nothing else changes.
- The muzzle flash currently hides after `WEAPON.muzzleFlashMs`. It now hides when its 3-frame animation completes (120 ms), and `muzzleFlashMs` is removed.

### 2. Re-skin the map with a script, keep collision by layer
New `scripts/reskin-arena.js` (Node, no Phaser) reads the current `gh_arena.json` and the tile names (taken from david's `.tsx` and embedded in the map's tileset as Tiled `name` properties). It then rewrites the gids:

- **Border:** each cell's position picks `wall_nw/n/ne/w/e/sw/s/se`. The map border is 1 tile thick, so the inner corners and `wall_fill` aren't needed. The north edge alternates in one `wall_n_sign` and one `wall_n_dish` at fixed columns so it's not monotonous.
- **2×2 obstacles** (old ids 32/33/40/41 in a block) alternate between `obstacle_boulder_1..4` and `obstacle_mech_wreck_1..4`, in reading order.
- **Single interior wall cells** (old id 16: the L-shaped runs) alternate `obstacle_crate` / `obstacle_barrel` with a deterministic pattern by (col + row).
- **Floor** old 0–3 → `floor_1..4`, with the same cells. A seeded sprinkle of the detail tiles (crack, oil, tracks, plate, scorch, drift) goes on about 3% of floor cells under no wall.
- **Decor** old 48–51 → `prop_tumbleweed/skull/grass/bolts`, with the same cells.
- **Safety check:** before writing, the script checks that the set of non-empty `walls` cells and the spawn object are identical to the input. If they aren't, it exits non-zero.

Whole wall tiles stay solid, even where david drew only part of the tile (the north fence is 20 px deep). *Alternative:* `setCollisionByProperty({ collides: true })` plus trimmed bodies. That's rejected because it changes collision (a gameplay change), and the existing arena-map tests and e2e cover the per-layer rule.

*Alternative:* adopt david's 30×17 sample map. Rejected: it's a different arena size and layout, which is a gameplay change.

The script is idempotent: it uses old→new id maps plus names, and running it again on its own output gives the same output because it reads tile names, not raw ids. It's a dev tool only, not part of `npm run check`.

### 3. Hurtboxes: same size, moved onto the drawn body
- **Player:** `hurtbox` becomes `{ width: 16, height: 20, offsetX: 5, offsetY: 9 }`, which covers x 5–21 and y 9–29 when facing right. When facing left, the offset becomes `32 − 5 − 16 = 11`. `Player.update` re-applies the offset only when the facing changes. A pure helper `hurtboxOffsetX(facing, cfg, frame)` is unit-tested.
- **Enemies:** add `footGap` per type (grunt 2, runner 2, brute 2 px). Their bodies stay bottom-aligned but end at `size − footGap`. Horizontal centering already matches the art (grunt 5–26, brute 7–57). Enemy art is drawn roughly symmetric about the center, so the offset doesn't need mirroring.
- **Bullet:** the circle body radius stays. The 8×8 art's slug is centered (y 1–6), so nothing changes.

### 4. Death animations reuse the puff pool
`src/fx/Puffs.js` becomes `src/fx/Deaths.js`: a pool of plain sprites with `play(typeId, x, y, flipX)` that plays `enemy_<type>_death` once at scale 1 and hides on complete. `combat.puffs` is renamed `combat.deaths` (and `COMBAT.puffPoolSize` becomes `deathPoolSize`), and `e2e/combat.spec.js` is updated in the same change to check that a death animation plays.

`fx_enemy_puff` is still loaded but no longer played. david said to use whichever effect reads better, and the per-type deaths do. It's left for GH-13 to use as dust, and it's marked "reserved" in ASSETS.md.

The death sprite's position: enemy sprites are centered on `(x, y)` and the death frames are the same size, so `(enemy.x, enemy.y)` is used directly.

### 5. Impact sparks and level-up burst
- **Impact:** a pool of `fx_impact` sprites (pool size in `COMBAT.impactPoolSize`, 24). It's triggered from `Combat.onBulletHit` (at the bullet position) and from the `BULLET_WALL` handler in `GameScene` (at the bullet's `body.center`, which is more accurate than `b.x` on the collide step). When the pool is exhausted, the spark is skipped.
- **Level-up:** one `fx_levelup` sprite on the Game scene (depth 1.2: above the body and guns, below the bomb blast at 1.6). It's played on `PLAYER_LEVELED` and positioned in the same `POST_UPDATE` sync as the guns and shield aura. Game is paused for LevelUp right after the event, so the animation holds and plays out on resume, which is what the spec asks for.

### 6. Hurt and recoil
- **Hurt:** when `takeDamage` survives, `Player` sets `hurtMs = 2 × 90`. While `hurtMs > 0`, `update()` plays `player_body_hurt` instead of run/idle (the frame time is counted on scene `delta`, like the other combat timers). `die()` clears it.
- **Recoil:** on each shot that isn't blocked, `guns.play('player_guns_recoil')` is called without `ignoreIfPlaying`, so it restarts. On complete, the guns `setTexture('player_guns_idle')`.

### 7. UI layout from david's notes
These are all config-only changes:

- **HUD:** `barInset` becomes `{ x: 18, y: 4 }`, and the fills' full width is 174. Text placement keys off the frame width (200), so it's unchanged.
- **LevelUp card:** icon at top-left (64, 30), so its center offset is `y: −64` at scale 1. david sized the window for a 32 px icon, so **icon scale drops from 2 to 1**. Name at `y: −10` (the divider at 100 from the top), text at `y: 10` (the 110–190 band). The touch block scales the same offsets by its `cardScale` of 1.5: icon `y: −96` at scale 1.5, name `y: −15`, text `y: 15`.
- **Title:** `logoY` 140 (center of a 480×160 logo at top 60), `startY` 286 (button top 262), `hintY` stays 400 over the ground. These are checked on the real background in the browser.
- **GameOver:** panel center 270 (top 120). `titleY` 156 (band 16–56), stats centered in the 56–214 band (`statsY` 255), and buttons centered in the band below 214 (`buttonsY` 377). Touch keeps buttons below the panel.
- `TitleScene` and `GameOverScene` keep their placeholder branches (text logo, tinted panel), so the scenarios for missing art still hold.

### 8. Placeholders for the new tileset shape
`TILE_ROW_COLORS` described the old row roles. With david's mixed rows, the placeholder tileset becomes a plain 8×6 checker in the tiles color. It's only seen if the PNG is missing, which can't happen after this change (the new unit test requires every PNG). The test for row colors is updated accordingly.

### 9. Health art re-delivery
The current `gh_pickup_health.png` and `gh_ui_icon_health.png` are committed now (correct size, wrong meaning). When david re-delivers them on GH-20/21, the files are swapped with no code change. If that happens after this change is archived, it's a one-commit art drop on `master` referencing GH-20.

## Risks / Trade-offs

- **[Mirroring the hurtbox offset can push the body 6 px into a wall when turning while flush against it]** → Arcade separation resolves overlap on the next step. Add an e2e check: flush against the west wall, turn around, and the hurtbox never overlaps a solid tile for more than one step. If that's unreliable, fall back to a centered offset (8) and accept 3–4 px of misalignment.
- **[Inlined data-URL PNGs]** → Vite inlines files under 4 KB. Phaser's loader handles data URLs, and the existing GH-29 sounds already go through the same path. Verify with `npm run build && npm run preview`.
- **[e2e timing changes]** → Tests that wait on the death animation or muzzle hide (`muzzleFlashMs`) need updating. Death goes from 600 to 720 ms, so GameOver tests wait on `GameOver.ready`, as they already do.
- **[Fill crop with a narrower fill]** → Rounding at 174 px differs from 196. `hud.spec` asserts relative widths via `fullFill`, so it adapts.
- **[Partly drawn wall tiles look like an invisible barrier]** (the player stops 12 px short of the drawn north fence) → accepted for the demo. Noted for a later collision pass.
- **[Health token reads as "extra life" until re-delivered]** → tracked on GH-20/21. Check before tagging v0.3.0.

## Migration Plan

This is a straight merge: there's no saved data or API, and rolling back is reverting the merge. ASSETS.md changes the GH-19 and GH-21 sections to "as delivered", so david's future edits follow the new layout.
