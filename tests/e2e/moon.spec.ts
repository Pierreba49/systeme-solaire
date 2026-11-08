import { test, expect, type Page } from '@playwright/test';

// Nouvelle Lune le 9 novembre 2026 : 7,4 jours plus tard, premier quartier ; 14,8 jours, pleine Lune.
const ANCHOR = '2026-11-09T12:00:00Z';

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test('#lune : les deux vues, et le curseur « Jours » change la phase', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto(`/?date=${ANCHOR}#lune`);
  await expect(page.locator('.moon-title--top')).toContainText('Vue de dessus');
  await expect(page.locator('.moon-title--sky')).toHaveText('Vue du ciel');
  await expect(page.getByText('Lune et Soleil agrandis ×8')).toBeVisible();
  await expect(page.getByText('Agrandissement de la Terre (hors échelle)')).toBeVisible();
  await expect(page.locator('.moon-card__place')).toContainText('Versailles');

  const phase = page.locator('.moon-phase');
  await expect(phase).toContainText('Nouvelle Lune');
  await page.getByRole('slider', { name: 'Jours' }).fill('7.4');
  await expect(phase).toContainText('Premier quartier');
  await page.getByRole('slider', { name: 'Jours' }).fill('14.8');
  await expect(phase).toContainText('Pleine Lune');
  await expect(phase).toContainText('%');

  await page.getByRole('slider', { name: 'Heure' }).fill('6');
  await page.getByRole('button', { name: 'Maintenant' }).click();
  await expect(page.getByRole('slider', { name: 'Jours' })).toHaveValue('0');
  await expect(page.getByRole('slider', { name: 'Heure' })).toHaveValue('0');
  expect(errors).toEqual([]);
});

test('Ma position refusée : message et Versailles conservé, sans erreur console', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/#lune');
  await expect(page.locator('.moon-card__place')).toContainText('Versailles');
  await page.getByRole('button', { name: 'Ma position' }).click();
  await expect(page.getByText('Position non disponible — Versailles')).toBeVisible();
  await expect(page.locator('.moon-card__place')).toContainText('Versailles');
  expect(errors).toEqual([]);
});

test.describe('géolocalisation accordée', () => {
  test.use({ geolocation: { latitude: 43.3, longitude: 5.37 }, permissions: ['geolocation'] });

  test('le cartouche ne montre plus Versailles', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/#lune');
    await expect(page.locator('.moon-card__place')).toContainText('Versailles');
    await page.getByRole('button', { name: 'Ma position' }).click();
    await expect(page.locator('.moon-card__place')).toContainText('Ma position');
    await expect(page.locator('.moon-card__place')).not.toContainText('Versailles');
    await expect(page.getByRole('button', { name: 'Revenir à Versailles' })).toBeVisible();
    await page.getByRole('button', { name: 'Revenir à Versailles' }).click();
    await expect(page.locator('.moon-card__place')).toContainText('Versailles');
    await expect(page.getByRole('button', { name: 'Ma position' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test('éclipses : « Prochaine éclipse de Lune » affiche un libellé daté, et les boutons enchaînent les éclipses', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto(`/?date=${ANCHOR}#lune`);
  const label = page.locator('.moon-tools__eclipse');
  await page.getByRole('button', { name: 'Prochaine éclipse de Lune' }).click();
  await expect(label).toHaveText(/^Éclipse (pénombrale|partielle|totale) de Lune — \d{1,2}(er)? \S+ \d{4}$/);
  const first = await label.textContent();
  await expect(page.locator('.moon-date')).toContainText('2027');

  // Un second appui passe à l'éclipse suivante, et les curseurs repartent de la nouvelle date.
  await page.getByRole('button', { name: 'Prochaine éclipse de Lune' }).click();
  await expect(label).not.toHaveText(first!);
  await expect(page.getByRole('slider', { name: 'Jours' })).toHaveValue('0');

  await page.getByRole('button', { name: 'Prochaine éclipse de Soleil' }).click();
  await expect(label).toHaveText(/^Éclipse (partielle|annulaire|totale|hybride) de Soleil — /);
  expect(errors).toEqual([]);
});

test('vue de côté : le libellé « 5° » apparaît, le bouton bascule vers la vue de dessus', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto(`/?date=${ANCHOR}#lune`);
  const tilt = page.locator('.moon-top-label--inclination');
  await expect(tilt).toBeHidden();
  await page.getByRole('button', { name: 'Vue de côté' }).click();
  await expect(tilt).toBeVisible();
  await expect(tilt).toHaveText('5°');
  await expect(page.locator('.moon-title--top')).toContainText('Vue de côté');
  await page.getByRole('button', { name: 'Vue de dessus' }).click();
  await expect(tilt).toBeHidden();
  await expect(page.getByRole('button', { name: 'Vue de côté' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('face cachée : le bouton fige la Lune, affiche le repère, et se désactive en quittant le chapitre', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto(`/?date=${ANCHOR}#lune`);
  const freeze = page.getByRole('button', { name: 'Et si la Lune ne tournait pas ?' });
  const mark = page.getByRole('checkbox', { name: 'Montrer le repère' });
  await expect(freeze).toHaveAttribute('aria-pressed', 'false');
  await expect(mark).not.toBeChecked();
  await freeze.click();
  await expect(freeze).toHaveAttribute('aria-pressed', 'true');
  await expect(mark).toBeChecked();
  await page.getByRole('slider', { name: 'Jours' }).fill('7');

  await page.goto('/#systeme-solaire');
  await page.goto(`/#lune`);
  await expect(page.getByRole('button', { name: 'Et si la Lune ne tournait pas ?' })).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
