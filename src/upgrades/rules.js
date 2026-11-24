// Pure upgrade rules (GH-8): no Phaser, so they can be unit-tested.

/** @typedef {import('../config/upgrades.js').UpgradeDef} UpgradeDef */
/** @typedef {import('../config/upgrades.js').UpgradeId} UpgradeId */
/** @typedef {UpgradeId | 'patchup'} ChoiceId */
/** @typedef {Record<string, number>} Ranks upgrade id -> rank (missing = 0) */

/**
 * The per-run stats an upgrade can change. The Player has all of these fields, so it can be
 * passed directly.
 * @typedef {object} UpgradeStats
 * @property {{ fireRate: number, bullet: { damage: number, pierce: number, count: number, spreadDeg: number } }} weapon
 * @property {number} speed
 * @property {number} maxHp
 * @property {number} hp
 * @property {number} pickupRadius
 */

/**
 * @typedef {object} UpgradeRulesConfig
 * @property {UpgradeDef[]} list
 * @property {number} spreadStepDeg
 * @property {{ id: 'patchup', heal: number }} filler
 */

/**
 * Ids of the upgrades still below max rank, in list order.
 * @param {Ranks} ranks
 * @param {UpgradeDef[]} list
 * @returns {UpgradeId[]}
 */
export function available(ranks, list) {
  return list.filter((u) => (ranks[u.id] ?? 0) < u.maxRank).map((u) => u.id);
}

/**
 * Draw up to `count` different upgrades below max rank, each with equal chance (partial
 * Fisher-Yates). With none left, the only choice is the filler card.
 * @param {Ranks} ranks
 * @param {UpgradeDef[]} list
 * @param {number} count
 * @param {() => number} rng returns [0, 1)
 * @returns {ChoiceId[]}
 */
export function drawChoices(ranks, list, count, rng) {
  const pool = available(ranks, list);
  if (pool.length === 0) return ['patchup'];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/** Round away float noise from fractional steps (4 + 0.8 + 0.8 ...). */
const tidy = (/** @type {number} */ v) => Math.round(v * 1000) / 1000;

/**
 * Apply one rank of upgrade `id` (or the filler) to `stats`, in place.
 * @param {ChoiceId} id
 * @param {UpgradeStats} stats
 * @param {UpgradeRulesConfig} cfg
 */
export function applyUpgrade(id, stats, cfg) {
  if (id === 'patchup') {
    stats.hp = Math.min(stats.maxHp, stats.hp + cfg.filler.heal);
    return;
  }
  const def = cfg.list.find((u) => u.id === id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  const { step } = def;
  const w = stats.weapon;
  switch (id) {
    case 'damage':
      w.bullet.damage = tidy(w.bullet.damage + step);
      break;
    case 'firerate':
      w.fireRate = tidy(w.fireRate + step);
      break;
    case 'multishot':
      w.bullet.count += step;
      w.bullet.spreadDeg = tidy(w.bullet.spreadDeg + cfg.spreadStepDeg * step);
      break;
    case 'pierce':
      w.bullet.pierce += step;
      break;
    case 'movespeed':
      stats.speed = tidy(stats.speed + step);
      break;
    case 'maxhp':
      stats.maxHp += step;
      stats.hp += step;
      break;
    case 'pickup':
      stats.pickupRadius = tidy(stats.pickupRadius + step);
      break;
  }
}

/**
 * Text for one card: the next rank's effect and "rank/max" after choosing it.
 * @param {ChoiceId} id
 * @param {Ranks} ranks
 * @param {{ list: UpgradeDef[], filler: { id: 'patchup', name: string, heal: number, describe: (heal: number) => string } }} cfg
 * @returns {{ name: string, text: string, rank: string }}
 */
export function cardText(id, ranks, cfg) {
  if (id === 'patchup') {
    return { name: cfg.filler.name, text: cfg.filler.describe(cfg.filler.heal), rank: '' };
  }
  const def = cfg.list.find((u) => u.id === id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  return { name: def.name, text: def.describe(def.step), rank: `${(ranks[id] ?? 0) + 1}/${def.maxRank}` };
}
