import * as Astronomy from 'astronomy-engine';
import type { Observer } from './observer';

export type PlanetId = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const MIN_DATE = new Date('1900-01-01T00:00:00Z');
export const MAX_DATE = new Date('2100-12-31T23:59:59.999Z');

const KM_PER_AU = 149_597_870.7;

const BODIES: Record<PlanetId, Astronomy.Body> = {
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  earth: Astronomy.Body.Earth,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
};

export function clampDate(d: Date): Date {
  if (d.getTime() < MIN_DATE.getTime()) return new Date(MIN_DATE);
  if (d.getTime() > MAX_DATE.getTime()) return new Date(MAX_DATE);
  return d;
}

/** Vecteur équatorial J2000 (EQJ) de la bibliothèque -> écliptique J2000, multiplié par `factor`. */
function toEcliptic(v: Astronomy.Vector, factor = 1): Vec3 {
  const e = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), v);
  return { x: e.x * factor, y: e.y * factor, z: e.z * factor };
}

/** Vecteur équatorial J2000 (EQJ) quelconque -> écliptique J2000. */
export function eqjToEcliptic(v: Vec3): Vec3 {
  const e = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), new Astronomy.Vector(v.x, v.y, v.z, new Astronomy.AstroTime(0)));
  return { x: e.x, y: e.y, z: e.z };
}

/** Position héliocentrique en UA, écliptique J2000. */
export function heliocentricEcliptic(body: PlanetId, d: Date): Vec3 {
  return toEcliptic(Astronomy.HelioVector(BODIES[body], clampDate(d)));
}

/** Position géocentrique de la Lune en km, écliptique J2000. */
export function moonGeocentricEcliptic(d: Date): Vec3 {
  return toEcliptic(Astronomy.GeoMoon(clampDate(d)), KM_PER_AU);
}

/** Position géocentrique du Soleil en km, écliptique J2000. */
export function sunGeocentricEcliptic(d: Date): Vec3 {
  return toEcliptic(Astronomy.GeoVector(Astronomy.Body.Sun, clampDate(d), true), KM_PER_AU);
}

/** Hauteur et azimut (depuis le nord, sens horaire), avec réfraction normale. */
export function horizontal(
  body: 'sun' | 'moon',
  d: Date,
  o: Observer,
): { altitudeDeg: number; azimuthDeg: number } {
  const t = clampDate(d);
  const obs = new Astronomy.Observer(o.latitudeDeg, o.longitudeDeg, o.heightM);
  const b = body === 'sun' ? Astronomy.Body.Sun : Astronomy.Body.Moon;
  const eq = Astronomy.Equator(b, t, obs, true, true);
  const hor = Astronomy.Horizon(t, obs, eq.ra, eq.dec, 'normal');
  return { altitudeDeg: hor.altitude, azimuthDeg: hor.azimuth };
}

/** Angle de phase : 0 = nouvelle Lune, 180 = pleine Lune. */
export function moonPhase(d: Date): { phaseAngleDeg: number; illuminatedFraction: number } {
  const t = clampDate(d);
  return {
    phaseAngleDeg: Astronomy.MoonPhase(t),
    illuminatedFraction: Astronomy.Illumination(Astronomy.Body.Moon, t).phase_fraction,
  };
}

export function nextLunarEclipse(after: Date): { peak: Date; kind: 'penumbral' | 'partial' | 'total' } {
  const e = Astronomy.SearchLunarEclipse(clampDate(after));
  return { peak: e.peak.date, kind: e.kind as 'penumbral' | 'partial' | 'total' };
}

export function nextSolarEclipse(after: Date): { peak: Date; kind: 'partial' | 'annular' | 'total' | 'hybrid' } {
  const e = Astronomy.SearchGlobalSolarEclipse(clampDate(after));
  return { peak: e.peak.date, kind: e.kind as 'partial' | 'annular' | 'total' };
}
