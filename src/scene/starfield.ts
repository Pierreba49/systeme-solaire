import * as THREE from 'three';
import type { TextureStore } from '../core/textures';
import { eqjToEcliptic } from '../astro/ephemeris';
import { eclipticToScene } from './coords';

const raDecToVec = (raDeg: number, decDeg: number): THREE.Vector3 => {
  const ra = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);
  return new THREE.Vector3(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
};

const toScene = (v: THREE.Vector3): THREE.Vector3 => eclipticToScene(eqjToEcliptic(v));

/**
 * Orientation fixe de la carte du ciel : centre galactique (l = 0) sur +X local,
 * pôle galactique nord sur +Y local (même repère local que les corps).
 * Positions J2000 : centre galactique (266,405 deg ; -28,936 deg), pôle (192,859 deg ; +27,128 deg).
 */
export function galacticOrientation(): THREE.Quaternion {
  const pole = toScene(raDecToVec(192.85948, 27.12825));
  const centre = toScene(raDecToVec(266.40499, -28.93617));
  const x = centre.addScaledVector(pole, -centre.dot(pole)).normalize();
  const z = new THREE.Vector3().crossVectors(x, pole);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, pole, z));
}

export async function createStarfield(tex: TextureStore): Promise<THREE.Mesh> {
  const map = await tex.getStarfieldMap();
  const material = new THREE.MeshBasicMaterial({ map, side: THREE.BackSide, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1e6, 64, 32), material);
  mesh.quaternion.copy(galacticOrientation());
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}
