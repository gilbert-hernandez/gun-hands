import { LAYERS } from './arenaMap.js';

/** Tilemap cache key (loaded in PreloadScene). */
export const MAP_KEY = 'map_arena';
/** Tileset name inside the Tiled map, and the manifest key it draws from. */
const TILESET_NAME = 'gh_tiles_arena';
const TILESET_KEY = 'tiles_arena';
// All map layers sit below the actors (which use depth >= 0).
const DEPTH = { floor: -10, decor: -9, walls: -8 };

/**
 * The arena level built from the Tiled map: floor, decor and solid walls, plus the player spawn.
 * Other code goes through this instead of Phaser's tilemap API: `collide()` for anything that
 * should be stopped by walls, `isSolidAt()` to test a position.
 */
export default class Arena {
  /** @param {import('phaser').Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.map = scene.make.tilemap({ key: MAP_KEY });
    const tileset = this.map.addTilesetImage(TILESET_NAME, TILESET_KEY);

    this.floor = this.map.createLayer(LAYERS.floor, tileset, 0, 0).setDepth(DEPTH.floor);
    this.decor = this.map.createLayer(LAYERS.decor, tileset, 0, 0).setDepth(DEPTH.decor);
    this.walls = this.map.createLayer(LAYERS.walls, tileset, 0, 0).setDepth(DEPTH.walls);
    // Every tile on the walls layer is solid, whatever it looks like (see design: collision by layer).
    this.walls.setCollisionByExclusion([-1]);

    /** Map size in px. */
    this.width = this.map.widthInPixels;
    this.height = this.map.heightInPixels;

    const point = this.map.findObject(LAYERS.spawns, (o) => o.name === 'player');
    if (!point) throw new Error('Arena map has no "player" spawn point');
    /** Player start position in px. */
    this.spawn = { x: point.x, y: point.y };
  }

  /**
   * Make `target` (a physics sprite or group) collide with the walls.
   * @param {import('phaser').Types.Physics.Arcade.ArcadeColliderType} target
   * @param {import('phaser').Types.Physics.Arcade.ArcadePhysicsCallback} [onHit] called with (object, tile) on contact
   * @returns {import('phaser').Physics.Arcade.Collider}
   */
  collide(target, onHit) {
    return this.scene.physics.add.collider(target, this.walls, onHit);
  }

  /**
   * True if the world position is on a wall tile (or outside the map).
   * @param {number} x
   * @param {number} y
   */
  isSolidAt(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    return this.walls.getTileAtWorldXY(x, y) !== null;
  }
}
