import { describe, expect, it } from 'vitest';
import { PLAYER, UPGRADES, WEAPON } from '../src/config/index.js';
import { applyUpgrade, available, cardText, drawChoices } from '../src/upgrades/rules.js';
import { seeded } from './rng.js';

const ids = UPGRADES.list.map((u) => u.id);
const maxed = (except = []) =>
  Object.fromEntries(UPGRADES.list.filter((u) => !except.includes(u.id)).map((u) => [u.id, u.maxRank]));

/** Fresh per-run stats, like a new Player. */
function stats(over = {}) {
  return {
    weapon: structuredClone(WEAPON),
    speed: PLAYER.speed,
    maxHp: PLAYER.maxHp,
    hp: PLAYER.maxHp,
    pickupRadius: PLAYER.pickupRadius,
    ...over,
  };
}
const step = (id) => UPGRADES.list.find((u) => u.id === id).step;

describe('drawChoices', () => {
  it('draws 3 distinct upgrades from a full pool', () => {
    const rng = seeded(7);
    for (let i = 0; i < 100; i++) {
      const c = drawChoices({}, UPGRADES.list, 3, rng);
      expect(c).toHaveLength(3);
      expect(new Set(c).size).toBe(3);
      for (const id of c) expect(ids).toContain(id);
    }
  });

  it('offers each upgrade with equal chance', () => {
    const rng = seeded(42);
    const counts = Object.fromEntries(ids.map((id) => [id, 0]));
    const draws = 7000;
    for (let i = 0; i < draws; i++) for (const id of drawChoices({}, UPGRADES.list, 3, rng)) counts[id] += 1;
    for (const id of ids) expect(Math.abs(counts[id] / draws - 3 / 7)).toBeLessThan(0.05);
  });

  it('never draws a maxed upgrade', () => {
    const rng = seeded(3);
    const ranks = { pierce: UPGRADES.list.find((u) => u.id === 'pierce').maxRank };
    expect(available(ranks, UPGRADES.list)).not.toContain('pierce');
    for (let i = 0; i < 200; i++) expect(drawChoices(ranks, UPGRADES.list, 3, rng)).not.toContain('pierce');
  });

  it('draws exactly the two that are left', () => {
    const c = drawChoices(maxed(['damage', 'pierce']), UPGRADES.list, 3, seeded(1));
    expect(c.sort()).toEqual(['damage', 'pierce']);
  });

  it('offers only the filler once everything is maxed', () => {
    expect(drawChoices(maxed(), UPGRADES.list, 3, seeded(1))).toEqual(['patchup']);
  });
});

describe('applyUpgrade', () => {
  /** Apply `id` and return which top-level/weapon fields changed. */
  function changed(id) {
    const before = stats();
    const after = stats();
    applyUpgrade(id, after, UPGRADES);
    const diff = [];
    for (const k of ['speed', 'maxHp', 'hp', 'pickupRadius']) if (before[k] !== after[k]) diff.push(k);
    if (before.weapon.fireRate !== after.weapon.fireRate) diff.push('fireRate');
    for (const k of Object.keys(before.weapon.bullet))
      if (before.weapon.bullet[k] !== after.weapon.bullet[k]) diff.push(k);
    return { before, after, diff: diff.sort() };
  }

  it('Damage adds its step to bullet damage', () => {
    const { before, after, diff } = changed('damage');
    expect(diff).toEqual(['damage']);
    expect(after.weapon.bullet.damage).toBe(before.weapon.bullet.damage + step('damage'));
  });

  it('Damage 10 -> 13 with the configured step', () => {
    const s = stats();
    s.weapon.bullet.damage = 10;
    applyUpgrade('damage', s, { ...UPGRADES, list: UPGRADES.list.map((u) => ({ ...u, step: 3 })) });
    expect(s.weapon.bullet.damage).toBe(13);
  });

  it('Fire Rate adds its step without float noise', () => {
    const s = stats();
    for (let i = 0; i < 5; i++) applyUpgrade('firerate', s, UPGRADES);
    expect(s.weapon.fireRate).toBe(Math.round((WEAPON.fireRate + 5 * step('firerate')) * 1000) / 1000);
    expect(changed('firerate').diff).toEqual(['fireRate']);
  });

  it('Multishot adds a projectile and widens the fan', () => {
    const { before, after, diff } = changed('multishot');
    expect(diff).toEqual(['count', 'spreadDeg']);
    expect(after.weapon.bullet.count).toBe(before.weapon.bullet.count + 1);
    expect(after.weapon.bullet.spreadDeg).toBe(before.weapon.bullet.spreadDeg + UPGRADES.spreadStepDeg);
  });

  it('Pierce adds one', () => {
    const { before, after, diff } = changed('pierce');
    expect(diff).toEqual(['pierce']);
    expect(after.weapon.bullet.pierce).toBe(before.weapon.bullet.pierce + 1);
  });

  it('Move Speed adds its step', () => {
    const { after, diff } = changed('movespeed');
    expect(diff).toEqual(['speed']);
    expect(after.speed).toBe(PLAYER.speed + step('movespeed'));
  });

  it('Max HP raises max HP and heals the same amount', () => {
    const s = stats({ hp: 60, maxHp: 100 });
    applyUpgrade('maxhp', s, { ...UPGRADES, list: UPGRADES.list.map((u) => ({ ...u, step: 20 })) });
    expect(s.hp).toBe(80);
    expect(s.maxHp).toBe(120);
    expect(changed('maxhp').diff).toEqual(['hp', 'maxHp']);
  });

  it('Pickup Radius adds its step', () => {
    const { after, diff } = changed('pickup');
    expect(diff).toEqual(['pickupRadius']);
    expect(after.pickupRadius).toBe(PLAYER.pickupRadius + step('pickup'));
  });

  it('the filler heals and caps at max HP', () => {
    const s = stats({ hp: 50, maxHp: 120 });
    applyUpgrade('patchup', s, UPGRADES);
    expect(s.hp).toBe(50 + UPGRADES.filler.heal);
    s.hp = 110;
    applyUpgrade('patchup', s, UPGRADES);
    expect(s.hp).toBe(120);
    expect(s.maxHp).toBe(120);
  });

  it('never changes the config', () => {
    const weapon = structuredClone(WEAPON);
    const player = structuredClone(PLAYER);
    const s = stats();
    for (const id of ids) applyUpgrade(id, s, UPGRADES);
    expect(WEAPON).toEqual(weapon);
    expect(PLAYER).toEqual(player);
  });

  it('rejects unknown ids', () => {
    expect(() => applyUpgrade(/** @type {any} */ ('nope'), stats(), UPGRADES)).toThrow();
  });
});

describe('cardText', () => {
  it('shows the rank after choosing', () => {
    const max = UPGRADES.list.find((u) => u.id === 'damage').maxRank;
    expect(cardText('damage', { damage: 1 }, UPGRADES).rank).toBe(`2/${max}`);
    expect(cardText('damage', {}, UPGRADES).rank).toBe(`1/${max}`);
  });

  it('describes the step', () => {
    expect(cardText('damage', {}, UPGRADES).text).toContain(String(step('damage')));
    expect(cardText('patchup', {}, UPGRADES).text).toContain(String(UPGRADES.filler.heal));
  });
});
