// Display and debug tunables. Scene code reads these; don't hard-code them elsewhere.
export const DISPLAY = {
  width: 960,
  height: 540,
  backgroundColor: '#000000',
};

export const DEBUG = {
  // Dev-only shortcuts (L = LevelUp, G = GameOver) and scene name labels.
  // On in `npm run dev`, off in production builds. Set to true/false to override.
  enabled: import.meta.env?.DEV ?? false,
  // Draw Arcade Physics bodies.
  physics: false,
  // Dev builds keep the last `max` run summaries in localStorage under `storageKey` (GH-13).
  runLog: { storageKey: 'gunhands.runs', max: 20 },
};
