// Player tunables. Scene/entity code reads these; don't hard-code them elsewhere.
export const PLAYER = {
  // Move speed in px/s (diagonals are normalized to the same speed).
  speed: 200,
  // Arcade Physics hurtbox inside the 32x32 sprite, on the torso and feet as drawn facing right
  // (GH-12: david's body spans x 4-21, y 1-29). Facing left mirrors offsetX; the size never changes.
  hurtbox: { width: 16, height: 20, offsetX: 5, offsetY: 9 },
  // Starting and max HP for each session (GH-6).
  maxHp: 100,
  // Invulnerability after taking a hit (ms); the player blinks meanwhile.
  invulnerableMs: 1000,
  // Blink period while invulnerable (ms per visible/hidden half).
  blinkMs: 80,
  // Starting pickup radius (px, from the player's center) for XP gems (GH-7). Per run: upgrades change
  // `player.pickupRadius`, never this value. 0 turns the magnet off.
  pickupRadius: 80,
  // Animation time per frame (ms), from david's GH-16 notes. Idle and run loop; hurt, death and the
  // guns' recoil play once.
  frameMs: { idle: 160, run: 90, hurt: 90, death: 120, recoil: 50 },
};
