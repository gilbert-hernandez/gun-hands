# Tasks

## 1. Config and pure weapon math

- [ ] 1.1 Add `src/config/weapon.js` (`WEAPON.fireRate`, `muzzleOffset`, `poolSize`, `muzzleFlashMs`, `bullet {speed, damage, lifetime, pierce, count, spreadDeg}`) and export it from `src/config/index.js`; verify `npm run typecheck` and `npm run build` succeed
- [ ] 1.2 Add `src/weapon/aim.js` with `aimAngle`, `spreadAngles`, `shotsDue` (accumulator clamped to 2 intervals), `applyHit`, and `gunsFlipY`; add `tests/aim.test.js` covering: angles in all four quadrants and the coincident-point fallback, count 1 ignores spread, count 3 / 30° gives −15°/0/+15°, 4 shots/s over 1000 ms of 16 ms frames gives 4 shots, a 5000 ms frame gives at most 2 shots, pierce 1 survives one hit then dies, pierce 0 dies, flip only beyond ±90°; verify `npm test` passes

## 2. Bullet pool

- [ ] 2.1 Add `src/weapon/Bullets.js`: `Bullet` sprite class (`fire`, `update` despawning on lifetime or leaving world bounds, `hit`, `despawn`) and a `Bullets` wrapper around an Arcade group with `maxSize = WEAPON.poolSize`, `runChildUpdate`, and a `fire(x, y, angle, stats, now)` that returns `null` when the pool is exhausted; bullets loop the `fx_bullet` animation; verify `npm run check` passes and the Game scene loads with no console errors

## 3. Aiming, auto-fire and muzzle hook

- [ ] 3.1 Update `Player`: accept the pool, keep `this.weapon = structuredClone(WEAPON)`, compute `this.aim` each update (pointer world point once used, else facing direction), and in `syncGuns` set guns rotation and `flipY` instead of copying `flipX`; verify in the browser that the guns track the mouse, flip when aiming left, and point right at spawn before the mouse moves
- [ ] 3.2 Add the fire loop to `Player.update(time, delta)` using `shotsDue` and `spreadAngles`, firing from the gun tip and emitting `player-fired { x, y, angle }` once per shot; update `GameScene` to create `Bullets` before the player, pass `time, delta` to `player.update`, and expose `this.bullets`; verify bullets stream toward the cursor in `npm run dev`
- [ ] 3.3 In `GameScene`, subscribe to `player-fired` and show one reused `fx_muzzle` sprite (origin 0, 0.5) at the tip with the shot's rotation for `muzzleFlashMs`; unsubscribe on shutdown; verify a flash appears at the gun tip on each shot and returning to the title and starting again gives no duplicate listeners (one event per shot)

## 4. Browser tests and video

- [ ] 4.1 Add `e2e/shooting.spec.js`: guns rotation matches the angle to the pointer (±1°) and stays correct while the camera scrolls with a still mouse, flipY when aiming left, points right before the mouse moves, ~8 shots in 2 s at fire rate 4 (±1), no shots while the scene is paused, bullet velocity equals configured speed along the aim and carries configured damage, doubling `player.weapon.bullet.speed` doubles the next bullet's speed while `WEAPON` is unchanged, count 3 / 30° fires three bullets at −15°/0/+15°, bullets despawn after their lifetime and when leaving the arena, 10 s of firing never exceeds `poolSize` objects, a pool of 2 with count 5 skips extras without errors, and `bullet.hit()` honors pierce; verify `npm run e2e` passes (including the existing movement and smoke specs)
- [ ] 4.2 Update `scripts/record.js` so the route sweeps the mouse in a circle around the player while walking, then shows a 3-projectile spread by setting `player.weapon.bullet.count`; verify `npm run record -- videos/gh-3-mouse-aim-autofire.webm 25` writes .webm and .mp4

## 5. Manual verification

- [ ] 5.1 Run `npm run dev`, press Enter, and check in the browser: the guns point right and fire right before you touch the mouse; after moving the mouse they track it smoothly in every direction and never appear upside down; bullets leave the gun tip at a steady rate with a brief muzzle flash; they fly straight, vanish after about a screen's distance or at the arena wall; aim stays on the cursor while walking with the mouse still; pressing L (LevelUp) stops firing until you return; in the console, setting `__GAME__.scene.getScene('Game').player.weapon.bullet.count = 5` fans five bullets; no console errors after a minute of play
