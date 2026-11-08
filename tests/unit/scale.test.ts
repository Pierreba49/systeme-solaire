import { describe, expect, test } from 'vitest';
import { AU_KM, moonOffset, sceneDistance, sceneRadius } from '../../src/astro/scale';
import { BODIES, ORDER } from '../../src/data/bodies';

describe('échelles', () => {
  test('t = 0 et t = 1 : valeurs exactes', () => {
    expect(sceneDistance(1, 0)).toBe(8);
    expect(sceneDistance(1, 1)).toBe(8);
    expect(sceneDistance(30, 1)).toBe(240);
    expect(sceneRadius(6371, 0)).toBeCloseTo(0.35, 6);
    expect(sceneRadius(6371, 1)).toBeCloseTo((8 * 6371) / AU_KM, 9);
  });

  test('aucune planète ne traverse le Soleil, quel que soit t', () => {
    for (let t = 0; t <= 1.0001; t += 0.05)
      for (const id of ORDER) {
        const b = BODIES[id];
        expect(sceneDistance(b.perihelionAu!, t) - sceneRadius(BODIES.sun.radiusKm, t)).toBeGreaterThan(
          sceneRadius(b.ringOuterKm ?? b.radiusKm, t),
        );
      }
  });

  test("l'ordre des distances est conservé", () => {
    for (const t of [0, 0.5, 1]) {
      const d = ORDER.map((id) => sceneDistance(BODIES[id].perihelionAu!, t));
      for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1]);
    }
  });

  test('la Lune reste hors de la Terre', () => {
    for (let t = 0; t <= 1.0001; t += 0.05)
      expect(moonOffset(356_000, t)).toBeGreaterThan(sceneRadius(6371, t) + sceneRadius(1737.4, t));
  });
});
