import { test, expect } from '@playwright/test';

test('charge sans erreur console et affiche un canvas WebGL', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page.locator('canvas#scene')).toBeVisible();
  expect(errors).toEqual([]);
});

test('en portrait, demande de tourner la tablette', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/');
  await expect(page.getByText('Tourne la tablette')).toBeVisible();
});
