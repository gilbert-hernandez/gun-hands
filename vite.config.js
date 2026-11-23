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
    coverage: {
      provider: 'v8',
      // All of src/, so untested files (scenes) show as 0% instead of being hidden.
      include: ['src/**/*.js'],
      reporter: [['text', { skipFull: false }], 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
