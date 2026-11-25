# Proposal

## Why

Vikunja: GH-27. The e2e test `an exhausted pool fires what it can and skips the rest without errors` (`e2e/shooting.spec.js`) fails now and then: it expects 2 bullets from the first recorded shot and gets 0. It fails on `master` too, and a flaky test in the suite hides real regressions.

**Cause (confirmed 2026-11-25).** The test swaps in a 2-bullet pool in one `page.evaluate`. Then `nextShot` clears the recorder in a second `page.evaluate`. The guns fire every 250 ms and bullets live 1200 ms, so if a game step runs between the two calls and fires a shot, that shot takes both bullets and is then wiped from the recorder. The first shot the test sees finds the pool full, so it reports `requested: 5, bullets: []`. A diagnostic run (40 repeats at 4 workers) caught this in every failure: the pool's 2 bullets were already active, and no `blocked` shot or other cause showed up.

This is a race in the test, not a game bug. The game behaves as the spec says: a full pool skips bullets without errors.

## What Changes

- In that test, swap in the small pool and clear the recorder in the **same** `page.evaluate`. No game step can run in the middle of an evaluate, so the first shot recorded afterwards is the first shot from the fresh, empty 2-bullet pool.
- Keep the existing assertions: the first shot requests 5 bullets and fires 2, the pool holds 2 at the end, and at least 4 shots happen over 1.5 s of game time. Add a `maxPool <= 2` check so the test verifies that the pool *never* grows past 2, not just that it holds 2 at the end.
- No game code changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `player-shooting` requirement "Bullets come from a fixed pool" is unchanged. Only its test changes, so the change sets `skip_specs: true`.

## Impact

- `e2e/shooting.spec.js`: that one test only.
- No runtime, config or spec changes.

## Non-goals

- Reworking `nextShot`/`resetRec` for the other shooting tests. They don't depend on a fresh pool, so the gap doesn't hurt them. Changing them adds risk without fixing anything.
- The other known rare flakes (the HUD hit flash, combat.spec "a killing hit removes the enemy…").
- Changing pool sizes, fire rate or bullet lifetime.
