import { test, expect } from '@playwright/test';

/** Wait until the given Phaser scene is active (uses window.__GAME__, dev builds only). */
async function waitForScene(page, key) {
  await page.waitForFunction((k) => window.__GAME__?.scene.isActive(k), key);
}

test('boots to the title screen and starts the game', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('#game canvas')).toBeVisible();
  await waitForScene(page, 'Title');
  await page.waitForTimeout(1000); // let the title show on the video

  await page.keyboard.press('Enter');
  await waitForScene(page, 'Game');
  await waitForScene(page, 'UI');
  await page.waitForTimeout(2000);

  expect(errors).toEqual([]);
});
