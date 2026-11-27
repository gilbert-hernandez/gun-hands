// Pure enemy-scaling math (GH-13, no Phaser), so it can be unit-tested. Enemies level up with the
// player, and from the overtime start every minute of survival makes new spawns tougher.

/**
 * @typedef {{ hp: number, speed: number, damage: number }} StatSet
 * @typedef {object} ScalingConfig
 * @property {StatSet} perLevel added per player level above 1
 * @property {StatSet} maxLevelBonus cap on the level bonus (0.15 = at most +15%)
 * @property {{ startS: number, perMinute: StatSet }} overtime from `startS` of survival, added per minute (uncapped)
 */

/** @type {Array<keyof StatSet>} */
const STATS = ['hp', 'speed', 'damage'];

/**
 * Stat multipliers for an enemy spawning now: the level factor times the overtime factor.
 * @param {number} level the player's level (1 = no level bonus)
 * @param {number} survivalS survival time in seconds
 * @param {ScalingConfig} cfg
 * @returns {StatSet}
 */
export function spawnMultipliers(level, survivalS, cfg) {
  const levels = Math.max(0, level - 1);
  const minutes = Math.max(0, survivalS - cfg.overtime.startS) / 60;
  const out = /** @type {StatSet} */ ({});
  for (const k of STATS) {
    const levelFactor = 1 + Math.min(cfg.perLevel[k] * levels, cfg.maxLevelBonus[k]);
    const overtimeFactor = 1 + cfg.overtime.perMinute[k] * minutes;
    out[k] = levelFactor * overtimeFactor;
  }
  return out;
}

/**
 * An enemy type's stats scaled by `mult`: HP and contact damage rounded (at least 1), speed exact.
 * @param {{ hp: number, speed: number, contactDamage: number }} type
 * @param {StatSet} mult
 */
export function scaledStats(type, mult) {
  return {
    hp: Math.max(1, Math.round(type.hp * mult.hp)),
    speed: type.speed * mult.speed,
    contactDamage: Math.max(1, Math.round(type.contactDamage * mult.damage)),
  };
}
