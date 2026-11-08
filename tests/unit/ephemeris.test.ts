import { describe, expect, test } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import {
  MAX_DATE,
  MIN_DATE,
  clampDate,
  heliocentricEcliptic,
  horizontal,
  moonGeocentricEcliptic,
  moonPhase,
  nextLunarEclipse,
  nextSolarEclipse,
  type Vec3,
} from '../../src/astro/ephemeris';
import { VERSAILLES } from '../../src/astro/observer';
import { eclipticToScene } from '../../src/scene/coords';

const len = (v: Vec3) => Math.hypot(v.x, v.y, v.z);

describe('ephemeris', () => {
  test("Terre au périhélie début janvier, à l'aphélie début juillet", () => {
    const r = (d: string) => len(heliocentricEcliptic('earth', new Date(d)));
    expect(r('2026-01-03T00:00Z')).toBeCloseTo(0.983, 3);
    expect(r('2026-07-06T00:00Z')).toBeCloseTo(1.017, 3);
  });

  test('distance Terre-Lune entre 356 000 et 407 000 km', () => {
    for (let i = 0; i < 60; i++) {
      const d = len(moonGeocentricEcliptic(new Date(Date.UTC(2026, 0, 1 + i))));
      expect(d).toBeGreaterThan(356_000);
      expect(d).toBeLessThan(407_000);
    }
  });

  test('Soleil à Versailles le 21 juin à midi solaire : hauteur ≈ 64,6°', () => {
    const { altitudeDeg } = horizontal('sun', new Date('2026-06-21T11:52Z'), VERSAILLES);
    expect(altitudeDeg).toBeCloseTo(64.6, 0);
  });

  test('éclipse totale de Lune du 3 mars 2026, éclipse totale de Soleil du 12 août 2026', () => {
    const l = nextLunarEclipse(new Date('2026-01-01Z'));
    expect(l.kind).toBe('total');
    expect(l.peak.toISOString().slice(0, 10)).toBe('2026-03-03');
    const s = nextSolarEclipse(new Date('2026-01-01Z'));
    // la première éclipse de Soleil de 2026 est annulaire (17 février) : chercher à partir de mars
    expect(nextSolarEclipse(new Date('2026-03-01Z')).peak.toISOString().slice(0, 10)).toBe('2026-08-12');
    expect(s.kind).toBe('annular');
  });

  test('pleine Lune : fraction éclairée > 0,99 ; premier quartier ≈ 0,5', () => {
    const start = new Date('2026-11-01Z');
    const full = Astronomy.SearchMoonPhase(180, start, 40);
    const quarter = Astronomy.SearchMoonPhase(90, start, 40);
    expect(full).not.toBeNull();
    expect(quarter).not.toBeNull();
    expect(moonPhase(full!.date).illuminatedFraction).toBeGreaterThan(0.99);
    expect(moonPhase(full!.date).phaseAngleDeg).toBeCloseTo(180, 0);
    expect(moonPhase(quarter!.date).illuminatedFraction).toBeCloseTo(0.5, 1);
  });

  test('clampDate borne à 1900–2100', () => {
    expect(clampDate(new Date('1800-01-01Z'))).toEqual(MIN_DATE);
    expect(clampDate(new Date('2300-01-01Z'))).toEqual(MAX_DATE);
  });

  test('eclipticToScene : nord écliptique → +Y', () => {
    expect(eclipticToScene({ x: 0, y: 0, z: 1 }).toArray()).toEqual([0, 1, -0]);
  });
});
