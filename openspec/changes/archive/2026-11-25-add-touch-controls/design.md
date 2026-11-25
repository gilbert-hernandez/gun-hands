# Design

## Context

`Player.update()` reads four keys and `input.activePointer`. Phaser creates one touch pointer by default (`input.activePointers: 1`). `activePointer` is the most recent pointer, and it can't tell a moving thumb from an aiming one. Game pauses for Pause and LevelUp; UI keeps running. A paused scene gets no input events, so Game can miss a release.

Phaser 4.2.1 facts checked in its source: `TOUCH_CANCEL` runs the same up-event path as a release, with `pointer.wasCanceled` set. A touch pointer object is reused once inactive.

## Goals / Non-Goals

**Goals:** two-thumb play, unchanged desktop feel, no stuck sticks, unit-testable math.
**Non-Goals:** see the proposal; phone layout is GH-26.

## Decisions

**1. `PlayerInput` sits between devices and `Player`.** Each frame, `read()` returns `{ move: {x, y}, aimPoint, aimAngle }`: `move` is a unit vector or zero; `aimPoint` is set for a used mouse, `aimAngle` for a stick. `Player` no longer reads devices. Game creates one per session and removes its listeners on SHUTDOWN. *Alternative:* branches inside `Player`; rejected because pointer bookkeeping would mix with combat code.

**2. Pure stick math in `sticks.js`.** `stickVector(origin, point, deadZone)` gives a unit vector or null; `knobOffset(...)` clamps the drawn knob to the radius; `sideOf(x, width)` gives `move` or `aim`. A new `velocityFromVector(v, speed)` goes in `movement.js`; `velocityFrom` stays for keys.

**3. Ownership.** Set `input.activePointers: 2`. A touch takes its side's stick only if that stick is free and stores pointer + `identifier` + `downTime`. Only that pointer moves or releases it, even across the center line. Every frame, `read()` also drops a stick whose pointer is no longer down or whose identifier or downTime changed. That covers releases missed while paused. *Alternative:* a window-level listener; rejected as a second input path.

**4. Resets.** `reset()` runs on Game `PAUSE`, `RESUME` and `SHUTDOWN`, and on death. A finger held through a pause must lift and press again. Focus loss already pauses Game. The last aim survives a reset within the session.

**5. Mode.** `touch` starts on a touch `pointerdown` in play; `keys` starts on W/A/S/D down or a pointer event with `wasTouch` false. Mode changes reset the sticks. Mouse handlers ignore `wasTouch` pointers, so touch never sets `pointerUsed`. The last touch aim is kept until the mouse moves. The mode is stored in the game registry, so it carries to the next session and to menus. Before any input, menus use `device.input.touch` plus the `(pointer: coarse)` media query for wording only.

**6. Display.** `TouchOverlay` in UI draws the base and knob with Graphics from `PlayerInput` state, only while held, and the pause button in touch mode. UI sits above Game and Phaser stops at the top scene with a hit, so pressing pause doesn't start a stick; an e2e test proves it. The button sits below the kill count with a hit area of at least 64×64. It calls `Game.openPause()` on release, ignoring cancelled touches.

**7. LevelUp.** Mouse keeps `pointerdown`. Touch arms a card on `pointerdown` only once `TOUCH.levelUpDelayMs` (600) has passed, and picks on a non-cancelled `pointerup` of the same pointer on the same card. A thumb held at opening never arms anything.

**8. Page.** `touch-action: none`, `overscroll-behavior: none`, `user-select: none` and `-webkit-touch-callout: none` on the game; `contextmenu` prevented on the canvas. iOS can ignore `user-scalable=no`, so it isn't relied on.

**9. Config `TOUCH`.** Stick radius (60), dead zone (12), colors and alphas, pause position and hit size, `levelUpDelayMs`. Starting values, tuned on real phones.

## Testing

Unit tests cover the math and config. E2E runs a `hasTouch` context and sends two-finger input through CDP `Input.dispatchTouchEvent`; Playwright's touchscreen only taps. Waits use game state, not wall-clock time. Emulation can't judge comfort or OS gestures, so the last task uses real phones.

## Risks / Trade-offs

- [Thumbs hide enemies in the lower corners] → sticks are translucent; judge on real phones.
- [Center-line split feels wrong] → an owned stick ignores the line.
- [Touches in letterbox bars do nothing] → accepted until GH-26.
- [Touch laptops switch modes often] → switching is instant and only resets sticks.
- [Schedule] → GH-25 stands alone; GH-26 can shrink to the rotate prompt.
