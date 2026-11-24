# Proposal

## Why

Vikunja: GH-7. Combat (GH-6) lets the player kill enemies, but kills earn nothing, so a run has no progression. XP gems are the reward loop of an arena survivor: kill, collect, level up, get stronger. This change adds the gems, the XP curve, and the level-up trigger; the upgrade cards that a level-up offers come next in GH-8.

## What Changes

- **XP gems drop on kills.** Every enemy killed by damage drops one gem where it died. There are 3 tiers (small, medium, large) with configured XP values; the enemy type picks the tier (Grunt → small, Runner → medium, Brute → large). Recycled enemies drop nothing.
- **Pickup radius and magnet.** The player has a pickup radius (a per-run stat, so GH-8's Pickup Radius upgrade can raise it). A gem that comes inside it starts flying to the player, speeding up until it is collected, and keeps homing even if the player moves away. Collected gems add their XP. Gems wait on the floor indefinitely otherwise; XP is never lost.
- **Gems are pooled with a merge fallback.** Gems come from a fixed pool. When the pool is full, a new drop's XP is merged into the nearest gem on the floor, which shows the tier its new value earns. Late-game frame rate holds, and no XP is lost.
- **XP curve and levels from config.** The XP needed for each next level comes from a configured formula. Leftover XP carries over, and one big pickup can grant several levels at once.
- **Level-up flow.** Each level gained is queued. When the queue is non-empty, the Game scene pauses and the LevelUp scene opens; closing it consumes one queued level-up, and the screen opens again until the queue is empty, then the game resumes. The LevelUp screen stays the GH-6 stub (click or Enter to continue); GH-8 puts the 3 upgrade cards on it.
- **Events** on the Game scene's emitter, with names as shared constants: `xp-changed` (total XP, level, XP into the level, XP needed for the next) and `player-leveled` (the new level). The HUD (GH-10) will read these.
- **Run stats report the real level**, so GameOver shows the level the player reached.
- All numbers (gem values and tiers per enemy type, pickup radius, magnet speed and acceleration, collect distance, pool size, XP curve) live in config.
- The dev readout adds level and XP. The dev key L now grants exactly enough XP for the next level, so it goes through the real path instead of opening LevelUp directly.

## Non-goals

- The upgrade cards, upgrade pool, and applying upgrades (GH-8). This change only queues level-ups and opens the existing stub.
- The Magnet powerup that pulls every gem (GH-9). Gems expose a way to start homing so GH-9 can use it.
- The HUD XP bar and level display (GH-10). The UI placeholder text stays as it is.
- Real gem art and the level-up effect (`fx_levelup`); they're wired in GH-12. Gems use generated placeholders with a distinct tint per tier.
- Sound, gem drop scatter or bounce animations, and gems that expire.
- Saving XP or levels between runs.

## Capabilities

### New Capabilities

- `xp-leveling`: XP gem drops and tiers, the pickup radius and magnet, collection, the gem pool and merge, the XP curve and levels, the queued level-up flow into the LevelUp scene, the XP events, and their configuration.

### Modified Capabilities

- `combat`: the player death sequence reports the level the player reached instead of always 1.

## Impact

- New: `src/config/xp.js` (`XP`: gem tiers, per-type drops, magnet numbers, pool size, curve), `src/xp/rules.js` (pure curve, level-gain, tier, and gem-homing logic), `src/xp/Progression.js` (XP, level, and the level-up queue; no Phaser), `src/xp/Gems.js` (pooled gem sprites, magnet, collection, merge), `src/xp/events.js` (event names), `tests/xp.test.js`, `tests/xpConfig.test.js`, `e2e/xp.spec.js`.
- Changed: `src/config/index.js`, `src/config/player.js` (`pickupRadius`), `src/player/Player.js` (per-run `pickupRadius`; `level` set by progression), `src/scenes/GameScene.js` (gems, progression, level-up queue, readout, dev key L), `src/scenes/LevelUpScene.js` (closing hands back to the queue), `e2e/combat.spec.js` (the death test's level), `scripts/record.js`.
- No new dependencies and no manifest changes: the three `pickup_xp_*` sheets are already in the manifest and ASSETS.md.
