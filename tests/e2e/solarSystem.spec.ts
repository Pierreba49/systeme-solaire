import { test, expect, type Page } from '@playwright/test';

const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

async function expectLabelCentresInViewport(page: Page): Promise<void> {
  const size = page.viewportSize()!;
  for (const id of PLANETS) {
    const box = await page.locator(`.body-label[data-body="${id}"] .body-label__target`).boundingBox();
    expect(box, id).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    expect(cx, id).toBeGreaterThan(0);
    expect(cx, id).toBeLessThan(size.width);
    expect(cy, id).toBeGreaterThan(0);
    expect(cy, id).toBeLessThan(size.height);
  }
}

test('échelle réelle : cartouche et 8 étiquettes d’au moins 6 px après 7 s', async ({ page }) => {
  await page.goto('/#echelle-reelle');
  await page.waitForTimeout(7000);
  await expect(page.getByText(/Échelle réelle — les planètes sont trop petites/)).toBeVisible();
  for (const id of PLANETS) {
    const label = page.locator(`.body-label[data-body="${id}"]`);
    await expect(label).toBeVisible();
    const box = await label.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(6);
    expect(box!.height).toBeGreaterThanOrEqual(6);
    const dot = await label.locator('.body-label__dot').boundingBox();
    expect(dot!.width).toBeGreaterThanOrEqual(6);
  }
  await expectLabelCentresInViewport(page);
});

test('système solaire : vue compressée, les 8 planètes sont dans l’écran', async ({ page }) => {
  await page.goto('/#systeme-solaire');
  await expect(page.getByText(/Vue compressée — tailles et distances/)).toBeVisible();
  await expect(page.locator('.body-label[data-body="neptune"]')).toBeVisible();
  await expectLabelCentresInViewport(page);
});

test('un toucher au centre du point de Mercure ouvre Mercure, malgré les planètes voisines', async ({ page }) => {
  await page.goto('/#systeme-solaire');
  const target = page.locator('.body-label[data-body="mercury"] .body-label__target');
  await expect(target).toBeVisible();
  const box = (await target.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL(/#planete\/mercury$/);
});
