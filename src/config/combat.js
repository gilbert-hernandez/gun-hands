// Combat tunables (GH-6). Per-enemy numbers (contact damage, knockback) live on the enemy types
// in enemies.js and player numbers (HP, invulnerability) in player.js.
export const COMBAT = {
  // How long a hit enemy is drawn solid white (ms). A new hit restarts it.
  hitFlashMs: 80,
  // How long a hit enemy is pushed instead of chasing (ms). Speed is per type (`knockback`).
  knockbackMs: 120,
  // Enemy death animations playing at once (GH-12); extra deaths skip the animation.
  deathPoolSize: 32,
  // Impact sparks playing at once (GH-12); extra hits skip the spark.
  impactPoolSize: 24,
  // Impact spark time per frame (ms), from david's GH-18 notes.
  impactFrameMs: 50,
  // Pause after the player's death animation before GameOver starts (ms).
  gameOverDelayMs: 600,
};
