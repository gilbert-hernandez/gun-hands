// Player tunables. Scene/entity code reads these; don't hard-code them elsewhere.
export const PLAYER = {
  // Move speed in px/s (diagonals are normalized to the same speed).
  speed: 200,
  // Arcade Physics hurtbox inside the 32x32 sprite: lower-middle (torso + feet).
  hurtbox: { width: 16, height: 20, offsetX: 8, offsetY: 10 },
  // Starting and max HP for each session (GH-6).
  maxHp: 100,
  // Invulnerability after taking a hit (ms); the player blinks meanwhile.
  invulnerableMs: 1000,
  // Blink period while invulnerable (ms per visible/hidden half).
  blinkMs: 80,
  // Starting pickup radius (px, from the player's center) for XP gems (GH-7). Per run: upgrades change
  // `player.pickupRadius`, never this value. 0 turns the magnet off.
  pickupRadius: 80,
  // Animation frame rates (fps). `death` plays once.
  anims: { idle: 6, run: 10, death: 10 },
};
