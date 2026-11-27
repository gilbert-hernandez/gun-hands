// Autoplay bot for balance runs (GH-13). It plays one full run in a Playwright page against the real
// game: an in-page brain replaces the player's controls (so it steers every frame, on game time),
// and the Node side picks level-up cards and waits for GameOver. It is a repeatable proxy for a
// player, not a good player: compare it with real playtests (design §7) before trusting its numbers.

/** Card priority: the first offered id in this list is picked. */
export const CARD_PRIORITY = ['damage', 'firerate', 'multishot', 'maxhp', 'pierce', 'movespeed', 'pickup', 'patchup'];

/**
 * Brain settings (px). Exported so a balance run can print what it played with.
 */
export const BRAIN = {
  // Enemies closer than this push the bot away (weighted 1/d; Brutes count double).
  threatRadius: 220,
  // Sideways share of the escape, so it circles instead of backing into corners.
  tangent: 0.6,
  // Wall probe distance ahead.
  probe: 48,
  // With no threat this close, walk toward the nearest gem or pickup within this range.
  lootRadius: 360,
  // Below this HP share, a Health Pack on screen beats gems.
  lowHp: 0.5,
};

/**
 * Install the brain in the running Game scene: `player.controls.read()` now returns the bot's
 * intent. Must be called after each session starts.
 * @param {import('@playwright/test').Page} page
 */
export function installBrain(page) {
  return page.evaluate((cfg) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const { player, enemies, xp, powerups, arena } = scene;
    const live = (group) => group.getChildren().filter((c) => c.active);
    const solidAhead = (ax, ay) => arena.isSolidAt(player.x + ax * cfg.probe, player.y + ay * cfg.probe);

    /** Turn (dx, dy) to the nearest open direction, trying ±45° steps. */
    function steerClear(dx, dy) {
      const base = Math.atan2(dy, dx);
      for (const step of [0, 1, -1, 2, -2, 3, -3, 4]) {
        const a = base + (step * Math.PI) / 4;
        const x = Math.cos(a);
        const y = Math.sin(a);
        if (!solidAhead(x, y)) return { x, y };
      }
      return { x: 0, y: 0 };
    }

    // Shadow only `read` on the real input, so everything else that reads it (the touch overlay's
    // sticks and mode, disable at death) still works.
    Object.assign(player.controls, {
      read() {
        let fx = 0;
        let fy = 0;
        let nearest = null;
        let nearestD = Infinity;
        for (const e of live(enemies.group)) {
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < nearestD) {
            nearestD = d;
            nearest = e;
          }
          if (d < cfg.threatRadius) {
            const w = (e.typeId === 'brute' ? 2 : 1) / d;
            fx += (dx / d) * w;
            fy += (dy / d) * w;
          }
        }
        let move = { x: 0, y: 0 };
        const threat = Math.hypot(fx, fy);
        if (threat > 0) {
          const ux = fx / threat;
          const uy = fy / threat;
          // Perpendicular, always the same side, so the bot orbits the crowd.
          move = { x: ux - uy * cfg.tangent, y: uy + ux * cfg.tangent };
        } else {
          const lowHp = player.hp / player.maxHp < cfg.lowHp;
          const loot = [...live(xp.gems.group), ...live(powerups.pickups.group)];
          let best = null;
          let bestScore = Infinity;
          for (const g of loot) {
            const d = Math.hypot(g.x - player.x, g.y - player.y);
            if (d > cfg.lootRadius) continue;
            const score = lowHp && g.id === 'health' ? d / 4 : d;
            if (score < bestScore) {
              bestScore = score;
              best = g;
            }
          }
          if (best) move = { x: best.x - player.x, y: best.y - player.y };
        }
        if (move.x !== 0 || move.y !== 0) move = steerClear(move.x, move.y);
        const aimPoint = nearest ? { x: nearest.x, y: nearest.y } : null;
        return { move, aimPoint, aimAngle: null };
      },
    });
  }, BRAIN);
}

/**
 * Play one run from the Title screen to GameOver and return its run summary.
 * @param {import('@playwright/test').Page} page on the game's page, any scene
 * @param {{ maxMinutes?: number, log?: (msg: string) => void }} [opts]
 * @returns {Promise<import('../src/util/runLog.js').RunSummary & { capped?: boolean }>}
 */
export async function playRun(page, { maxMinutes = 16, log = () => {} } = {}) {
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Title'), null, { timeout: 30000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game')?.juice);
  await installBrain(page);
  const started = Date.now();
  let lastLevel = 1;
  let lastBeat = started;
  /** Set once the run outlives the cap: the bot then kills the player as soon as Game is running. */
  let cappedAt = /** @type {number | null} */ (null);
  for (;;) {
    const s = await page.evaluate(
      ([priority, kill]) => {
        const game = window.__GAME__;
        const go = game.scene.getScene('GameOver');
        if (game.scene.isActive('GameOver') && go.ready) return { done: go.summary };
        const lu = game.scene.getScene('LevelUp');
        if (game.scene.isActive('LevelUp') && lu.ready && !lu.chosen) {
          const pick = priority.map((id) => lu.choices.indexOf(id)).find((i) => i >= 0) ?? 0;
          lu.pick(pick);
        }
        const scenes = game.scene.getScenes(true).map((x) => x.sys.settings.key);
        const g = game.scene.getScene('Game');
        // Between the death and GameOver the Game scene shuts down and its systems go away.
        if (!g?.enemies?.group?.children) return { level: null, t: null, hp: null, enemies: null, scenes };
        // End a capped run through the real death path (like the dev G key), once Game is running.
        if (kill && game.scene.isActive('Game') && !g.player.dead) g.combat.damagePlayer(g.player.hp, { force: true });
        return {
          level: g.xp.progression.level,
          t: g.survivalMs,
          hp: g.player.hp,
          enemies: g.enemies.liveCount,
          scenes,
        };
      },
      [CARD_PRIORITY, cappedAt !== null],
    );
    if (s.done) return cappedAt === null ? s.done : { ...s.done, capped: true };
    if (s.level !== null && s.level !== lastLevel) {
      lastLevel = s.level;
      log(`  level ${s.level} at ${(s.t / 1000).toFixed(0)} s`);
    }
    const now = Date.now();
    if (now - lastBeat >= 60000) {
      lastBeat = now;
      log(
        `  [${Math.round((now - started) / 1000)} s wall] t ${(s.t / 1000).toFixed(0)} s  hp ${s.hp}  enemies ${s.enemies}  scenes ${s.scenes.join(',')}`,
      );
    }
    if (cappedAt === null && now - started > maxMinutes * 60000) {
      cappedAt = now;
      log(`  capped at ${maxMinutes} min (scenes ${s.scenes.join(',')})`);
    }
    if (cappedAt !== null && now - cappedAt > 60000) {
      throw new Error(`capped run never reached GameOver: ${JSON.stringify(s)}`);
    }
    await page.waitForTimeout(250);
  }
}
