// Which sound effect files actually exist in src/assets/sfx/, mapped slug -> URL (GH-29).
// Same approach as assets/available.js: Vite resolves this at build time (hashed URLs), so a
// missing WAV is simply absent here instead of failing to load.
const found = import.meta.glob('../assets/sfx/*.wav', { eager: true, query: '?url', import: 'default' });

/** @type {Record<string, string>} */
export const AVAILABLE_SOUNDS = Object.fromEntries(
  Object.entries(found).map(([path, url]) => [path.replace(/^.*\//, '').replace(/\.wav$/, ''), url]),
);
