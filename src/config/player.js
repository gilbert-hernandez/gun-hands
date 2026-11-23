// Player tunables. Scene/entity code reads these; don't hard-code them elsewhere.
export const PLAYER = {
  // Move speed in px/s (diagonals are normalized to the same speed).
  speed: 200,
  // Arcade Physics hurtbox inside the 32x32 sprite: lower-middle (torso + feet).
  hurtbox: { width: 16, height: 20, offsetX: 8, offsetY: 10 },
  // Animation frame rates (fps).
  anims: { idle: 6, run: 10 },
};
