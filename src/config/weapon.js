// Weapon tunables (GH-3). The player copies these at the start of each session
// (`player.weapon`); upgrades and powerups change that copy, never this object.
export const WEAPON = {
  // Shots per second.
  fireRate: 4,
  // Distance in px from the player's center to the gun tip, along the aim.
  muzzleOffset: 14,
  // Max bullets alive at once (object pool size). Fits maxed upgrades plus Rapid Fire and Spread Shot (GH-9).
  poolSize: 160,
  // How long the muzzle flash stays visible per shot (ms).
  muzzleFlashMs: 60,
  bullet: {
    // px/s. Keep under ~1900 (32 px tile x 60 Hz physics) or bullets can tunnel through 1-tile walls.
    // Above ~800 px/s a bullet can step past the 14 px Runner hurtbox at low frame rates (GH-6).
    speed: 480,
    damage: 10,
    // ms in flight before despawning
    lifetime: 1200,
    // Extra enemies a bullet can pass through (0 = stops at the first).
    pierce: 0,
    // Projectiles per shot.
    count: 1,
    // Total fan width in degrees when count > 1.
    spreadDeg: 15,
  },
};
