import Phaser from 'phaser';
import { PLAYER, WEAPON } from '../config/index.js';
import { velocityFromVector, facingFrom, hurtboxOffsetX } from './movement.js';
import { aimAngle, spreadAngles, shotsDue, gunsFlipY, pathBlocked } from '../weapon/aim.js';
import { BODY_RADIUS as BULLET_RADIUS } from '../weapon/Bullets.js';
import { applyDamage, blinkVisible, tickTimer } from '../combat/rules.js';
import { PLAYER_FIRED } from './events.js';
import { ensureAnim } from '../fx/anims.js';

const ANIM_IDLE = 'player_body_idle';
const ANIM_RUN = 'player_body_run';
const ANIM_DEATH = 'player_body_death';
const ANIM_HURT = 'player_body_hurt';
const GUNS_IDLE = 'player_guns_idle';
const ANIM_RECOIL = 'player_guns_recoil';

// Re-exported so existing `import { PLAYER_FIRED } from './Player.js'` keeps working.
export { PLAYER_FIRED };

/**
 * The player: an Arcade physics sprite for the body (with a hurtbox smaller than the sprite)
 * plus a plain sprite for the gun-hands that follows the body and rotates toward the aim.
 * The guns auto-fire bullets from the pool at `weapon.fireRate`.
 * The player has HP, blinks while invulnerable after a hit, and stops for good on death (GH-6).
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {import('../weapon/Bullets.js').default} bullets the bullet pool to fire from
   * @param {import('../input/PlayerInput.js').default} controls what the player wants to do (GH-25)
   */
  constructor(scene, x, y, bullets, controls) {
    super(scene, x, y, ANIM_IDLE);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const { width, height, offsetX, offsetY } = PLAYER.hurtbox;
    this.body.setSize(width, height, false).setOffset(offsetX, offsetY);
    this.setCollideWorldBounds(true);

    this.guns = scene.add.sprite(x, y, GUNS_IDLE);
    this.guns.setDepth(1);
    // After each shot's recoil, the guns go back to their idle frame (GH-12).
    this.guns.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + ANIM_RECOIL, () => this.guns.setTexture(GUNS_IDLE));

    /** @type {'left' | 'right'} */
    this.facing = 'right';
    this.controls = controls;
    this.bullets = bullets;
    /**
     * Wall test for point-blank shots, set by the scene once the arena exists (null = no walls).
     * @type {((x: number, y: number) => boolean) | null}
     */
    this.isSolidAt = null;
    // Per-run weapon stats: upgrades change this copy, never the config.
    this.weapon = structuredClone(WEAPON);
    /**
     * The weapon each shot uses: `weapon` plus any active powerup boosts. Powerups (GH-9) replace
     * this hook; by default it is the per-run weapon itself.
     * @type {() => typeof WEAPON}
     */
    this.boosts = () => this.weapon;
    // Aim angle in radians (0 = right); points the way the body faces until the mouse or aim stick is used.
    this.aim = 0;
    this.fireAcc = 0;
    this.maxHp = PLAYER.maxHp;
    this.hp = PLAYER.maxHp;
    // Kept in sync by the XP system (GH-7); run stats report it.
    this.level = 1;
    // Per-run XP pickup radius in px: upgrades change this copy, never the config.
    this.pickupRadius = PLAYER.pickupRadius;
    // Per-run move speed in px/s: the Move Speed upgrade changes this copy, never the config (GH-8).
    this.speed = PLAYER.speed;
    this.dead = false;
    /** ms of invulnerability left after a hit (blinking while > 0). */
    this.invulnerableMs = 0;
    /** ms of the hurt animation left after a hit (GH-12); run/idle resume at 0. */
    this.hurtMs = 0;

    ensureAnim(scene, ANIM_IDLE, PLAYER.frameMs.idle);
    ensureAnim(scene, ANIM_RUN, PLAYER.frameMs.run);
    ensureAnim(scene, ANIM_DEATH, PLAYER.frameMs.death, { loop: false });
    ensureAnim(scene, ANIM_HURT, PLAYER.frameMs.hurt, { loop: false });
    ensureAnim(scene, ANIM_RECOIL, PLAYER.frameMs.recoil, { loop: false });
    this.play(ANIM_IDLE);

    // Sync the guns after physics has moved the body this frame (no one-frame lag).
    // Rotation replaces flipX; flipY keeps them right side up when aiming left.
    const syncGuns = () => this.guns.setPosition(this.x, this.y).setRotation(this.aim).setFlipY(gunsFlipY(this.aim));
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, syncGuns);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, syncGuns);
    });
  }

  /**
   * Read input, set velocity, facing, animation and aim, then fire any shots that are due.
   * Call once per frame from the scene.
   * @param {number} time scene time in ms
   * @param {number} delta frame time in ms
   */
  update(time, delta) {
    if (this.dead) return;
    this.tickInvulnerable(delta);
    // Counted on scene time like the other combat timers, so it holds while the game is paused.
    if (this.hurtMs > 0) this.hurtMs = tickTimer(this.hurtMs, delta);

    const { move, aimPoint, aimAngle: stickAngle } = this.controls.read();
    const v = velocityFromVector(move, this.speed);
    this.setVelocity(v.x, v.y);

    let aimX = aimPoint?.x;
    // Rounded, so a straight up or down stick has no side (cos of ±90° isn't exactly 0).
    if (stickAngle !== null) aimX = this.x + Math.round(Math.cos(stickAngle) * 1e6);
    const pointerUsed = aimX !== undefined;
    const facing = facingFrom({ vx: v.x, aimX, playerX: this.x, pointerUsed, current: this.facing });
    if (facing !== this.facing) this.setFacing(facing);

    const moving = v.x !== 0 || v.y !== 0;
    if (this.hurtMs <= 0) this.play(moving ? ANIM_RUN : ANIM_IDLE, true);

    const facingAngle = this.facing === 'left' ? Math.PI : 0;
    if (aimPoint) this.aim = aimAngle(this, aimPoint, facingAngle);
    else this.aim = stickAngle ?? facingAngle;

    this.fire(time, delta);
  }

  /**
   * Face left or right: the art faces right and flips for left, and the hurtbox mirrors with it so it
   * stays on the drawn body (same size either way).
   * @param {'left' | 'right'} facing
   */
  setFacing(facing) {
    this.facing = facing;
    this.setFlipX(facing === 'left');
    const { width, height, offsetY } = PLAYER.hurtbox;
    const oldX = this.body.offset.x;
    const newX = hurtboxOffsetX(facing, PLAYER.hurtbox, this.frame.width);
    this.body.setOffset(newX, offsetY);
    // Arcade only separates a body from a tile along its movement, so turning (say, by aiming) while
    // flush against a wall would leave the mirrored hurtbox inside it. In that case move the sprite
    // instead, so the hurtbox stays exactly where it was.
    const left = this.body.position.x + newX - oldX;
    const top = this.body.position.y;
    if (this.isSolidAt !== null && boxHitsSolid(left, top, width, height, this.isSolidAt)) {
      this.x += oldX - newX;
    }
  }

  /** Fire the shots due this frame from the gun tip, one `PLAYER_FIRED` event per shot. */
  fire(time, delta) {
    const { fireRate, muzzleOffset, bullet } = this.boosts();
    const due = shotsDue(this.fireAcc, delta, fireRate);
    this.fireAcc = due.acc;
    for (let i = 0; i < due.shots; i++) {
      const x = this.x + Math.cos(this.aim) * muzzleOffset;
      const y = this.y + Math.sin(this.aim) * muzzleOffset;
      // Flush against a wall the gun tip is inside it: the shot hits the wall, nothing spawns.
      const blocked =
        this.isSolidAt !== null && pathBlocked(this.x, this.y, this.aim, muzzleOffset + BULLET_RADIUS, this.isSolidAt);
      if (!blocked) {
        // A full pool returns null; that bullet is simply skipped.
        for (const angle of spreadAngles(this.aim, bullet.count, bullet.spreadDeg)) {
          this.bullets.fire(x, y, angle, bullet, time);
        }
        // Restart the recoil on every shot, even mid-animation.
        this.guns.play(ANIM_RECOIL);
      }
      this.scene.events.emit(PLAYER_FIRED, { x, y, angle: this.aim, blocked });
    }
  }

  /**
   * Lose `amount` HP (floored at 0) and, if still alive, become invulnerable.
   * Callers check invulnerability first (see `Combat.damagePlayer`).
   * @param {number} amount
   * @returns {{ hp: number, dead: boolean }}
   */
  takeDamage(amount) {
    const r = applyDamage(this.hp, amount, true);
    this.hp = r.hp;
    if (!r.dead) {
      this.invulnerableMs = PLAYER.invulnerableMs;
      this.hurtMs = this.anims.animationManager.get(ANIM_HURT).frames.length * PLAYER.frameMs.hurt;
      this.play(ANIM_HURT);
    }
    return r;
  }

  /**
   * Restore `amount` HP, capped at max HP (default: full heal, the dev shortcut).
   * @param {number} [amount]
   */
  heal(amount = this.maxHp) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Count invulnerability down on scene time and blink body and guns meanwhile. */
  tickInvulnerable(delta) {
    if (this.invulnerableMs <= 0) return;
    this.invulnerableMs = tickTimer(this.invulnerableMs, delta);
    const visible = blinkVisible(this.invulnerableMs, PLAYER.blinkMs);
    this.setVisible(visible);
    this.guns.setVisible(visible);
  }

  /**
   * Die: stop moving and firing, hide the guns, and play the death animation once.
   * @param {() => void} onDone called when the death animation finishes
   */
  die(onDone) {
    this.dead = true;
    this.controls.disable();
    this.invulnerableMs = 0;
    this.hurtMs = 0;
    this.setVelocity(0, 0);
    this.setVisible(true);
    this.guns.setVisible(false);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + ANIM_DEATH, onDone);
    this.play(ANIM_DEATH);
  }

  destroy(fromScene) {
    this.guns?.destroy(fromScene);
    super.destroy(fromScene);
  }
}

/**
 * True if any corner of the box (inset half a pixel, so touching edges don't count) is solid.
 * @param {number} left
 * @param {number} top
 * @param {number} width
 * @param {number} height
 * @param {(x: number, y: number) => boolean} isSolidAt
 */
function boxHitsSolid(left, top, width, height, isSolidAt) {
  const l = left + 0.5;
  const t = top + 0.5;
  const r = left + width - 0.5;
  const b = top + height - 0.5;
  return isSolidAt(l, t) || isSolidAt(r, t) || isSolidAt(l, b) || isSolidAt(r, b);
}
