import Phaser from 'phaser';

/**
 * Make touches in the black bars beside the canvas work like touches on it (GH-26). Phaser hears
 * them start and end on the window, but ignores every move that isn't over the canvas, so those
 * moves are applied to its pointers here (sticks poll the pointers). That includes a touch that
 * began on the canvas and slid off. Long-press menus are blocked out here too.
 * @param {Phaser.Game} game
 */
export function trackBarTouches(game) {
  /** @param {TouchEvent} event */
  const onMove = (event) => {
    if (!game.input.enabled) return;
    for (const touch of event.changedTouches) {
      if (document.elementFromPoint(touch.clientX, touch.clientY) === game.canvas) continue;
      // `touchmove` is missing from Phaser's type definitions.
      const pointer = /** @type {any} */ (
        game.input.pointers.find((p) => p.active && p.wasTouch && p.identifier === touch.identifier)
      );
      pointer?.touchmove(touch, event);
    }
    if (event.cancelable) event.preventDefault();
  };
  /** @param {Event} event */
  const onMenu = (event) => event.preventDefault();
  window.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('contextmenu', onMenu);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('touchmove', onMove);
    document.removeEventListener('contextmenu', onMenu);
  });
}

/** Keep touches and clicks on the rotate prompt from reaching the game underneath (GH-26). */
export function shieldRotatePrompt() {
  const prompt = document.getElementById('rotate');
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mousemove', 'mouseup']) {
    prompt?.addEventListener(type, (event) => event.stopPropagation());
  }
}
