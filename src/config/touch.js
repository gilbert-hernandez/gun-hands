// Touch control tunables (GH-25). Sizes and positions are screen pixels at the 960×540 base resolution.
export const TOUCH = {
  stick: {
    // The drawn knob stays within this distance of where the thumb landed.
    radius: 60,
    knobRadius: 26,
    // Thumb travel before the stick counts as pushed.
    deadZone: 12,
    color: 0xffffff,
    baseAlpha: 0.15,
    ringAlpha: 0.35,
    knobAlpha: 0.45,
  },
  // On-screen pause button, by its center. It sits under the HUD's kill count.
  pause: { x: 916, y: 76, hitSize: 64, size: 40, fill: 0x000000, fillAlpha: 0.35, color: 0xffffff, colorAlpha: 0.8 },
  // LevelUp ignores touches that start this soon after it opens (the thumbs are on the sticks).
  levelUpDelayMs: 600,
};
