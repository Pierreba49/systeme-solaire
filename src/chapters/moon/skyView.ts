import * as THREE from 'three';
import { horizontal, moonGeocentricEcliptic, sunGeocentricEcliptic } from '../../astro/ephemeris';
import type { Observer } from '../../astro/observer';
import { bodyOrientation, surfaceDirection } from '../../astro/orientation';
import { BODIES } from '../../data/bodies';
import type { BodyMesh } from '../../scene/bodyMesh';
import { eclipseShadow } from '../../astro/eclipseShadow';
import { eclipticToScene } from '../../scene/coords';
import { UMBRA_TINT } from '../../scene/shadowShader';

/** Agrandissement du diamètre apparent de la Lune et du Soleil, signalé à l'écran. */
export const SKY_MAGNIFICATION = 8;

export const SKY_FOV_DEG = 100;
const MOON_DISTANCE = 100;
const SUN_DISTANCE = 120;
const GROUND_RADIUS = 50;
const CARDINAL_DISTANCE = 40;
const GROUND_COLOR = 0x1a1d17;
/** Hauteur, sous l'axe de visée, à laquelle on place l'horizon : le tiers inférieur de l'image. */
const HORIZON_PITCH_DEG = THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(SKY_FOV_DEG / 2)) / 3));
/** Écart maximal toléré entre l'axe de visée et la Lune avant de relever la caméra. */
const MAX_MOON_OFFSET_DEG = 38;

/** Hauteur et azimut (nord = 0, sens horaire) -> vecteur unitaire de la scène du ciel : nord −Z, est +X, zénith +Y. */
export function horizontalToScene(altDeg: number, azDeg: number): THREE.Vector3 {
  const alt = THREE.MathUtils.degToRad(altDeg);
  const az = THREE.MathUtils.degToRad(azDeg);
  return new THREE.Vector3(Math.cos(alt) * Math.sin(az), Math.sin(alt), -Math.cos(alt) * Math.cos(az));
}

/** Points de passage du ciel : [hauteur du Soleil en degrés, couleur sRGB]. */
const SKY_STOPS: ReadonlyArray<readonly [number, readonly [number, number, number]]> = [
  [0, [0x5b, 0x8f, 0xd6]],
  [-6, [0x2b, 0x3f, 0x66]],
  [-12, [0x0d, 0x14, 0x24]],
  [-18, [0x02, 0x04, 0x0a]],
];

/** Couleur du ciel selon la hauteur du Soleil : interpolation linéaire des composantes sRGB entre les points de passage. */
export function skyColor(sunAltDeg: number): THREE.Color {
  const first = SKY_STOPS[0]!;
  const last = SKY_STOPS[SKY_STOPS.length - 1]!;
  let rgb: readonly number[] = sunAltDeg >= first[0] ? first[1] : last[1];
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [hiAlt, hiRgb] = SKY_STOPS[i]!;
    const [loAlt, loRgb] = SKY_STOPS[i + 1]!;
    if (sunAltDeg <= hiAlt && sunAltDeg >= loAlt) {
      const t = (hiAlt - sunAltDeg) / (hiAlt - loAlt);
      rgb = hiRgb.map((v, k) => v + (loRgb[k]! - v) * t);
    }
  }
  return new THREE.Color().setRGB(rgb[0]! / 255, rgb[1]! / 255, rgb[2]! / 255, THREE.SRGBColorSpace);
}

/**
 * Rotation qui envoie un vecteur de la scène écliptique vers la scène du ciel de l'observateur.
 * Zénith = direction du lieu, nord = pôle céleste projeté sur l'horizon, est = nord × zénith.
 */
export function horizonFrame(d: Date, o: Observer): THREE.Quaternion {
  const up = surfaceDirection('earth', o.latitudeDeg, o.longitudeDeg, d);
  const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(bodyOrientation('earth', d));
  const north = pole.addScaledVector(up, -pole.dot(up)).normalize();
  const east = new THREE.Vector3().crossVectors(north, up);
  // Base horizon -> écliptique : +X = est, +Y = zénith, +Z = sud ; l'inverse fait le trajet voulu.
  const basis = new THREE.Matrix4().makeBasis(east, up, north.negate());
  return new THREE.Quaternion().setFromRotationMatrix(basis).invert();
}

const EARTH_RADIUS_KM = BODIES.earth.radiusKm;
const ORIGIN_KM = { x: 0, y: 0, z: 0 };

/**
 * Facteur de couleur de la Lune vue du ciel : 1 hors de l'ombre de la Terre, `UMBRA_TINT` (rouge sombre) dans l'ombre,
 * mélange linéaire dans la pénombre. Même calcul et même teinte que l'ombre de la vue de dessus.
 */
export function moonEclipseTint(date: Date): THREE.Color {
  const { light } = eclipseShadow({
    pointKm: eclipticToScene(moonGeocentricEcliptic(date)),
    occluderKm: ORIGIN_KM,
    occluderRadiusKm: EARTH_RADIUS_KM,
    sunKm: eclipticToScene(sunGeocentricEcliptic(date)),
    sunRadiusKm: BODIES.sun.radiusKm,
  });
  return new THREE.Color(1, 1, 1).lerp(UMBRA_TINT, 1 - light);
}

/** Part de la lumière du Soleil qui atteint l'observateur : 1 hors de l'ombre de la Lune, 0 dans son ombre. */
export function sunLightAtObserver(date: Date, observer: Observer): number {
  const surface = surfaceDirection('earth', observer.latitudeDeg, observer.longitudeDeg, date).multiplyScalar(EARTH_RADIUS_KM);
  return eclipseShadow({
    pointKm: surface,
    occluderKm: eclipticToScene(moonGeocentricEcliptic(date)),
    occluderRadiusKm: BODIES.moon.radiusKm,
    sunKm: eclipticToScene(sunGeocentricEcliptic(date)),
    sunRadiusKm: BODIES.sun.radiusKm,
  }).light;
}

function cardinalSprite(letter: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 84px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 64, 70);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthWrite: false }));
  sprite.scale.setScalar(4);
  return sprite;
}

const OUTLINE_OPACITY = 0.35;
/** Rayon de l'anneau dans la texture, en part du demi-côté. */
const OUTLINE_TEXTURE_RADIUS = 30 / 32;
const OUTLINE_GAP = 1.08;
const OUTLINE_DEPTH = 1.01;

function ringTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 64 * OUTLINE_TEXTURE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface SkyState {
  moonAltitudeDeg: number;
  sunAltitudeDeg: number;
  /** Soleil hors du cadre : côté par lequel il sort et hauteur à l'écran (0 = bas, 1 = haut) ; null s'il est dans le cadre. */
  sunOffScreen: { side: 'left' | 'right'; y: number } | null;
}

/** Ce que voit un observateur au sol : horizon, Soleil, Lune et phase, sur une scène à part. */
export class SkyView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(SKY_FOV_DEG, 1, 0.1, 1000);
  private readonly light = new THREE.DirectionalLight(0xffffff, 3);
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly moonMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly moonOutline: THREE.Sprite;
  private readonly sunSurfaceMaterials: THREE.MeshBasicMaterial[] = [];

  constructor(
    private readonly moon: BodyMesh,
    private readonly sun: BodyMesh,
  ) {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.04), this.light, moon.group, sun.group);
    moon.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) this.moonMaterials.push(o.material);
    });

    sun.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) this.sunSurfaceMaterials.push(o.material);
    });

    // Contour discret du disque lunaire : la partie dans l'ombre est invisible de jour. Placé juste derrière la Lune, il passe sous l'horizon comme elle.
    const outlineMap = ringTexture();
    const outlineMaterial = new THREE.SpriteMaterial({ map: outlineMap, transparent: true, opacity: OUTLINE_OPACITY, depthWrite: false });
    this.moonOutline = new THREE.Sprite(outlineMaterial);
    this.disposables.push(outlineMap, outlineMaterial);
    this.scene.add(this.moonOutline);

    // Sol : demi-sphère sous l'horizon, vue de l'intérieur, plus proche que les astres (ils passent derrière).
    const groundGeometry = new THREE.SphereGeometry(GROUND_RADIUS, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: GROUND_COLOR, side: THREE.BackSide });
    this.disposables.push(groundGeometry, groundMaterial);
    this.scene.add(new THREE.Mesh(groundGeometry, groundMaterial));

    const cardinals: Array<[string, number]> = [['N', 0], ['E', 90], ['S', 180], ['O', 270]];
    for (const [letter, azimuth] of cardinals) {
      const sprite = cardinalSprite(letter);
      sprite.position.copy(horizontalToScene(4, azimuth)).multiplyScalar(CARDINAL_DISTANCE);
      this.disposables.push(sprite.material.map as THREE.Texture, sprite.material);
      this.scene.add(sprite);
    }
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(date: Date, observer: Observer): SkyState {
    const moonH = horizontal('moon', date, observer);
    const sunH = horizontal('sun', date, observer);
    const moonDir = horizontalToScene(moonH.altitudeDeg, moonH.azimuthDeg);
    const sunDir = horizontalToScene(sunH.altitudeDeg, sunH.azimuthDeg);

    const sky = skyColor(sunH.altitudeDeg);
    this.scene.background = sky;
    // La lumière du ciel s'ajoute à celle de la Lune : sa partie dans l'ombre se fond dans le ciel au lieu de former un disque noir.
    for (const m of this.moonMaterials) m.emissive.copy(sky);
    // Éclipses : la Lune rougit dans l'ombre de la Terre, le Soleil s'assombrit quand la Lune passe devant.
    const tint = moonEclipseTint(date);
    for (const m of this.moonMaterials) m.color.copy(tint);
    const sunLight = sunLightAtObserver(date, observer);
    for (const m of this.sunSurfaceMaterials) m.color.setScalar(sunLight);
    this.light.position.copy(sunDir).multiplyScalar(MOON_DISTANCE);

    // Le groupe du corps porte le changement de repère ; son orientation propre (écliptique) reste dans `update`.
    const frame = horizonFrame(date, observer);
    this.placeBody(this.moon, moonDir, MOON_DISTANCE, moonGeocentricEcliptic(date), BODIES.moon.radiusKm, frame);
    this.moon.update(date);
    const moonRadius = this.moon.group.children[0]!.scale.x;
    this.moonOutline.position.copy(moonDir).multiplyScalar(MOON_DISTANCE * OUTLINE_DEPTH);
    this.moonOutline.scale.setScalar((2 * moonRadius * OUTLINE_GAP * OUTLINE_DEPTH) / OUTLINE_TEXTURE_RADIUS);
    this.placeBody(this.sun, sunDir, SUN_DISTANCE, sunGeocentricEcliptic(date), BODIES.sun.radiusKm, frame);

    // Cap sur la Lune, horizon au tiers inférieur ; on relève la caméra si la Lune sortirait du cadre par le haut.
    const pitch = Math.max(HORIZON_PITCH_DEG, moonH.altitudeDeg - MAX_MOON_OFFSET_DEG);
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(horizontalToScene(pitch, moonH.azimuthDeg));
    this.camera.updateMatrixWorld();

    // Le Soleil est souvent hors du cadre (la Lune n'en est jamais très proche à ce moment) : on indique de quel côté il se trouve.
    const sunScreen = horizontalToScene(sunH.altitudeDeg, sunH.azimuthDeg).multiplyScalar(SUN_DISTANCE).project(this.camera);
    const inFrame = sunScreen.z < 1 && Math.abs(sunScreen.x) <= 1;
    const azimuthGap = ((sunH.azimuthDeg - moonH.azimuthDeg + 540) % 360) - 180;
    const sameHeading = horizontalToScene(sunH.altitudeDeg, moonH.azimuthDeg).multiplyScalar(SUN_DISTANCE).project(this.camera);
    return {
      moonAltitudeDeg: moonH.altitudeDeg,
      sunAltitudeDeg: sunH.altitudeDeg,
      sunOffScreen: inFrame ? null : { side: azimuthGap >= 0 ? 'right' : 'left', y: Math.min(Math.max(sameHeading.y * 0.5 + 0.5, 0.2), 0.92) },
    };
  }

  dispose(): void {
    for (const o of this.disposables) o.dispose();
    this.disposables.length = 0;
    this.scene.clear();
  }

  private placeBody(
    body: BodyMesh,
    direction: THREE.Vector3,
    distance: number,
    geocentricKm: { x: number; y: number; z: number },
    radiusKm: number,
    frame: THREE.Quaternion,
  ): void {
    const angularRadius = Math.asin(radiusKm / Math.hypot(geocentricKm.x, geocentricKm.y, geocentricKm.z));
    body.setRadius(distance * Math.tan(angularRadius) * SKY_MAGNIFICATION);
    body.group.position.copy(direction).multiplyScalar(distance);
    body.group.quaternion.copy(frame);
  }
}
