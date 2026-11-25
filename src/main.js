import Phaser from 'phaser';
import { DISPLAY, DEBUG } from './config/index.js';
import { trackBarTouches, shieldRotatePrompt } from './input/barTouches.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import LevelUpScene from './scenes/LevelUpScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: DISPLAY.backgroundColor,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // One touch per thumb (GH-25); Phaser's default is a single touch.
  input: { activePointers: 2 },
  disableContextMenu: true,
  physics: {
    default: 'arcade',
    arcade: { debug: DEBUG.physics },
  },
  scene: [BootScene, PreloadScene, TitleScene, GameScene, UIScene, LevelUpScene, PauseScene, GameOverScene],
});

trackBarTouches(game);
shieldRotatePrompt();

if (import.meta.env.DEV) {
  window.__GAME__ = game; // handy in the browser console
}
