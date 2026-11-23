import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so dist/ works from any subdomain or sub-path.
  base: './',
  build: {
    // Phaser is one large module; don't warn about it on every build.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
