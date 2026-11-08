import { describe, expect, test } from 'vitest';
import { easeScale, framingDistance, scenePosition } from '../../src/chapters/solarSystem';
import { heliocentricEcliptic } from '../../src/astro/ephemeris';
import { sceneDistance } from '../../src/astro/scale';
import { ORDER } from '../../src/data/bodies';

const D = new Date('2026-11-08T12:00:00Z');

describe('scenePosition', () => {
  test('la norme vaut sceneDistance(|r|, t)', () => {
    for (const id of ORDER)
      for (const t of [0, 0.3, 1]) {
        const r = heliocentricEcliptic(id, D);
        const au = Math.hypot(r.x, r.y, r.z);
        expect(scenePosition(id, D, t).length()).toBeCloseTo(sceneDistance(au, t), 9);
      }
  });

  test('la direction ne dépend pas de t', () => {
    for (const id of ORDER) {
      const a = scenePosition(id, D, 0).normalize();
      const b = scenePosition(id, D, 0.6).normalize();
      const c = scenePosition(id, D, 1).normalize();
      expect(a.distanceTo(b)).toBeLessThan(1e-9);
      expect(a.distanceTo(c)).toBeLessThan(1e-9);
    }
  });

  test('à t = 1, Neptune est entre 29,8×8 et 30,4×8 unités', () => {
    const n = scenePosition('neptune', D, 1).length();
    expect(n).toBeGreaterThan(29.8 * 8);
    expect(n).toBeLessThan(30.4 * 8);
  });

  test('le plan de l’écliptique est le plan XZ (Y vers le pôle nord écliptique)', () => {
    const v = scenePosition('earth', D, 1);
    expect(Math.abs(v.y)).toBeLessThan(0.01 * v.length());
  });
});

describe('easeScale', () => {
  test('easeInOutCubic', () => {
    expect(easeScale(0)).toBe(0);
    expect(easeScale(1)).toBe(1);
    expect(easeScale(0.5)).toBeCloseTo(0.5, 12);
    expect(easeScale(0.25)).toBeCloseTo(4 * 0.25 ** 3, 12);
    expect(easeScale(0.75)).toBeCloseTo(1 - (-2 * 0.75 + 2) ** 3 / 2, 12);
  });
});

describe('framingDistance', () => {
  test('≈ 110 à t = 0 et ≈ 607 à t = 1 en 16:10', () => {
    expect(framingDistance(0, 1.44)).toBeGreaterThan(105);
    expect(framingDistance(0, 1.44)).toBeLessThan(115);
    expect(framingDistance(1, 1.44)).toBeGreaterThan(600);
    expect(framingDistance(1, 1.44)).toBeLessThan(615);
  });
  test('un écran plus étroit éloigne la caméra', () => {
    expect(framingDistance(0, 0.6)).toBeGreaterThan(framingDistance(0, 1.44));
  });
});
