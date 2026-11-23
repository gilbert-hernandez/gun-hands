// Globals the game sets on window. Type-only; nothing here ships in the bundle.
interface Window {
  /** The running Phaser.Game, set in dev builds only (src/main.js). Read by e2e tests. */
  __GAME__?: import('phaser').Game;
}
