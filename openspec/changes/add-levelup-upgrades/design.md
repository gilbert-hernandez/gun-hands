# Design

## Context

GH-7 left these hooks for this change:

- `Xp.openLevelUp()` pauses Game and launches `LevelUp`; `xp.finishLevelUp()` consumes one pending level-up and returns true if another is queued. The LevelUp stub then calls `this.scene.restart()` (more queued) or resumes Game and stops itself. Phaser queues `pause`/`launch` until the next step, which is why `Xp` tracks `levelUpOpen` with a flag.
- The player already carries per-run copies: `player.weapon` (a `structuredClone` of `WEAPON`), `player.maxHp`/`hp`, and `player.pickupRadius`. Move speed is the exception: `Player.update` reads `PLAYER.speed` directly.
- `Player.fire` reads `this.weapon` on every shot and each bullet copies `damage` and `pierce` when fired, so weapon upgrades take effect on the next shot and never touch bullets in flight.
- The manifest already has `ui_card` (160×220) and seven `ui_up_*` icons (32×32) for GH-21. Their placeholders are all the same gray (`CATEGORY_COLORS.ui`).
- The display is 960×540, and the LevelUp scene runs its own clock while Game is paused.

## Goals / Non-Goals

**Goals:**
- Keep all upgrade math pure and unit-testable (no Phaser), the same way `xp/rules.js` and `combat/rules.js` are.
- LevelUp owns only presentation and input. Ranks and applying upgrades live in a per-session object on the Game scene, so state resets with the session and e2e tests can reach it.
- Make the random draw injectable so tests can be deterministic.

**Non-Goals:**
- A generic stat/modifier system (multipliers, stacking sources, removal). Powerups (GH-9) will change the same per-run fields directly, as the weapon config comment already says.

## Decisions

### 1. Config: `src/config/upgrades.js`

```js
export const UPGRADES = {
  inputDelayMs: 250,
  spreadStepDeg: 10,          // Multishot widens the fan by this much per rank
  filler: { id: 'patchup', name: 'Patch Up', heal: 25, icon: 'ui_up_maxhp', placeholderTint: 0xf87171 },
  list: [
    { id: 'damage',     name: 'Damage',        maxRank: 5, step: 3,   icon: 'ui_up_damage',    placeholderTint: ... },
    { id: 'firerate',   name: 'Fire Rate',     maxRank: 5, step: 0.8, icon: 'ui_up_firerate',  ... },
    { id: 'multishot',  name: 'Multishot',     maxRank: 4, step: 1,   icon: 'ui_up_multishot', ... },
    { id: 'pierce',     name: 'Pierce',        maxRank: 3, step: 1,   icon: 'ui_up_pierce',    ... },
    { id: 'movespeed',  name: 'Move Speed',    maxRank: 4, step: 20,  icon: 'ui_up_movespeed', ... },
    { id: 'maxhp',      name: 'Max HP',        maxRank: 5, step: 20,  icon: 'ui_up_maxhp',     ... },
    { id: 'pickup',     name: 'Pickup Radius', maxRank: 4, step: 40,  icon: 'ui_up_pickup',    ... },
  ],
};
```

Each entry also has a `describe(step)`-style text template (e.g. `'+3 bullet damage'`), generated from the step so the card text can't drift from the number.

Starting values and maxes: damage 10 → 25, fire rate 4 → 8/s, projectiles 1 → 5 (fan 15° → 55°), pierce 0 → 3, move speed 200 → 280 px/s, max HP 100 → 200, pickup radius 80 → 240 px. That's 30 ranks in total, more than a 5–8 minute run should reach, so the filler card is a safety net, not a normal sight.

*Flat steps vs. percentages:* flat steps are easier to read on a card ("+3 damage") and to test. Percent scaling isn't needed at these rank counts. Steps are config, so tuning stays a one-line change.

*Bullet pool check:* the worst case is 8 shots/s × 5 projectiles × 1.2 s lifetime = 48 bullets in flight, well under the 120-bullet pool.

### 2. Pure rules: `src/upgrades/rules.js`

- `available(ranks, list)`: ids below max rank.
- `drawChoices(ranks, list, count, rng)`: partial Fisher–Yates over `available`, which gives `min(count, available)` distinct ids with equal chance; returns `['patchup']` when nothing is available.
- `applyUpgrade(id, stats, cfg)`: mutates a plain stats object `{ weapon, speed, maxHp, hp, pickupRadius }` by one step (Multishot: `count += step`, `spreadDeg += spreadStepDeg`; Max HP: `maxHp += step`, `hp += step`; filler: `hp = min(maxHp, hp + heal)`).

The player object itself satisfies that stats shape, so `applyUpgrade` runs on `player` directly in the game and on plain objects in unit tests.

### 3. Per-session state: `src/upgrades/Upgrades.js`

Created in `GameScene.create()` as `scene.upgrades = new Upgrades(scene, player)`, so it resets with every session. It holds `ranks` (all 0), `rng` (defaults to `Math.random`; e2e tests can replace it), `draw()` (calls `drawChoices` with count 3), and `choose(id)` (applies the upgrade, raises the rank, then emits `upgrade-chosen` `{ id, rank }` on the Game scene's events). The event name lives in `src/upgrades/events.js`.

*Why not keep ranks in LevelUp:* LevelUp restarts for every queued level-up, so it can't hold state across openings, and Game already owns everything else per session.

### 4. LevelUp scene

`create()` reads `game.upgrades.draw()` and lays out 1–3 cards centered horizontally (160×220, 24 px gap) on a dark overlay under a "LEVEL UP" title. Each card is a container: the `ui_card` image, the icon (tinted with `placeholderTint` only while the icon is a placeholder, as gems do), the key number, name, the description text, and "rank/max". Text is drawn by the game, matching ASSETS.md ("game draws the icon and text on top").

Input:
- The card image is interactive. `pointerover`/`pointerout` toggle a highlight (scale 1.05 and a bright outline rectangle). `pointerdown` picks the card.
- `keydown-ONE`, `-TWO`, `-THREE` pick cards by index; an index with no card is ignored.
- `ready` becomes true after `UPGRADES.inputDelayMs` on the LevelUp scene's own clock (`time.delayedCall`). `chosen` is set on the first accepted pick, and every later input is ignored. Both are public fields, which gives e2e tests a reliable "ready for input" check to replace GH-7's `listenerCount('keydown-ENTER')`.
- On pick: `game.upgrades.choose(id)`, then the same hand-off as the stub: `xp.finishLevelUp()` → `this.scene.restart()` if more are queued, else resume Game and stop. A restart runs `create()` again, which makes the new draw.

Enter has no binding any more, and clicks off the cards hit nothing interactive.

### 5. Player changes

- `this.speed = PLAYER.speed` per run; `update()` passes `this.speed` to `velocityFrom`.
- `heal(amount = this.maxHp)` adds `amount`, capped at `maxHp`. The dev key J keeps calling `heal()` for a full heal; the filler card goes through `applyUpgrade`, not `heal`, so the pure rule stays testable.

### 6. Dev readout

The debug readout adds `spd`, `dmg`, `rate`, `n` (projectiles), and `pierce` so tuning can be checked in one glance. Key L (GH-7) already triggers the real level-up path, so no new dev key is needed.

## Risks / Trade-offs

- [The draw is random, so e2e tests could flake if they assume which cards appear] → Tests read the drawn ids from the LevelUp scene, or replace `game.upgrades.rng` with a seeded generator before triggering the level-up.
- [Existing e2e helpers close LevelUp with Enter, which will hang] → Update the helpers in `xp.spec.js` and `combat.spec.js` to wait on `lu.ready` and press 1. The GH-6 death test sets HP after the level-ups, so a Max HP pick can't change its outcome.
- [Accidental picks: the player might be pressing keys or clicking when the screen pops] → The 250 ms input delay. Movement keys (WASD) and number keys don't overlap.
- [Move Speed could outrun enemies or gems] → Max 280 px/s stays below the gem magnet's 520 px/s max (checked by a config test). Being faster than every enemy is already true at the base 200 px/s.
- [Placeholder icons are identical gray] → Tint each icon with its own `placeholderTint` until real art arrives.
- [Multishot spread could get very wide] → 55° at 5 projectiles; tunable through `spreadStepDeg`.
