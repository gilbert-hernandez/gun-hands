// Combat tunables (GH-6). Per-enemy numbers (contact damage, knockback) live on the enemy types
// in enemies.js and player numbers (HP, invulnerability) in player.js.
export const COMBAT = {
  // How long a hit enemy is drawn solid white (ms). A new hit restarts it.
  hitFlashMs: 80,
  // How long a hit enemy is pushed instead of chasing (ms). Speed is per type (`knockback`).
  knockbackMs: 120,
  // Death puff sprites alive at once; extra deaths skip the puff.
  puffPoolSize: 32,
  // Pause after the player's death animation before GameOver starts (ms).
  gameOverDelayMs: 600,
};
