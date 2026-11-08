import type { PlanetId } from '../astro/ephemeris';
import { AU_KM } from '../astro/scale';

export type BodyId = 'sun' | PlanetId | 'moon';

export interface BodyData {
  id: BodyId;
  nameFr: string;
  radiusKm: number;
  perihelionAu?: number;
  aphelionAu?: number;
  orbitalPeriodDays?: number;
  /** Noms de fichiers relatifs au dossier du niveau de qualité (textures/<tier>/). */
  textures: { day: string; night?: string; clouds?: string; ring?: string };
  ringOuterKm?: number;
  ringInnerKm?: number;
}

// Périhélie et aphélie : NASA Planetary Fact Sheet, en 10^6 km.
const au = (million_km: number) => (million_km * 1e6) / AU_KM;

export const BODIES: Record<BodyId, BodyData> = {
  sun: { id: 'sun', nameFr: 'Soleil', radiusKm: 695_700, textures: { day: 'sun.jpg' } },
  mercury: {
    id: 'mercury', nameFr: 'Mercure', radiusKm: 2439.4,
    perihelionAu: au(46.0), aphelionAu: au(69.8), orbitalPeriodDays: 88.0,
    textures: { day: 'mercury.jpg' },
  },
  venus: {
    id: 'venus', nameFr: 'Vénus', radiusKm: 6051.8,
    perihelionAu: au(107.5), aphelionAu: au(108.9), orbitalPeriodDays: 224.7,
    textures: { day: 'venus_atmosphere.jpg' },
  },
  earth: {
    id: 'earth', nameFr: 'Terre', radiusKm: 6371.0,
    perihelionAu: au(147.1), aphelionAu: au(152.1), orbitalPeriodDays: 365.2,
    textures: { day: 'earth_daymap.jpg', night: 'earth_nightmap.jpg', clouds: 'earth_clouds.jpg' },
  },
  moon: {
    id: 'moon', nameFr: 'Lune', radiusKm: 1737.4, orbitalPeriodDays: 27.3,
    textures: { day: 'moon.jpg' },
  },
  mars: {
    id: 'mars', nameFr: 'Mars', radiusKm: 3389.5,
    perihelionAu: au(206.7), aphelionAu: au(249.3), orbitalPeriodDays: 687.0,
    textures: { day: 'mars.jpg' },
  },
  jupiter: {
    id: 'jupiter', nameFr: 'Jupiter', radiusKm: 69_911,
    perihelionAu: au(740.6), aphelionAu: au(816.4), orbitalPeriodDays: 4331,
    textures: { day: 'jupiter.jpg' },
  },
  saturn: {
    id: 'saturn', nameFr: 'Saturne', radiusKm: 58_232,
    perihelionAu: au(1357.6), aphelionAu: au(1506.5), orbitalPeriodDays: 10_747,
    textures: { day: 'saturn.jpg', ring: 'saturn_ring_alpha.png' },
    ringInnerKm: 74_500, ringOuterKm: 140_220,
  },
  uranus: {
    id: 'uranus', nameFr: 'Uranus', radiusKm: 25_362,
    perihelionAu: au(2732.7), aphelionAu: au(3001.4), orbitalPeriodDays: 30_589,
    textures: { day: 'uranus.jpg' },
  },
  neptune: {
    id: 'neptune', nameFr: 'Neptune', radiusKm: 24_622,
    perihelionAu: au(4471.1), aphelionAu: au(4558.9), orbitalPeriodDays: 59_800,
    textures: { day: 'neptune.jpg' },
  },
};

export const ORDER: PlanetId[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
