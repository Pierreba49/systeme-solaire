import { test, expect } from '@playwright/test';

test('le menu liste les 4 chapitres et la navigation met à jour le hash', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  for (const t of ['Système solaire', 'Les planètes', 'La Lune', 'Échelle réelle'])
    await expect(page.getByRole('link', { name: t })).toBeVisible();
  await page.getByRole('link', { name: 'La Lune' }).click();
  await expect(page).toHaveURL(/#lune$/);
});

test('après perte puis rétablissement du contexte WebGL, on reste sur le chapitre', async ({ page }) => {
  await page.goto('/#lune');
  await expect(page.locator('canvas#scene')).toBeVisible();
  await page.evaluate(() => { (window as unknown as { __beforeReload?: boolean }).__beforeReload = true; });
  const reloaded = page.waitForEvent('load');
  await page.evaluate(async () => {
    const gl = (document.querySelector('canvas#scene') as HTMLCanvasElement).getContext('webgl2')!;
    const ext = gl.getExtension('WEBGL_lose_context')!;
    ext.loseContext(); await new Promise(r => setTimeout(r, 200)); ext.restoreContext();
  });
  await reloaded;
  expect(await page.evaluate(() => (window as unknown as { __beforeReload?: boolean }).__beforeReload)).toBeUndefined();
  await expect(page).toHaveURL(/#lune$/);
  await expect(page.locator('canvas#scene')).toBeVisible();
});

test('le menu ouvre l’écran Sources avec les crédits CC BY 4.0', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Sources' }).click();
  const panel = page.getByRole('dialog', { name: 'Sources' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('link', { name: /Creative Commons Attribution 4.0/ })).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by/4.0/',
  );
  await expect(panel).toContainText('Solar System Scope');
  await expect(panel).toContainText('version 2k');
});

test('le menu se ferme en touchant ailleurs et avec Échap', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator('#menu-panel');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(panel).toBeVisible();
  await page.mouse.click(600, 500);
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

// Le service worker répondrait à la place du réseau : on le bloque pour que page.route voie les textures.
test.describe('chapitre en échec', () => {
test.use({ serviceWorkers: 'block' });
test('échec de chargement d’un chapitre : message, puis Réessayer rétablit le chapitre', async ({ page }) => {
  await page.route('**/textures/**', (route) => route.fulfill({ status: 404, body: 'absent' }));
  await page.goto('/#lune');
  const message = page.getByText('Impossible de charger ce chapitre.');
  await expect(message).toBeVisible();
  const retry = page.getByRole('button', { name: 'Réessayer' });
  const box = await retry.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.unroute('**/textures/**');
  await retry.click();
  await expect(message).toBeHidden();
  await expect(page.locator('.moon-title--top')).toContainText('Vue de dessus');
});
});
