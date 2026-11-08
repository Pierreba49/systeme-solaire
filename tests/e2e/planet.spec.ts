import { test, expect } from '@playwright/test';

test('Saturne : titre, lignes de fiche, notes et bandeau', async ({ page }) => {
  await page.goto('/#planete/saturn');
  await expect(page.getByRole('heading', { name: 'Saturne' })).toBeVisible();
  const lignes = page.locator('.fiche__chiffre');
  await expect(lignes.first()).toBeVisible();
  expect(await lignes.count()).toBeGreaterThanOrEqual(3);

  const panneau = page.locator('.presenter-notes__panel');
  await expect(panneau).toBeHidden();
  await page.getByRole('button', { name: 'Notes' }).click();
  await expect(panneau).toBeVisible();
  expect((await panneau.locator('li').count())).toBeGreaterThan(0);
  expect((await panneau.innerText()).trim().length).toBeGreaterThan(0);

  await expect(page.locator('.body-strip button')).toHaveCount(10);
  await page.locator('.body-strip button', { hasText: 'Mars' }).click();
  await expect(page).toHaveURL(/#planete\/mars$/);
  await expect(page.getByRole('heading', { name: 'Mars' })).toBeVisible();
});

test('#planete sans corps affiche la Terre', async ({ page }) => {
  await page.goto('/#planete');
  await expect(page.getByRole('heading', { name: 'Terre' })).toBeVisible();
  await expect(page.locator('.body-strip button[aria-current="true"]')).toHaveText('Terre');
  await expect(page.getByText('distance réduite')).toBeVisible();
});
