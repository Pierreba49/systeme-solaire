import { describe, expect, test } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import {
  moonGeocentricEcliptic,
  nextLunarEclipse,
  nextSolarEclipse,
  sunGeocentricEcliptic,
  type Vec3,
} from '../../src/astro/ephemeris';
import { eclipseShadow } from '../../src/astro/eclipseShadow';
import { BODIES } from '../../src/data/bodies';

const EARTH = BODIES.earth.radiusKm;
const MOON = BODIES.moon.radiusKm;
const SUN = BODIES.sun.radiusKm;
const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });

/** Point de la surface terrestre où l'axe du cône d'ombre de la Lune entre côté Soleil (le plus proche de la Lune sur l'axe). */
function axisEntryOnEarth(moon: Vec3, sun: Vec3): Vec3 {
  const d = sub(moon, sun);
  const len = Math.hypot(d.x, d.y, d.z);
  const u = scale(d, 1 / len); // l'ombre s'éloigne du Soleil
  // |moon + t·u|² = R² avec t < 0 : on remonte l'axe depuis la Lune vers le Soleil.
  const b = dot(moon, u);
  const c = dot(moon, moon) - EARTH * EARTH;
  const disc = b * b - c;
  expect(disc).toBeGreaterThan(0); // l'axe touche bien la Terre
  const t = -b - Math.sqrt(disc);
  return { x: moon.x + t * u.x, y: moon.y + t * u.y, z: moon.z + t * u.z };
}

describe('eclipseShadow', () => {
  test('au pic de l’éclipse totale de Lune du 2026-03-03, le centre de la Lune est dans l’ombre de la Terre', () => {
    const e = nextLunarEclipse(new Date('2026-01-01T00:00:00Z'));
    expect(e.kind).toBe('total');
    expect(e.peak.toISOString().slice(0, 10)).toBe('2026-03-03');
    const r = eclipseShadow({
      pointKm: moonGeocentricEcliptic(e.peak),
      occluderKm: ORIGIN,
      occluderRadiusKm: EARTH,
      sunKm: sunGeocentricEcliptic(e.peak),
      sunRadiusKm: SUN,
    });
    expect(r.region).toBe('umbra');
    expect(r.light).toBe(0);
  });

  test('à la pleine Lune du 2026-11-24, la Lune passe à côté de l’ombre de la Terre', () => {
    const full = Astronomy.SearchMoonPhase(180, new Date('2026-11-08T00:00:00Z'), 40)!.date;
    expect(full.toISOString().slice(0, 10)).toBe('2026-11-24');
    const r = eclipseShadow({
      pointKm: moonGeocentricEcliptic(full),
      occluderKm: ORIGIN,
      occluderRadiusKm: EARTH,
      sunKm: sunGeocentricEcliptic(full),
      sunRadiusKm: SUN,
    });
    expect(r).toEqual({ region: 'none', light: 1 });
  });

  test('au pic de l’éclipse de Soleil du 2026-08-12, le point de la Terre sur l’axe de l’ombre lunaire est dans l’ombre', () => {
    const e = nextSolarEclipse(new Date('2026-06-01T00:00:00Z'));
    expect(e.kind).toBe('total');
    expect(e.peak.toISOString().slice(0, 10)).toBe('2026-08-12');
    const moon = moonGeocentricEcliptic(e.peak);
    const sun = sunGeocentricEcliptic(e.peak);
    const r = eclipseShadow({ pointKm: axisEntryOnEarth(moon, sun), occluderKm: moon, occluderRadiusKm: MOON, sunKm: sun, sunRadiusKm: SUN });
    expect(['umbra', 'penumbra']).toContain(r.region);
    expect(r.light).toBeLessThan(0.1);
  });

  test('géométrie du cône : pénombre linéaire entre les rayons d’ombre et de pénombre, ombre derrière seulement', () => {
    const sun: Vec3 = { x: -1.5e8, y: 0, z: 0 };
    const base = { occluderKm: ORIGIN, occluderRadiusKm: EARTH, sunKm: sun, sunRadiusKm: SUN };
    const x = 384_400;
    const umbraR = EARTH - (x * (SUN - EARTH)) / 1.5e8;
    const penumbraR = EARTH + (x * (SUN + EARTH)) / 1.5e8;
    const at = (radial: number) => eclipseShadow({ ...base, pointKm: { x, y: radial, z: 0 } });
    expect(at(umbraR - 1).region).toBe('umbra');
    expect(at(penumbraR + 1)).toEqual({ region: 'none', light: 1 });
    const mid = at((umbraR + penumbraR) / 2);
    expect(mid.region).toBe('penumbra');
    expect(mid.light).toBeCloseTo(0.5, 6);
    // devant l'occulteur (côté Soleil), jamais d'ombre
    expect(eclipseShadow({ ...base, pointKm: { x: -x, y: 0, z: 0 } }).region).toBe('none');
  });
});
