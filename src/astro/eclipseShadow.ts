import type { Vec3 } from './ephemeris';

export interface ShadowInput {
  pointKm: Vec3;
  occluderKm: Vec3;
  occluderRadiusKm: number;
  sunKm: Vec3;
  sunRadiusKm: number;
}

export type ShadowRegion = 'none' | 'penumbra' | 'umbra';

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: Vec3): number => Math.sqrt(dot(a, a));

/**
 * Ombre et pénombre d'un occulteur sphérique éclairé par le Soleil, en un point (tout dans le même repère).
 * À une distance x derrière l'occulteur, le long de l'axe Soleil → occulteur (D = distance Soleil-occulteur) :
 * rayon de l'ombre R_o − x·(R_s − R_o)/D, rayon de la pénombre R_o + x·(R_s + R_o)/D.
 * `light` vaut 0 dans l'ombre et monte linéairement de 0 à 1 à travers la pénombre. Si le cône d'ombre
 * n'atteint plus le point (rayon négatif : éclipse annulaire), la lumière ne tombe pas à zéro sur l'axe.
 * Doit rester identique à la transcription GLSL de `shadowShader.ts`.
 */
export function eclipseShadow(i: ShadowInput): { region: ShadowRegion; light: number } {
  const axisVector = sub(i.occluderKm, i.sunKm);
  const distance = norm(axisVector);
  const axis = { x: axisVector.x / distance, y: axisVector.y / distance, z: axisVector.z / distance };
  const rel = sub(i.pointKm, i.occluderKm);
  const x = dot(rel, axis);
  if (x <= 0) return { region: 'none', light: 1 };

  const radial = norm({ x: rel.x - axis.x * x, y: rel.y - axis.y * x, z: rel.z - axis.z * x });
  const umbraRadius = i.occluderRadiusKm - (x * (i.sunRadiusKm - i.occluderRadiusKm)) / distance;
  const penumbraRadius = i.occluderRadiusKm + (x * (i.sunRadiusKm + i.occluderRadiusKm)) / distance;
  if (radial >= penumbraRadius) return { region: 'none', light: 1 };
  if (radial < umbraRadius) return { region: 'umbra', light: 0 };
  return { region: 'penumbra', light: (radial - umbraRadius) / (penumbraRadius - umbraRadius) };
}
