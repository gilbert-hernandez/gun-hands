# Tasks

## 1. Config and pure movement logic

- [x] 1.1 Add `src/config/player.js` (`PLAYER.speed`, `PLAYER.hurtbox {width,height,offsetX,offsetY}`, `PLAYER.anims` frame rates) and `src/config/world.js` (`WORLD.width/height`, `WORLD.cameraLerp`), export both from `src/config/index.js`; verify `npm run build` succeeds
- [x] 1.2 Add `src/player/movement.js` with `velocityFrom` (normalized diagonals, opposite keys cancel) and `facingFrom` (aim wins once pointer used, else last horizontal move, vertical keeps facing); verify with `tests/movement.test.js` via `npm test`

## 2. Player in the Game scene

- [x] 2.1 Add `src/player/Player.js`: Arcade body sprite + guns sprite, WASD keys, hurtbox from config, collide with world bounds, run/idle animation and flipX each update; verify by loading the Game scene with no console errors
- [x] 2.2 Update `GameScene`: set physics and camera bounds from `WORLD`, draw the stand-in grid floor and border, spawn the player at the world center, camera `startFollow` with lerp; remove the static demo sprites; keep the debug L/G keys; verify by walking in the browser and seeing the camera scroll and stop at the edges

## 3. Browser tests and video

- [x] 3.1 Add `e2e/movement.spec.js`: moves right at configured speed, diagonal speed equals config (±1%), stops on release, A+D cancels, can't leave left/top bounds, camera scroll clamped at a corner, hurtbox smaller than 32 and matches config, facing flips with movement and with pointer aim; verify `npm run e2e` passes
- [x] 3.2 Update `scripts/record.js` route: idle, walk all four directions, diagonals, run into a corner to show camera clamp, then move the mouse across the player to show aim facing; verify `npm run record -- videos/gh-2-player-movement.webm 25` writes .webm and .mp4

## 4. Manual verification

- [x] 4.1 Run `npm run dev`, press Enter, and check in the browser: WASD moves smoothly, diagonals aren't faster, the body faces the mouse side after moving the mouse, run/idle animation switches, the camera trails slightly and stops at the arena edges, and the player can't leave the arena. Turn on `DEBUG.physics` to see the hurtbox is smaller than the sprite
