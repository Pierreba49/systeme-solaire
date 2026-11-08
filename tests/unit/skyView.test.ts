import { describe, expect, test } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import * as THREE from 'three';
import { horizontal, moonGeocentricEcliptic, nextLunarEclipse, sunGeocentricEcliptic } from '../../src/astro/ephemeris';
import { VERSAILLES } from '../../src/astro/observer';
import { bodyOrientation } from '../../src/astro/orientation';
import { eclipticToScene } from '../../src/scene/coords';
import { horizonFrame, horizontalToScene, moonEclipseTint, SKY_MAGNIFICATION, skyColor, sunLightAtObserver } from '../../src/chapters/moon/skyView';
import { phaseName } from '../../src/chapters/moon/moonChapter';

const hex = (c: THREE.Color): number => c.getHex(THREE.SRGBColorSpace);
const angleDeg = (a: THREE.Vector3, b: THREE.Vector3): number => THREE.MathUtils.radToDeg(a.angleTo(b));

describe('horizontalToScene', () => {
  test('est = +X, zénith = +Y, nord = −Z', () => {
    const east = horizontalToScene(0, 90);
    expect(east.x).toBeCloseTo(1);
    expect(east.y).toBeCloseTo(0);
    expect(east.z).toBeCloseTo(0);
    const zenith = horizontalToScene(90, 0);
    expect(zenith.y).toBeCloseTo(1);
    expect(zenith.x).toBeCloseTo(0);
    const north = horizontalToScene(0, 0);
    expect(north.z).toBeCloseTo(-1);
    const south = horizontalToScene(0, 180);
    expect(south.z).toBeCloseTo(1);
  });

  test('grossissement de la vue du ciel : ×8', () => {
    expect(SKY_MAGNIFICATION).toBe(8);
  });
});

describe('skyColor', () => {
  test('points de passage exacts', () => {
    expect(hex(skyColor(10))).toBe(0x5b8fd6);
    expect(hex(skyColor(0))).toBe(0x5b8fd6);
    expect(hex(skyColor(-6))).toBe(0x2b3f66);
    expect(hex(skyColor(-12))).toBe(0x0d1424);
    expect(hex(skyColor(-18))).toBe(0x02040a);
    expect(hex(skyColor(-20))).toBe(0x02040a);
  });

  test('−3° est strictement entre le jour et −6°, et vaut leur milieu', () => {
    const c = skyColor(-3);
    expect(hex(c)).not.toBe(hex(skyColor(10)));
    expect(hex(c)).not.toBe(hex(skyColor(-6)));
    const mid = new THREE.Color().setRGB((0x5b + 0x2b) / 2 / 255, (0x8f + 0x3f) / 2 / 255, (0xd6 + 0x66) / 2 / 255, THREE.SRGBColorSpace);
    expect(Math.abs(c.r - mid.r) + Math.abs(c.g - mid.g) + Math.abs(c.b - mid.b)).toBeLessThan(1e-6);
  });
});

describe('phaseName', () => {
  test('huit phases par angle de phase', () => {
    expect(phaseName(0)).toBe('Nouvelle Lune');
    expect(phaseName(359)).toBe('Nouvelle Lune');
    expect(phaseName(45)).toBe('Premier croissant');
    expect(phaseName(90)).toBe('Premier quartier');
    expect(phaseName(135)).toBe('Gibbeuse croissante');
    expect(phaseName(180)).toBe('Pleine Lune');
    expect(phaseName(225)).toBe('Gibbeuse décroissante');
    expect(phaseName(270)).toBe('Dernier quartier');
    expect(phaseName(315)).toBe('Dernier croissant');
  });
});

describe('la Lune en plein jour', () => {
  test('au premier quartier suivant le 1er novembre 2026, à 17 h à Paris, la Lune est à plus de 20° alors que le Soleil est au-dessus de −6°', () => {
    const quarter = Astronomy.SearchMoonPhase(90, new Date('2026-11-01T00:00:00Z'), 40);
    expect(quarter).not.toBeNull();
    const q = quarter!.date;
    // Novembre : heure d'hiver, Paris = UTC+1, donc 17 h = 16 h UTC, le jour du quartier.
    const at17 = new Date(Date.UTC(q.getUTCFullYear(), q.getUTCMonth(), q.getUTCDate(), 16));
    const moon = horizontal('moon', at17, VERSAILLES);
    const sun = horizontal('sun', at17, VERSAILLES);
    expect(moon.altitudeDeg).toBeGreaterThan(20);
    expect(sun.altitudeDeg).toBeGreaterThan(-6);
  });
});

describe('horizonFrame', () => {
  const dates = ['2026-06-21T10:00:00Z', '2026-11-16T16:00:00Z', '2026-03-05T22:30:00Z'].map((s) => new Date(s));

  test('envoie le Soleil écliptique sur sa direction horizontale (hors réfraction)', () => {
    for (const d of dates) {
      const sunH = horizontal('sun', d, VERSAILLES);
      if (sunH.altitudeDeg < 10) continue;
      const q = horizonFrame(d, VERSAILLES);
      const sun = eclipticToScene(sunGeocentricEcliptic(d)).normalize().applyQuaternion(q);
      expect(angleDeg(sun, horizontalToScene(sunH.altitudeDeg, sunH.azimuthDeg))).toBeLessThan(0.6);
    }
  });

  test('envoie la Lune écliptique sur sa direction horizontale, à la parallaxe près', () => {
    for (const d of dates) {
      const moonH = horizontal('moon', d, VERSAILLES);
      if (moonH.altitudeDeg < 10) continue;
      const q = horizonFrame(d, VERSAILLES);
      const moon = eclipticToScene(moonGeocentricEcliptic(d)).normalize().applyQuaternion(q);
      expect(angleDeg(moon, horizontalToScene(moonH.altitudeDeg, moonH.azimuthDeg))).toBeLessThan(1.5);
    }
  });

  test('la face visible de la Lune (+X local) est tournée vers l’observateur', () => {
    for (const d of dates) {
      const q = horizonFrame(d, VERSAILLES);
      const nearSide = new THREE.Vector3(1, 0, 0).applyQuaternion(bodyOrientation('moon', d)).applyQuaternion(q);
      const toObserver = eclipticToScene(moonGeocentricEcliptic(d)).normalize().negate().applyQuaternion(q);
      expect(angleDeg(nearSide, toObserver)).toBeLessThan(12);
    }
  });
});

describe('éclipses vues du ciel', () => {
  test('au pic de l’éclipse totale de Lune du 2026-03-03, la Lune du ciel est teintée sous 0,3', () => {
    const peak = nextLunarEclipse(new Date('2026-01-01T00:00:00Z')).peak;
    expect(peak.toISOString().slice(0, 10)).toBe('2026-03-03');
    const tint = moonEclipseTint(peak);
    expect(Math.max(tint.r, tint.g, tint.b)).toBeLessThan(0.3);
    expect(tint.r).toBeGreaterThan(tint.g);
  });

  test('hors éclipse (pleine Lune du 2026-11-24), la Lune n’est pas teintée', () => {
    const full = Astronomy.SearchMoonPhase(180, new Date('2026-11-08T00:00:00Z'), 40)!.date;
    const tint = moonEclipseTint(full);
    expect([tint.r, tint.g, tint.b]).toEqual([1, 1, 1]);
  });

  test('le Soleil n’est assombri que pendant une éclipse solaire visible', () => {
    const e = Astronomy.SearchGlobalSolarEclipse(new Date('2026-01-01T00:00:00Z'));
    // Point sous la Lune au maximum de l'éclipse : observateur au lieu du maximum.
    const sub = { latitudeDeg: e.latitude!, longitudeDeg: e.longitude!, heightM: 0, label: 'test' } ;
    expect(sunLightAtObserver(e.peak.date, sub)).toBeLessThan(0.3);
    expect(sunLightAtObserver(new Date('2026-11-09T12:00:00Z'), VERSAILLES)).toBe(1);
  });
});
