import { test, expect } from '@playwright/test';

test('fonctionne hors ligne après un premier chargement', async ({ page, context }) => {
  await page.goto('/#lune');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => window.__texturesWarm === true, null, { timeout: 60_000 });
  await context.setOffline(true);
  const failed: string[] = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  await page.reload();
  await expect(page.locator('canvas#scene')).toBeVisible();
  await page.goto('/#planete/jupiter');
  await page.waitForTimeout(1500);
  expect(failed).toEqual([]);
});
