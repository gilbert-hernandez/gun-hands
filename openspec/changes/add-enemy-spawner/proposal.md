# Proposal

## Why

Vikunja: GH-5. The arena has a player who can move and shoot, but nothing to shoot at. Enemies that spawn off-screen and chase the player are the core of the arena-survivor loop. Combat (GH-6), XP gems (GH-7), and drops all build on them, and difficulty has to ramp over a 5–8 minute run for the demo to feel like a game.

## What Changes

- Add three enemy types defined entirely in config: **Grunt** (baseline), **Runner** (fast, low HP), and **Brute** (slow, high HP, 64 px). Each type sets its speed, HP, hurtbox, sprite key, and animation rate. HP is stored on each enemy now so GH-6 can apply damage.
- Add a spawner that places enemies on a ring just outside the camera view, at a random angle (so they come from every direction). It never places an enemy where any part of its hurtbox would be on a wall tile or outside the map, and retries other angles before giving up for that tick.
- Add straight-line chase AI. Each enemy moves toward the player at its speed, plus a light separation push away from nearby enemies so a crowd spreads out instead of stacking on one pixel. Enemies collide with walls through the arena's shared collision helper and slide along them.
- Add a wave director driven by config keyframes over survival time. It sets the spawn interval, the cap on live enemies, and the type mix (weights), interpolating between keyframes and holding the last one.
- Pool enemies in one fixed-size group. Spawning reuses a free enemy; at the cap or with a full pool, nothing spawns. Enemies that end up far from the player (stuck behind obstacles or left behind) go back to the pool so they don't use up the cap.
- Track survival time in the Game scene. It only advances while the scene runs, so pauses (LevelUp, Esc later) don't advance the waves.
- Until GH-17 art arrives, tint each type's placeholder so the three types are distinguishable (Grunt and Runner share the red enemy placeholder color otherwise).
- In development builds only, show a small debug readout (survival time, live enemies / cap) for tuning.

## Non-goals

- Bullets damaging enemies, contact damage to the player, hit flash, knockback, and death animations. All of that is GH-6. In this change bullets pass through enemies and enemies pass through the player.
- XP gem and loot drops (GH-7, GH-9).
- Pathfinding or flow fields around obstacles. Enemies chase in a straight line and slide along walls; the far-away recycle covers ones that get stuck.
- Ranged enemies, bosses, elites, or scripted wave events.
- Y-sorting or depth ordering between enemies and the player.
- HUD timer and kill counter (GH-10). The debug readout is a dev-only tuning aid.
- Real enemy art. That's GH-17 (david); this change works on placeholders.

## Capabilities

### New Capabilities

- `enemies`: the enemy types and their config, off-screen ring spawning that avoids walls, chase movement with separation and wall collision, the wave director that ramps spawning with survival time, pooling and far-away recycling, survival time, and distinguishable placeholders.

### Modified Capabilities

None. The arena's shared wall collision (from `arena-map`) is used as specified; no existing requirement changes.

## Impact

- New: `src/config/enemies.js` (types, waves, spawn and separation tunables), `src/enemy/Enemy.js` (pooled sprite), `src/enemy/Enemies.js` (pool, spawning, per-frame steering), `src/enemy/spawn.js`, `src/enemy/steering.js`, `src/enemy/waves.js` (pure logic, no Phaser), `tests/spawn.test.js`, `tests/steering.test.js`, `tests/waves.test.js`, `tests/enemiesConfig.test.js`, `e2e/enemies.spec.js`.
- Changed: `src/config/index.js` (exports `ENEMIES`), `src/scenes/GameScene.js` (survival time, enemy pool, director, debug readout), `src/scenes/PreloadScene.js` (records which keys are placeholders), `scripts/record.js` (route shows enemies chasing).
- No new dependencies.
