# Proposal

## Why

Vikunja: GH-6. Enemies now spawn and chase the player (GH-5), but bullets pass through them and they pass through the player, so nothing can win or lose. Combat closes the core loop: shoot enemies to kill them, get hurt when they reach you, die, and see how you did. XP gems (GH-7), loot drops (GH-9), the HUD (GH-10), and the game over screen (GH-11) all hang off the events this change emits.

## What Changes

- **Bullets damage enemies.** A bullet overlapping an enemy deals its damage once to that enemy, then uses one pierce or despawns (the existing pierce rule). A piercing bullet never hits the same enemy twice.
- **Hit feedback.** A damaged enemy flashes solid white for a short configured time and is knocked back away from the bullet's direction of travel. Knockback strength is set per enemy type (Brutes barely move). While knocked back, an enemy doesn't steer, but walls still stop it.
- **Enemy death.** At 0 HP an enemy leaves play right away (its pool slot is freed and it can't be hit or hurt the player) and a puff effect plays where it died, from a small pool of reusable effect sprites.
- **Contact damage.** An enemy touching the player's hurtbox deals its type's contact damage. After a hit the player is invulnerable for a configured time and blinks; contact during that time does nothing.
- **Player HP and death.** The player starts each session with max HP from config. At 0 HP: input and firing stop, spawning stops and enemies freeze, the player death animation plays, and then the Game and UI scenes stop and GameOver starts with run stats: survival time, kills, and level (1 until GH-8 adds levelling).
- **Combat events** on the Game scene's event emitter, with names exported as constants: `enemy-hit`, `enemy-killed`, `player-hit`, `player-died`. Payloads carry what the HUD and drops need (position, enemy type, damage, HP, run stats).
- **GameOver shows the stats** it receives as plain text, so the hand-off is visible; GH-11 replaces the screen.
- All numbers (player HP and i-frames, per-type contact damage and knockback, flash and blink times, death delay) live in config.
- The dev readout adds HP and kills; dev-only keys to take damage (H) and to restore full HP (J) help testing. The existing G shortcut goes through the real death path.

## Non-goals

- XP gems, loot drops, and upgrades (GH-7, GH-8, GH-9). This change only emits the events they will use.
- The real HUD (GH-10) and the real game over screen with Restart (GH-11). The UI placeholder text stays as is.
- Real art: enemy death sheets, the player hurt sheet, and the impact effect are wired in GH-12. This change uses the puff and player death placeholders only.
- Sound, screen shake, damage numbers, and hit-stop.
- Shields, healing, and other powerups (GH-9).
- Enemies attacking at range, or contact damage over time while overlapping beyond the i-frame rule.

## Capabilities

### New Capabilities

- `combat`: bullet hits on enemies (damage, flash, knockback, death puff), contact damage and invulnerability, player HP and the death sequence into GameOver with run stats, and the combat events.

### Modified Capabilities

- `enemies`: the chase requirement changes so that enemies don't steer while knocked back and stop moving once the player is dead. Removing an enemy on death uses the same pool slot rule as recycling.

## Impact

- New: `src/config/combat.js` (`COMBAT`: flash, knockback time, puff pool, death delay), `src/combat/rules.js` (pure damage, knockback, invulnerability, and blink logic), `src/combat/events.js` (event names), `src/combat/Combat.js` (overlaps and wiring in the scene), `src/fx/Puffs.js` (puff pool), `src/util/format.js` (shared m:ss formatter), `tests/combat.test.js`, `e2e/combat.spec.js`.
- Changed: `src/config/player.js` (max HP, i-frames, blink), `src/config/enemies.js` (per-type `contactDamage` and `knockback`), `src/config/index.js`, `src/config/weapon.js` (comment on bullet speed vs. small hurtboxes), `src/weapon/Bullets.js` (per-bullet hit-once set), `src/enemy/Enemy.js` (damage, flash, knockback state), `src/enemy/Enemies.js` (skip steering while knocked back, freeze), `src/player/Player.js` (HP, invulnerability, blink, death), `src/scenes/GameScene.js` (kills, death sequence, readout, dev keys), `src/scenes/GameOverScene.js` (show stats), `tests/enemiesConfig.test.js`, `scripts/record.js`.
- No new dependencies.
