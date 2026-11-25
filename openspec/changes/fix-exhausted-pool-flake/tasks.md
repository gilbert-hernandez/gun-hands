# Tasks

## 1. Fix the race in the test

- [ ] 1.1 In `e2e/shooting.spec.js`, rewrite `an exhausted pool fires what it can and skips the rest without errors` so the evaluate that installs the 2-bullet pool also clears `__rec` (shots, pending, gameMs, maxPool). Then wait for the first recorded shot without another reset. Keep the 5 requested / 2 fired, final pool length 2 and ≥4 shots checks, and add `maxPool <= 2`. Verify: `npx playwright test e2e/shooting.spec.js -g "exhausted pool"` passes, and `npm run lint` is clean.
- [ ] 1.2 Stress it. Verify: `npx playwright test e2e/shooting.spec.js -g "exhausted pool" --repeat-each=50 --workers=4` gives 50/50 passes. Check `uptime` first so nothing else (such as SplatAttack's suite) is loading the machine.

## 2. Regression check

- [ ] 2.1 Verify: the full suite passes three times in a row (`npm test` unit tests once, then `npm run e2e` ×3, all green). Record the results on GH-27.
- [ ] 2.2 Manual check: run `npm run dev`, start a game in the browser and watch the guns auto-fire for ~10 s. Bullets should spawn and despawn normally with no console errors. Game code is untouched, so this only confirms nothing regressed.
