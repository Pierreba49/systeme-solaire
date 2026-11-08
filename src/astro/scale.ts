export const AU_KM = 149_597_870.7;
export const MIN_MARKER_PX = 6;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Distance au Soleil en unités de scène. t = 0 : vue compressée, t = 1 : échelle réelle. */
export function sceneDistance(au: number, t: number): number {
  return lerp(8 * Math.sqrt(au), 8 * au, t);
}

/** Rayon en unités de scène, interpolation géométrique entre vue compressée et échelle réelle. */
export function sceneRadius(km: number, t: number): number {
  const compressed = 0.35 * Math.sqrt(km / 6371);
  const real = (8 * km) / AU_KM;
  return Math.pow(compressed, 1 - t) * Math.pow(real, t);
}

/** Distance Lune-Terre en unités de scène. */
export function moonOffset(km: number, t: number): number {
  return lerp(0.6, (8 * km) / AU_KM, t);
}
