import { defineConfig, devices } from '@playwright/test';

// Browser tests for Gun Hands. Run `npm run e2e`.
// Every test records a video; find it under test-results/<test>/video.webm.
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  // On CI: a stray test.only fails the run, and one retry absorbs a software-WebGL hiccup.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 960, height: 540 },
    video: { mode: 'on', size: { width: 960, height: 540 } },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // WebGL in headless Chromium without a GPU.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 960, height: 540 } } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
