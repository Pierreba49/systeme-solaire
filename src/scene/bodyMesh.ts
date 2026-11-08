import * as THREE from 'three';
import { bodyOrientation } from '../astro/orientation';
import type { TextureStore } from '../core/textures';
import type { QualityTier } from '../core/quality';
import { BODIES, type BodyId } from '../data/bodies';
import { createAtmosphereMaterial, createEarthMaterial } from './earthMaterial';

export interface BodyMesh {
  id: BodyId;
  group: THREE.Group;
  setRadius(sceneUnits: number): void;
  /** `freezeSpin` : garde l'angle de rotation propre de cette date (voir `bodyOrientation`). */
  update(d: Date, opts?: { freezeSpin?: Date }): void;
  /** Terre seulement : position monde du Soleil pour la carte de nuit (origine par défaut). */
  setSunWorld?(p: THREE.Vector3): void;
  /** Matériaux éclairés (hors Soleil) auxquels on peut appliquer `applyShadowShader`. */
  shadowMaterials: THREE.MeshStandardMaterial[];
  dispose(): void;
}

const SEGMENTS: Record<QualityTier, [number, number]> = { high: [64, 32], low: [48, 24] };

function haloTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,240,200,1)');
    g.addColorStop(0.25, 'rgba(255,200,110,0.55)');
    g.addColorStop(0.6, 'rgba(255,150,60,0.12)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Anneau dans le plan XZ local (équatorial), UV radiales : u = (r - rInt) / (rExt - rInt). */
function createRingGeometry(inner: number, outer: number, segments: number): THREE.RingGeometry {
  const ring = new THREE.RingGeometry(inner, outer, segments * 2, 1);
  const pos = ring.attributes.position;
  const uv = ring.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  ring.rotateX(-Math.PI / 2); // normale vers +Y local
  return ring;
}

/**
 * Le rayon est porté par `spin` (échelle uniforme) ; la géométrie est de rayon 1.
 * `group` reste libre pour la position, `spin` porte l'orientation.
 */
export async function createBodyMesh(id: BodyId, tex: TextureStore, tier: QualityTier): Promise<BodyMesh> {
  const data = BODIES[id];
  const [w, h] = SEGMENTS[tier];
  const group = new THREE.Group();
  group.name = id;
  const spin = new THREE.Group();
  group.add(spin);

  let sunWorld: THREE.Vector3 | undefined;
  const shadowMaterials: THREE.MeshStandardMaterial[] = [];
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(o: T): T => (disposables.push(o), o);

  const sphereGeo = track(new THREE.SphereGeometry(1, w, h));
  const day = await tex.get(data.textures.day);

  if (id === 'sun') {
    const surface = new THREE.Mesh(sphereGeo, track(new THREE.MeshBasicMaterial({ map: day })));
    const halo = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: track(haloTexture()),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }),
      ),
    );
    halo.scale.setScalar(6);
    spin.add(surface, halo);
  } else if (id === 'earth' && data.textures.night) {
    const night = await tex.get(data.textures.night);
    const earth = createEarthMaterial(day, night);
    sunWorld = earth.sunWorld;
    shadowMaterials.push(earth.material);
    spin.add(new THREE.Mesh(sphereGeo, track(earth.material)));
    if (tier === 'high') {
      if (data.textures.clouds) {
        const cloudMap = await tex.get(data.textures.clouds);
        const alpha = track(cloudMap.clone()); // luminance lue comme alpha : copie en espace linéaire
        alpha.colorSpace = THREE.NoColorSpace;
        alpha.needsUpdate = true;
        const cloudMaterial = track(
          new THREE.MeshStandardMaterial({
            map: cloudMap,
            alphaMap: alpha,
            transparent: true,
            depthWrite: false,
            roughness: 1,
            metalness: 0,
          }),
        );
        shadowMaterials.push(cloudMaterial);
        const clouds = new THREE.Mesh(sphereGeo, cloudMaterial);
        clouds.scale.setScalar(1.01);
        spin.add(clouds);
      }
      const atmosphere = new THREE.Mesh(sphereGeo, track(createAtmosphereMaterial()));
      atmosphere.scale.setScalar(1.025);
      spin.add(atmosphere);
    }
  } else {
    const surfaceMaterial = track(new THREE.MeshStandardMaterial({ map: day, roughness: 1, metalness: 0 }));
    shadowMaterials.push(surfaceMaterial);
    spin.add(new THREE.Mesh(sphereGeo, surfaceMaterial));
    if (id === 'saturn' && data.textures.ring && data.ringInnerKm && data.ringOuterKm) {
      const ringMap = await tex.get(data.textures.ring);
      const ring = new THREE.Mesh(
        track(createRingGeometry(data.ringInnerKm / data.radiusKm, data.ringOuterKm / data.radiusKm, w)),
        track(
          new THREE.MeshStandardMaterial({
            map: ringMap, // la PNG porte sa transparence dans le canal alpha
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            roughness: 1,
            metalness: 0,
          }),
        ),
      );
      spin.add(ring);
    }
  }

  return {
    id,
    group,
    setRadius(sceneUnits) {
      spin.scale.setScalar(sceneUnits);
    },
    setSunWorld: sunWorld && ((p) => void sunWorld.copy(p)),
    shadowMaterials,
    update(d, opts) {
      spin.quaternion.copy(bodyOrientation(id, d, opts));
    },
    dispose() {
      for (const o of disposables) o.dispose();
    },
  };
}
