# Proposal

## Why

Vikunja: GH-9. Right now, kills only drop XP gems, so the moment-to-moment loop has no surprises between level-ups. Rare loot powerups give short spikes of power (a burst of fire, a screen-clearing bomb, a shield in a tight spot), which makes a 5–8 minute demo run feel eventful. The art hooks are already in the manifest (`pickup_*`, `fx_shield`, `fx_bomb_blast`), and `Gems.magnetizeAll()` was left as the Magnet hook in GH-7.

## What Changes

- **Drop table.** When an enemy is killed, it rolls a per-type drop chance from config (Brutes much higher than Grunts and Runners). On a hit, a powerup is picked from a weighted table and dropped at the enemy's position as a 24×24 pickup. Bomb kills roll like any other kill.
- **Pickups on the floor.** Pickups come from a fixed pool (a drop is skipped when the pool is full). They are collected when the player's center comes within a configured radius. Unlike XP gems, the pickup radius and magnet don't pull them. Each pickup lasts a configured time, blinks for the last few seconds, then despawns.
- **Timed powerups** (each has its own duration, and they can run at the same time):
  - **Rapid Fire**: multiplies the fire rate.
  - **Spread Shot**: adds projectiles per shot and widens the fan.
  - **Shield**: contact hits do no damage while it lasts. A shield aura follows the player and blinks near the end.
  - Collecting a timed powerup that is already active resets its timer to the full duration. Timers don't add up.
  - Timed effects sit on top of the player's per-run weapon stats instead of changing them. Upgrades taken during a powerup are kept when it ends, and the powerup's boost is removed cleanly.
- **Instant powerups:**
  - **Health Pack**: heals a configured amount, capped at max HP.
  - **Bomb**: deals a configured amount of damage to every live enemy on screen. That kills Grunts and Runners and badly hurts Brutes. Kills count as normal kills (puff, kill count, XP gem). It also plays a blast effect and a short camera shake.
  - **Magnet**: every XP gem in the arena flies to the player.
- **Pausing and death.** Powerup timers and pickup lifetimes run on Game time, so they stop during LevelUp. After the player dies, nothing is collected or ticks any more.
- **Events:** `powerup-collected` (id, and the duration for timed powerups) and `powerup-expired` (id), on the Game scene's emitter as shared constants. Active timers are readable for the HUD (GH-10).
- **Dev aids:** debug key P drops the next powerup in turn in front of the player. The debug readout shows the active powerup timers.
- **Bullet pool** grows from 120 to 160, so maxed Fire Rate and Multishot plus Rapid Fire and Spread Shot don't run out of bullets.
- All numbers (drop chances, weights, durations, multipliers, heal, bomb damage, pickup lifetime, blink window, collect radius, pool size) live in a new `POWERUPS` config.

## Non-goals

- Showing powerup icons and timers in the HUD (GH-10). This change only exposes the state and events for it.
- Real pickup, shield, and blast art (GH-20, GH-18) and wiring it in (GH-12). Generated placeholders are used until then.
- Sound, pickup magnetism, and stacking durations or strength.
- Guaranteed or pity drops, drop rates that scale with time or luck, and powerups that stay between runs.
- Shield blocking anything other than enemy contact (the dev damage keys still go through).

## Capabilities

### New Capabilities

- `powerups`: the drop table, pickups (pool, collection, lifetime, blink), the six powerup effects, timers and refresh, pausing and death behavior, the powerup events, the debug drop key, and their configuration.

### Modified Capabilities

- `player-shooting`: the guns fire at the effective fire rate and projectile layout, which is the per-run weapon stats plus any active Rapid Fire or Spread Shot boost. Powerups no longer change the per-run copy itself.
- `combat`: a contact hit while the Shield is active deals no damage, starts no invulnerability, and emits no `player-hit`.

## Impact

- New: `src/config/powerups.js` (`POWERUPS`), `src/powerups/rules.js` (pure drop roll, weighted pick, effective weapon, timers, blink), `src/powerups/Pickups.js` (pickup pool on the floor), `src/powerups/Powerups.js` (session wiring: drops on `enemy-killed`, collection, effects, timers, shield aura, bomb), `src/powerups/events.js`, `tests/powerups.test.js`, `tests/powerupsConfig.test.js`, `e2e/powerups.spec.js`.
- Changed: `src/config/index.js`, `src/config/weapon.js` (pool size 160), `src/player/Player.js` (fires using the effective weapon from a `boosts` hook), `src/combat/Combat.js` (shield check on contact, `damageEnemy` for the bomb), `src/scenes/GameScene.js` (`scene.powerups`, P key, readout), `scripts/record.js`.
- No new dependencies and no manifest or ASSETS.md changes: all six `pickup_*` sheets, `fx_shield`, and `fx_bomb_blast` already exist, with placeholders.
