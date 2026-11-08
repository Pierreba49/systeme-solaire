import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { bodyOrientation, surfaceDirection } from '../../src/astro/orientation';
import { moonGeocentricEcliptic, sunGeocentricEcliptic } from '../../src/astro/ephemeris';
import { eclipticToScene } from '../../src/scene/coords';

describe('orientation des corps', () => {
  test("pôle nord de la Terre incliné de 23,44° sur le pôle de l'écliptique", () => {
    const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(bodyOrientation('earth', new Date('2026-01-01Z')));
    expect(THREE.MathUtils.radToDeg(pole.angleTo(new THREE.Vector3(0, 1, 0)))).toBeCloseTo(23.44, 1);
  });

  test('solstice de juin, 12 h UTC : le point (23,44° N, 0°) fait face au Soleil', () => {
    const d = new Date('2026-06-21T12:00Z');
    const sun = eclipticToScene(sunGeocentricEcliptic(d)).normalize();
    expect(surfaceDirection('earth', 23.44, 0, d).dot(sun)).toBeGreaterThan(0.999);
  });

  test('la Lune tourne toujours la même face vers la Terre', () => {
    for (const day of [0, 7, 14, 21]) {
      const d = new Date(Date.UTC(2026, 10, 1 + day));
      const toEarth = eclipticToScene(moonGeocentricEcliptic(d)).negate().normalize();
      expect(surfaceDirection('moon', 0, 0, d).dot(toEarth)).toBeGreaterThan(0.98); // la libration reste sous ~8°
    }
  });
});

describe('fond étoilé', () => {
  test("le plan galactique est incliné de 60,2° sur l'écliptique", async () => {
    const { galacticOrientation } = await import('../../src/scene/starfield');
    const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(galacticOrientation());
    expect(THREE.MathUtils.radToDeg(pole.angleTo(new THREE.Vector3(0, 1, 0)))).toBeCloseTo(60.2, 0);
  });
});
