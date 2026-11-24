# Proposal

## Why

Vikunja: GH-8. GH-7 queues level-ups and pauses the game, but the LevelUp screen is still a stub that just continues, so leveling up does nothing. Picking one of three upgrades is what makes a run feel like it builds toward something, and it's the core choice loop of the demo.

## What Changes

- **LevelUp shows 3 upgrade cards.** When the LevelUp scene opens (Game already paused by GH-7), it draws 3 different upgrades at random from those not yet at max rank. Each card shows its number key (1–3), an icon, the upgrade name, what the next rank does, and the current rank out of the max (e.g. "2/5").
- **Upgrade pool** (7 upgrades, each with a max rank and a per-rank step from config):
  - Damage: bullet damage up
  - Fire Rate: shots per second up
  - Multishot: one more projectile per shot, and the fan widens
  - Pierce: bullets pass through one more enemy
  - Move Speed: player move speed up
  - Max HP: max HP up, and the player heals by the same amount
  - Pickup Radius: XP pickup radius up
- **Choosing.** Click a card, or press 1, 2, or 3. The upgrade applies to the player's per-run stats at once, then the screen closes and hands back to the GH-7 queue: it opens again with a fresh draw if more level-ups are pending, otherwise Game resumes. Hovering a card highlights it. A short input delay after the screen opens ignores clicks and keys, so a stray click or keypress at the moment it pops up doesn't pick a card by accident. Enter no longer closes the screen.
- **Small or empty pool.** When fewer than 3 upgrades are left below max rank, the screen shows only those. When none are left, it shows one filler card that heals the player, so level-ups still do something.
- **Per-run move speed.** The player gets a per-run move speed, starting at the configured value each session, so Move Speed can raise it without touching config (weapon stats, max HP, and pickup radius are already per run).
- **Event:** `upgrade-chosen` on the Game scene's emitter, with the upgrade id and its new rank, as a shared constant. The HUD (GH-10) can use it to refresh max HP.
- All numbers (per-rank steps, max ranks, the multishot spread step, the filler heal, the input delay) live in config.

## Non-goals

- Rerolls, banishing, skipping a level-up, or rarity tiers.
- New weapons, evolutions, or upgrades beyond the 7 listed.
- Real card and icon art (`ui_card`, `ui_up_*`, already in the manifest for GH-21) and the level-up burst (`fx_levelup`); wired in GH-12. Cards use generated placeholders.
- Showing the chosen upgrades in the HUD (GH-10) or on GameOver.
- Gamepad input and sound.
- Saving upgrades between runs.

## Capabilities

### New Capabilities

- `upgrades`: the upgrade pool and ranks, the 3-card draw, choosing by click or 1–3, applying each upgrade to the player's per-run stats, the filler card, the input delay, the `upgrade-chosen` event, and their configuration.

### Modified Capabilities

- `xp-leveling`: the level-up flow now consumes a pending level-up when an upgrade is chosen, instead of when the stub screen is closed.
- `player-movement`: the player moves at a per-run move speed that starts at the configured value each session and can be raised during the run.

## Impact

- New: `src/config/upgrades.js` (`UPGRADES`), `src/upgrades/rules.js` (pure draw, rank, and apply logic), `src/upgrades/Upgrades.js` (per-session ranks and apply on the Game scene), `src/upgrades/events.js`, `tests/upgrades.test.js`, `tests/upgradesConfig.test.js`, `e2e/levelup.spec.js`.
- Changed: `src/config/index.js`, `src/player/Player.js` (per-run `speed`), `src/scenes/GameScene.js` (`scene.upgrades`, readout), `src/scenes/LevelUpScene.js` (the card screen replaces the stub), `e2e/xp.spec.js` and `e2e/combat.spec.js` (close LevelUp by picking a card instead of Enter), `scripts/record.js`.
- No new dependencies and no manifest changes: `ui_card` and the seven `ui_up_*` icons are already in the manifest and ASSETS.md, with generated placeholders.
