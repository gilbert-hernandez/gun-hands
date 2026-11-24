# Proposal

## Why

Vikunja: GH-3. The player can move (GH-2) but can't fight. Shooting is the core verb of Gun Hands, and enemies (GH-4), damage, upgrades (multishot, pierce, fire rate) and the Spread Shot / Rapid Fire powerups all build on it, so it comes next.

## What Changes

- The gun-hands sprite rotates on its own to point at the mouse pointer, using world coordinates so aim stays correct while the camera scrolls. It flips vertically when pointing left so the guns are never drawn upside down. The body keeps its left/right facing from GH-2.
- The guns fire automatically at a configured fire rate (shots per second) toward the cursor, with no click needed. Before the mouse has been moved over the game, they fire in the direction the body faces.
- Bullets leave from the gun tip and come from a fixed-size object pool, so no bullet objects are created or destroyed during play. If every pooled bullet is in flight, the extra shot is skipped.
- Bullet stats come from a new weapon config module: speed, damage, lifetime, pierce, projectile count, and spread angle. Projectile count > 1 fans the bullets evenly across the spread angle (used later by multishot and Spread Shot).
- Bullets despawn when their lifetime runs out or they leave the arena, and return to the pool. Each bullet carries its damage and remaining pierce so the enemy ticket can apply hits; a pure helper decides when a hit uses up the bullet.
- The player keeps a per-run copy of the weapon stats, so later upgrades and powerups change that copy, not the config.
- Muzzle flash hook: every shot emits a `player-fired` event with position and angle, and a placeholder muzzle flash shows briefly at the gun tip.
- Unit tests for the aim, spread, fire-timing and pierce math; a Playwright e2e test for rotation, fire rate, pooling, lifetime and multishot; the record script shows shooting.

## Non-goals

- Enemies, bullet/enemy collisions, damage numbers, or knockback (GH-4 and later). Pierce is tracked but nothing consumes it yet.
- Upgrades, the LevelUp choices, and the Rapid Fire / Spread Shot powerups (they only change the per-run stats added here).
- Manual fire (click to shoot), ammo, reloading, or alternate weapons.
- Gun recoil animation, impact effects, screen shake, and sound (art integration and polish tickets).
- Gamepad or touch aiming.

## Capabilities

### New Capabilities
- `player-shooting`: how the gun-hands aim at the pointer, how and when they fire, the bullet stats and their lifetime, bullet pooling, and the per-shot muzzle flash hook.

### Modified Capabilities
<!-- none: player-movement's facing requirement is unchanged (the guns were not specified there) -->

## Impact

- New: `src/config/weapon.js`, `src/weapon/aim.js` (pure math), `src/weapon/Bullets.js` (pool), unit tests `tests/aim.test.js`, `e2e/shooting.spec.js`.
- Changed: `src/config/index.js` (export `WEAPON`), `src/player/Player.js` (gun rotation, fire timer, per-run stats; guns no longer copy the body's flipX), `src/scenes/GameScene.js` (creates the bullet pool, passes it to the player), `scripts/record.js` (route shows aiming and firing).
- Uses existing manifest keys `fx_bullet` and `fx_muzzle` (placeholders until GH-18 art lands). No new dependencies.
