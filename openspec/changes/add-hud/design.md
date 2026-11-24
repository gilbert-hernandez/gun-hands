# Design

## Context

- `UIScene` (key `UI`) is launched by `GameScene.create()` (`this.scene.launch('UI')`), so it is created at the *start of the next step*, after Game's `create` has finished. It sits after Game and before LevelUp in the scene list, so it updates after Game each frame and LevelUp renders on top of it. Combat stops `UI` just before starting GameOver.
- The state the HUD needs is readable on the Game scene: `player.hp` and `player.maxHp`, `xp.progression` (`level`, `xpInto`, `xpNeeded`), `survivalMs` (Game time, frozen while paused and at death), `combat.kills`, and `powerups.active` (timed id → ms left).
- Events on Game's emitter: `player-hit`, `enemy-killed`, `xp-changed`, `player-leveled`, `upgrade-chosen`, `powerup-collected`, `powerup-expired`. HP has **no** event for heals (`Player.heal` is called by the Health Pack, the Max HP upgrade and dev key J).
- The GH-21 UI kit is already in the manifest: `ui_bar_frame` (200×16), `ui_bar_fill_hp` and `ui_bar_fill_xp` (196×12), and `ui_icon_{rapidfire,spread,shield,health,bomb,magnet}` (16×16). They're all gray placeholders today. Other code reads `registry.get('placeholders')` to decide when to tint.
- `formatTime` (`m:ss`) is used by the debug readout and GameOver. The ticket wants `mm:ss` in the HUD.
- Debug scene labels draw at (4, 4) for Game and (4, 20) for UI, which is right where the HUD goes.

## Goals / Non-Goals

**Goals:**
- The HUD can never drift from the game. It shows the same numbers the run stats and debug readout use.
- Keep the math (fill widths, powerup list, blink, clock text) pure and unit-tested in `src/hud/rules.js`, like the other `rules.js` modules.
- Expose the HUD's display objects as fields on the UI scene so e2e tests can assert on what's shown.

**Non-Goals:**
- A reusable widget or layout system. This is one fixed layout for 960×540.

## Decisions

### 1. Read state every frame, use events for feedback

Each frame, `UIScene.update()` reads a snapshot from the Game scene (HP, max HP, level, XP into/needed, survival ms, kills, active powerups). It updates a text or fill only when its value changed, so there's no per-frame text re-rendering. Events drive the one-shot feedback: `player-hit` → HP fill flash, `player-leveled` → level label pop. The listeners are attached to `scene.get('Game').events` in `create` and removed on UI `shutdown`.

*Why not purely event-driven:* heals and Max HP upgrades have no HP event, UI is created a step after Game, so it would have to fetch the initial values anyway, and the timer and powerup countdowns change every frame regardless. Adding `player-healed`/`max-hp-changed` events just to push numbers the HUD can read means more surface for drift with no gain. The per-frame read costs a handful of property reads.

When Game is paused (LevelUp), UI keeps updating but reads unchanged values, so the timer and countdowns freeze with no special case.

### 2. Config: `src/config/hud.js`

```js
export const HUD = {
  margin: 12,                       // px from the screen edges
  barGap: 6,                        // px between the HP and XP bars
  barInset: 2,                      // fill offset inside the 200×16 frame
  labelGap: 8,                      // px between a bar and its text
  fontFamily: 'monospace',
  fontSize: { bar: 14, timer: 22, kills: 16, powerup: 12 },
  colors: { text: '#ffffff', level: '#facc15', shadow: '#000000' },
  placeholderTints: { frame: 0x1f2937, hp: 0xef4444, xp: 0x22c55e },  // icons reuse POWERUPS.types[*].placeholderTint
  powerupOrder: ['rapidfire', 'spread', 'shield'],
  powerupSlot: 44,                  // px per icon + countdown
  powerupWarnMs: 2000,
  blinkMs: 120,
  hitFlashMs: 120,
  levelPopMs: 250,
  levelPopScale: 1.4,
};
```

The tunables are named after what the spec requires. Text gets a 1 px black shadow (integer offset) so it reads over bright arena tiles.

### 3. Pure rules: `src/hud/rules.js`

- `fillWidth(value, max, full)` → `Math.round(clamp(value / max, 0, 1) * full)`. `max <= 0` → 0.
- `activePowerups(active, order)` → `[{ id, msLeft, seconds: Math.ceil(msLeft / 1000) }]` for ids in `order` with `msLeft > 0`.
- `iconVisible(msLeft, warnMs, blinkMs)`: steady above `warnMs`, alternating inside it. This is the same rule as `pickupVisible` in `powerups/rules.js`, and the implementation may simply re-export or call it.
- `formatClock(ms)` goes in `src/util/format.js` next to `formatTime`: `mm:ss`, with minutes padded to two digits (`100:00` past 99 minutes).

### 4. Layout (960×540, all integers)

```
(12,12) [====HP fill====]  75/100            02:07                 KILLS 57 (right-aligned at 948)
(12,34) [====XP fill====]  LV 3
(12,56) [icon] 8s  [icon] 3s
```

- Bars: a `ui_bar_frame` image (origin 0,0) plus a fill image at `+barInset`. The fill width is set with `setCrop(0, 0, w, 12)`, not `scaleX`, so real art (with end caps or a texture) isn't stretched and edges stay on whole pixels.
- The timer is centered and the kills text is right-aligned. Both use origin (0, 0), not 0.5 or 1, because a centered origin on odd-width text would land on a half pixel. Their x is recomputed whenever the text changes: `Math.round((width − text.width) / 2)` for the timer and `width − margin − text.width` for kills.
- Powerup slots: a fixed pool of 3 icon + text pairs created up front. Slot *i* shows the *i*-th entry of `activePowerups`. Unused slots are hidden. Nothing is created or destroyed during play.
- The level pop scales the `LV n` text around its left-middle point with a tween. Positions stay integer, and only the scale animates briefly, which is fine for a 250 ms pop.
- The HP flash uses `setTintFill(0xffffff)` on the fill for `hitFlashMs` (counted on the UI scene's `delta`), then restores the normal tint (placeholder tint or none).
- The HUD uses `scrollFactor` 0. The UI scene's own camera never moves anyway.

### 5. Placeholders

The same pattern as LevelUp/Gems: `placeholders = new Set(registry.get('placeholders'))`. The frame, HP fill and XP fill get `HUD.placeholderTints`. Each icon gets `POWERUPS.types[id].placeholderTint`, so the HUD icon matches the pickup on the floor. Real art is untinted.

### 6. Debug labels

`addSceneLabel` labels move out of the HUD's top-left band: Game's label goes to the bottom-right corner, and UI's label sits under the powerup row (y = 78). The debug readout stays bottom-left. This only affects dev builds.

### 7. Testing

- `tests/hud.test.js`: `fillWidth` (exact fractions, clamping at 0 and full, max 0, results are integers), `activePowerups` (order, filtering 0 and missing, ceil seconds: 1200 → 2, 1000 → 1, 1 → 1), `iconVisible`, `formatClock` (0 → `00:00`, 127 000 → `02:07`, 599 999 → `09:59`, 6 000 000 → `100:00`).
- `tests/hudConfig.test.js`: icons exist in the manifest for every `powerupOrder` id, the order is exactly the timed powerups in `POWERUPS`, `powerupWarnMs` is below every timed duration, the slots fit across the screen, and the timer/kills font sizes are positive integers.
- `e2e/hud.spec.js` reads the UI scene's fields (`hpText.text`, `hpFill` crop width, `levelText.text`, `timerText.text`, `killsText.text`, visible powerup slots and their text) and checks every spec scenario. It waits on state fields per the GH-4/GH-6 notes, sets `powerups.dropChance` to zero, and uses `player.pickupRadius = 0` where gems could open LevelUp.

## Risks / Trade-offs

- [Text on non-integer FIT scales looks slightly uneven] → The ticket asks for crispness at the base resolution, which integer placement guarantees. A pixel bitmap font (GH-21/GH-12) is the real fix and needs no layout change.
- [UI reads Game internals (`xp.progression`, `powerups.active`)] → These are already documented as HUD-readable in the xp-leveling and powerups specs. The reads are gathered in one `snapshot()` method, so a rename touches one place.
- [The UI scene is still running for one step after Game restarts] → `snapshot()` returns null until Game's systems exist, and `update` skips while it's null.
- [Real art of a different size than the manifest] → Positions come from the manifest sizes via config. GH-12 adjusts config if david's art changes sizes.
