import * as Astronomy from 'astronomy-engine';
import * as THREE from 'three';
import type { BodyId } from '../data/bodies';
import { clampDate, eqjToEcliptic, type Vec3 } from './ephemeris';
import { eclipticToScene } from '../scene/coords';

const ASTRO_BODY: Record<BodyId, Astronomy.Body> = {
  sun: Astronomy.Body.Sun,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  earth: Astronomy.Body.Earth,
  moon: Astronomy.Body.Moon,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
};

const toScene = (v: Vec3): THREE.Vector3 => eclipticToScene(eqjToEcliptic(v));

/**
 * Orientation d'un corps dans le repère de scène (convention IAU).
 * Repère local : +X = longitude 0, +Y = pôle nord, -Z = longitude 90° E.
 * `freezeSpin` : garde l'angle du méridien origine de cette date, le pôle restant celui de `d`.
 */
export function bodyOrientation(body: BodyId, d: Date, opts?: { freezeSpin?: Date }): THREE.Quaternion {
  const astro = ASTRO_BODY[body];
  const axis = Astronomy.RotationAxis(astro, clampDate(d));
  const spinDeg = opts?.freezeSpin ? Astronomy.RotationAxis(astro, clampDate(opts.freezeSpin)).spin : axis.spin;

  // Calcul en EQJ : N = pôle, Q = nœud ascendant de l'équateur du corps sur l'équateur céleste.
  const n = new THREE.Vector3(axis.north.x, axis.north.y, axis.north.z).normalize();
  const q = new THREE.Vector3(0, 0, 1).cross(n).normalize();
  const w = THREE.MathUtils.degToRad(spinDeg);
  const m = q.clone().multiplyScalar(Math.cos(w)).addScaledVector(new THREE.Vector3().crossVectors(n, q), Math.sin(w));

  // Vers la scène (rotation propre) : X = M, Y = N, Z = M x N.
  const x = toScene(m);
  const y = toScene(n);
  const z = toScene(new THREE.Vector3().crossVectors(m, n));
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Direction unitaire (repère scène) du point de surface (lat, lon est) à la date `d` ; `opts.freezeSpin` comme pour `bodyOrientation`. */
export function surfaceDirection(body: BodyId, latDeg: number, lonDeg: number, d: Date, opts?: { freezeSpin?: Date }): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon))
    .applyQuaternion(bodyOrientation(body, d, opts));
}
