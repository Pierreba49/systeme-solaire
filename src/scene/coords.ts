import * as THREE from 'three';
import type { Vec3 } from '../astro/ephemeris';

/** Écliptique J2000 (x, y, z) -> scène Y-up (x, z, -y), multiplié par `scale`. */
export function eclipticToScene(v: Vec3, scale = 1): THREE.Vector3 {
  return new THREE.Vector3(v.x * scale, v.z * scale, -v.y * scale);
}
