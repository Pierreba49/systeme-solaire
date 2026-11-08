import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { moonGeocentricEcliptic, sunGeocentricEcliptic } from '../../astro/ephemeris';
import type { Observer } from '../../astro/observer';
import { surfaceDirection } from '../../astro/orientation';
import { BODIES } from '../../data/bodies';
import type { BodyMesh } from '../../scene/bodyMesh';
import { eclipticToScene } from '../../scene/coords';
import { applyShadowShader } from '../../scene/shadowShader';

const EARTH_RADIUS_KM = BODIES.earth.radiusKm;
const SUN_RADIUS = BODIES.sun.radiusKm / EARTH_RADIUS_KM;
/** Ombre de la Lune sur la Terre : la lumière directe disparaît (il ne reste que la lumière ambiante), sans teinte rouge. */
const MOON_UMBRA_TINT = new THREE.Color(0.04, 0.04, 0.05);
/** Unité de la scène : le rayon terrestre. */
export const MOON_RADIUS = BODIES.moon.radiusKm / EARTH_RADIUS_KM;
const FOV_DEG = 30;
/** Demi-étendue cadrée, en rayons terrestres : l'orbite lunaire (au plus 63,8) et la flèche du Soleil. */
const FRAME_HALF_EXTENT = 80;
const ARROW_START = 68;
const ARROW_LENGTH = 9;
const SUN_LIGHT_DISTANCE = 200;
const ORBIT_SPAN_DAYS = 14;
const ORBIT_STEP_HOURS = 6;
const MARKER_PIXELS = 7;
/** Anneau qui signale un corps trop petit pour être vu à cette échelle ; il disparaît quand le corps a grossi assez. */
const RING_PIXELS = 24;
const RING_HIDDEN_ABOVE_RADIUS_PX = 9;
const ZENITH_TICK_PIXELS = 18;
const LUNAR_MARK_PIXELS = 13;
/** Distance d'écran, depuis le centre de la Lune, du point jaune du repère : une tige le relie à la surface. */
const LUNAR_STALK_PIXELS = 24;
const GRID_SIZE = 160;
const GRID_DIVISIONS = 16;
const CAMERA_TRANSITION_SECONDS = 0.8;
const SIDE_SUN_LABEL_LIFT_PX = 44;
const SUN_LABEL = 'vers le Soleil — 150 millions de km';
const ORIGIN = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
// Temporaires réutilisés à chaque frame (pas d'allocation dans syncMarkers ni updateLabels).
const tmpForward = new THREE.Vector3();
const tmpProjected = new THREE.Vector3();

/** Calques : 0 = communs aux deux caméras (Terre, Lune, lumières), 1 = loupe seulement, 2 = vue d'ensemble seulement. */
const LAYER_LOUPE = 1;
const LAYER_OVERVIEW = 2;
/** Loupe sur la Terre : carré en pixels CSS, sous le titre de la vue de dessus. */
export const LOUPE = { x: 12, y: 56, size: 200 } as const;
const LOUPE_FOV_DEG = 40;
const LOUPE_DISTANCE = 6;
const LOUPE_ARROW_START = 1.25;
const LOUPE_ARROW_LENGTH = 0.45;
const LOUPE_LABEL_RADIUS = 1.95;
/** Hauteur réservée en bas de l'écran à la barre de commandes. */
const BAR_CLEARANCE_PX = 150;

interface Label {
  el: HTMLElement;
  /** Étiquette masquée quoi qu'il arrive (hors du mode qui l'affiche). */
  off?: boolean;
  camera?: THREE.Camera;
  /** Rectangle écran (pixels CSS) où l'étiquette doit rester ; par défaut, toute la vue de dessus. */
  clamp?: { x: number; y: number; w: number; h: number };
  position: THREE.Vector3;
  /** Dernières valeurs écrites dans le DOM : une valeur inchangée n'est pas réécrite. */
  shownTransform?: string;
  shownHidden?: boolean;
  /** Décalage en pixels écran, à partir du point projeté. */
  dx: number;
  dy: number;
}

/** Disque plein (fill) ou anneau (stroke seul) sur un canevas carré. */
function discTexture(kind: { fill: string } | { stroke: string }): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    if ('fill' in kind) {
      ctx.fillStyle = kind.fill;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    } else {
      ctx.lineWidth = 5;
      ctx.strokeStyle = kind.stroke;
    }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Vue de dessus : la Terre, la Lune et la lumière du Soleil, à l'échelle réelle, vues du pôle nord de l'écliptique. */
export class TopView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 2000);
  readonly loupeCamera = new THREE.PerspectiveCamera(LOUPE_FOV_DEG, 1, 0.1, 100);
  readonly controls: OrbitControls;
  private readonly loupeMarker: THREE.Mesh;
  private readonly loupeZenith: THREE.Line;
  private readonly loupeSunArrow: THREE.ArrowHelper;
  private readonly loupeMoonArrow: THREE.ArrowHelper;
  private readonly loupeSunLabel: Label;
  private readonly loupeMoonLabel: Label;
  private readonly sunLight = new THREE.DirectionalLight(0xffffff, 3);
  private readonly orbit: THREE.Line;
  private readonly orbitPositions: Float32Array;
  private readonly arrow: THREE.ArrowHelper;
  private readonly marker: THREE.Sprite;
  private readonly zenith: THREE.Line;
  private readonly earthRing: THREE.Sprite;
  private readonly moonRing: THREE.Sprite;
  private readonly labels: Label[] = [];
  private readonly earthLabel: Label;
  private readonly moonLabel: Label;
  private readonly sunLabel: Label;
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly grid: THREE.GridHelper;
  private readonly lunarMark: THREE.Sprite;
  private readonly lunarStalk: THREE.Line;
  private readonly lunarMarkDirection = new THREE.Vector3(1, 0, 0);
  private readonly inclinationTick: THREE.Line;
  private readonly inclinationLabel: Label;
  /** Positions monde partagées avec les shaders d'ombre (unités de scène : le rayon terrestre). */
  private readonly sunWorld = new THREE.Vector3();
  private readonly moonWorld = new THREE.Vector3();
  private width = 1;
  private height = 1;
  /** Repères à recalculer : date, taille ou bascule modifiées ; sinon seule la comparaison de `markerSignature` décide. */
  private markersDirty = true;
  private readonly markerSignature = new Float64Array(17);
  private fitDistance = 300;
  private frozenSpinAt: Date | null = null;
  private side = false;
  private follow: 'none' | 'moon' | 'shadow' = 'none';
  /** Point de la Terre où l'axe de l'ombre lunaire entre côté Lune ; le centre de la Terre quand l'axe la manque. */
  private readonly shadowPoint = new THREE.Vector3();
  private transition: { t: number; fromDir: THREE.Vector3; fromQuat: THREE.Quaternion; distance: number } | null = null;

  constructor(
    private readonly earth: BodyMesh,
    private readonly moon: BodyMesh,
    controlsElement: HTMLElement,
    labelRoot: HTMLElement,
  ) {
    // Caméra au-dessus du pôle nord de l'écliptique ; le haut de l'écran est −Z (y écliptique), l'orbite tourne dans le sens inverse des aiguilles.
    this.camera.up.set(0, 0, -1);
    this.camera.position.set(0, this.fitDistance, 0);
    this.camera.lookAt(0, 0, 0);

    this.earth.setRadius(1);
    this.moon.setRadius(MOON_RADIUS);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.03), this.sunLight, earth.group, moon.group);

    // Ombre de la Terre sur la Lune (teinte rouge de l'atmosphère) et ombre de la Lune sur la Terre.
    const earthAsOccluder = { occluder: new THREE.Vector3(), occluderRadius: 1, sun: this.sunWorld, sunRadius: SUN_RADIUS };
    const moonAsOccluder = { occluder: this.moonWorld, occluderRadius: MOON_RADIUS, sun: this.sunWorld, sunRadius: SUN_RADIUS, tint: MOON_UMBRA_TINT };
    for (const m of this.moon.shadowMaterials) applyShadowShader(m, earthAsOccluder);
    for (const m of this.earth.shadowMaterials) applyShadowShader(m, moonAsOccluder);

    // Plan de l'écliptique : grille discrète, dans le plan XZ de la scène.
    this.grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0x6f86b8, 0x6f86b8);
    const gridMaterial = this.grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.16;
    gridMaterial.depthWrite = false;
    this.grid.layers.set(LAYER_OVERVIEW);
    this.scene.add(this.grid);
    this.disposables.push(this.grid.geometry, gridMaterial);

    const steps = Math.round((2 * ORBIT_SPAN_DAYS * 24) / ORBIT_STEP_HOURS) + 1;
    this.orbitPositions = new Float32Array(steps * 3);
    const orbitGeometry = new THREE.BufferGeometry();
    orbitGeometry.setAttribute('position', new THREE.BufferAttribute(this.orbitPositions, 3));
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x8aa0c8, transparent: true, opacity: 0.55 });
    this.orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    this.orbit.frustumCulled = false;
    this.scene.add(this.orbit);

    this.arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), ARROW_LENGTH, 0xffd25e, 3, 2);
    this.scene.add(this.arrow);

    const markerMaterial = new THREE.SpriteMaterial({ map: discTexture({ fill: '#e5302a' }), sizeAttenuation: false, depthTest: false });
    this.marker = new THREE.Sprite(markerMaterial);
    this.marker.renderOrder = 10;
    const makeRing = (color: string): THREE.Sprite => {
      const material = new THREE.SpriteMaterial({ map: discTexture({ stroke: color }), sizeAttenuation: false, depthTest: false });
      this.disposables.push(material, material.map as THREE.Texture);
      const ring = new THREE.Sprite(material);
      ring.renderOrder = 9;
      return ring;
    };
    this.earthRing = makeRing('rgba(120,180,255,0.9)');
    this.moonRing = makeRing('rgba(220,220,220,0.9)');
    this.scene.add(this.earthRing, this.moonRing);
    const zenithGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    const zenithMaterial = new THREE.LineBasicMaterial({ color: 0xe5302a, depthTest: false });
    this.zenith = new THREE.Line(zenithGeometry, zenithMaterial);
    this.zenith.renderOrder = 10;
    this.zenith.frustumCulled = false;
    this.scene.add(this.marker, this.zenith);
    const lunarMarkMaterial = new THREE.SpriteMaterial({ map: discTexture({ fill: '#ffd21e' }), sizeAttenuation: false, depthTest: false });
    this.lunarMark = new THREE.Sprite(lunarMarkMaterial);
    this.lunarMark.renderOrder = 11;
    this.lunarMark.visible = false;
    const stalkGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    const stalkMaterial = new THREE.LineBasicMaterial({ color: 0xffd21e, depthTest: false });
    this.lunarStalk = new THREE.Line(stalkGeometry, stalkMaterial);
    this.lunarStalk.frustumCulled = false;
    this.lunarStalk.visible = false;
    this.scene.add(this.lunarMark, this.lunarStalk);
    const tickGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    const tickMaterial = new THREE.LineBasicMaterial({ color: 0xffd25e, depthTest: false });
    this.inclinationTick = new THREE.Line(tickGeometry, tickMaterial);
    this.inclinationTick.frustumCulled = false;
    this.inclinationTick.visible = false;
    this.scene.add(this.inclinationTick);
    this.disposables.push(lunarMarkMaterial, lunarMarkMaterial.map as THREE.Texture, stalkGeometry, stalkMaterial, tickGeometry, tickMaterial);
    for (const o of [this.marker, this.zenith, this.earthRing, this.moonRing, this.lunarMark, this.lunarStalk, this.inclinationTick]) o.layers.set(LAYER_OVERVIEW);
    this.camera.layers.enable(LAYER_OVERVIEW);

    // Loupe : même Terre (mêmes jour/nuit et orientation), repères propres au calque de la loupe.
    this.loupeCamera.up.set(0, 0, -1);
    this.loupeCamera.position.set(0, LOUPE_DISTANCE, 0);
    this.loupeCamera.lookAt(0, 0, 0);
    this.loupeCamera.layers.enable(LAYER_LOUPE);
    const markerGeometry = new THREE.SphereGeometry(0.06, 16, 8);
    const markerMeshMaterial = new THREE.MeshBasicMaterial({ color: 0xe5302a });
    this.loupeMarker = new THREE.Mesh(markerGeometry, markerMeshMaterial);
    const loupeZenithMaterial = new THREE.LineBasicMaterial({ color: 0xe5302a });
    this.loupeZenith = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.35, 0)]), loupeZenithMaterial);
    this.loupeSunArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), LOUPE_ARROW_LENGTH, 0xffd25e, 0.2, 0.12);
    this.loupeMoonArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), LOUPE_ARROW_LENGTH, 0xdddddd, 0.2, 0.12);
    for (const o of [this.loupeMarker, this.loupeZenith, this.loupeSunArrow, this.loupeMoonArrow]) {
      o.traverse((c) => c.layers.set(LAYER_LOUPE));
      this.scene.add(o);
    }
    this.disposables.push(markerGeometry, markerMeshMaterial, this.loupeZenith.geometry, loupeZenithMaterial);
    this.disposables.push(orbitGeometry, orbitMaterial, markerMaterial, markerMaterial.map as THREE.Texture, zenithGeometry, zenithMaterial);

    this.earthLabel = this.addLabel(labelRoot, 'Terre', 'moon-top-label--earth');
    this.moonLabel = this.addLabel(labelRoot, 'Lune', 'moon-top-label--moon');
    this.sunLabel = this.addLabel(labelRoot, SUN_LABEL, 'moon-top-label--sun');
    this.inclinationLabel = this.addLabel(labelRoot, '5°', 'moon-top-label--inclination');
    this.inclinationLabel.off = true;
    const loupeBox = { x: LOUPE.x + 22, y: LOUPE.y + 10, w: LOUPE.size - 44, h: LOUPE.size - 20 };
    this.loupeSunLabel = this.addLabel(labelRoot, 'Soleil', 'moon-top-label--loupe moon-top-label--sun-name');
    this.loupeMoonLabel = this.addLabel(labelRoot, 'Lune', 'moon-top-label--loupe');
    for (const l of [this.loupeSunLabel, this.loupeMoonLabel]) {
      l.camera = this.loupeCamera;
      l.clamp = loupeBox;
    }

    // Seul le zoom (pincement ou molette) est permis : la vue reste une vue de dessus.
    this.controls = new OrbitControls(this.camera, controlsElement);
    this.controls.enableRotate = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = this.fitDistance;
    this.controls.update();
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.markersDirty = true;
    this.camera.aspect = width / height;
    // Cadre la demi-étendue sur la plus petite dimension de l'écran.
    const half = Math.tan(THREE.MathUtils.degToRad(FOV_DEG / 2));
    const previousFit = this.fitDistance;
    this.fitDistance = FRAME_HALF_EXTENT / (Math.min(this.camera.aspect, 1) * half);
    // Une vue d'ensemble garde son cadrage ; une vue zoomée garde son zoom (dans la limite du nouveau cadre).
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = offset.length() >= previousFit - 1e-6 ? this.fitDistance : Math.min(offset.length(), this.fitDistance);
    this.camera.position.copy(this.controls.target).addScaledVector(offset.normalize(), distance);
    this.controls.maxDistance = this.fitDistance;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  update(date: Date, observer: Observer): void {
    this.markersDirty = true;
    this.sunWorld.copy(eclipticToScene(sunGeocentricEcliptic(date), 1 / EARTH_RADIUS_KM));
    const sun = this.sunWorld.clone().normalize();
    this.sunLight.position.copy(sun).multiplyScalar(SUN_LIGHT_DISTANCE);
    this.earth.setSunWorld?.(this.sunLight.position);
    this.earth.update(date);

    this.moon.group.position.copy(eclipticToScene(moonGeocentricEcliptic(date), 1 / EARTH_RADIUS_KM));
    this.moonWorld.copy(this.moon.group.position);
    this.updateShadowPoint();
    const freezeSpin = this.frozenSpinAt ?? undefined;
    this.moon.update(date, { freezeSpin });
    this.lunarMarkDirection.copy(surfaceDirection('moon', 0, 0, date, { freezeSpin }));

    this.arrow.position.copy(sun).multiplyScalar(ARROW_START);
    this.arrow.setDirection(sun);
    this.sunLabel.position.copy(sun).multiplyScalar(ARROW_START + ARROW_LENGTH);

    const attribute = this.orbit.geometry.getAttribute('position') as THREE.BufferAttribute;
    const count = attribute.count;
    let apex = 0;
    for (let i = 0; i < count; i++) {
      const t = new Date(date.getTime() + (-ORBIT_SPAN_DAYS * 24 + i * ORBIT_STEP_HOURS) * 3_600_000);
      eclipticToScene(moonGeocentricEcliptic(t), 1 / EARTH_RADIUS_KM).toArray(this.orbitPositions, i * 3);
      if (Math.abs(this.orbitPositions[i * 3 + 1]!) > Math.abs(this.orbitPositions[apex * 3 + 1]!)) apex = i;
    }
    attribute.needsUpdate = true;
    // Point de l'orbite le plus éloigné du plan de l'écliptique : on y trace l'écart, légendé « 5° ».
    const [ax, ay, az] = [this.orbitPositions[apex * 3]!, this.orbitPositions[apex * 3 + 1]!, this.orbitPositions[apex * 3 + 2]!];
    this.inclinationTick.position.set(ax, 0, az);
    this.inclinationTick.scale.y = ay;
    this.inclinationLabel.position.set(ax, ay, az);

    const surface = surfaceDirection('earth', observer.latitudeDeg, observer.longitudeDeg, date);
    this.marker.position.copy(surface).multiplyScalar(1.01);
    this.zenith.position.copy(surface);
    this.zenith.quaternion.setFromUnitVectors(Y_AXIS, surface);
    this.earthLabel.position.set(0, 0, 0);
    this.moonLabel.position.copy(this.moon.group.position);
    this.earthRing.position.set(0, 0, 0);
    this.moonRing.position.copy(this.moon.group.position);

    // Loupe : repère de l'observateur et directions (sans distance) vers le Soleil et la Lune.
    this.loupeMarker.position.copy(surface).multiplyScalar(1.01);
    this.loupeZenith.position.copy(surface);
    this.loupeZenith.quaternion.copy(this.zenith.quaternion);
    const moonDir = this.moon.group.position.clone().normalize();
    for (const [arrow, label, dir] of [
      [this.loupeSunArrow, this.loupeSunLabel, sun],
      [this.loupeMoonArrow, this.loupeMoonLabel, moonDir],
    ] as const) {
      arrow.position.copy(dir).multiplyScalar(LOUPE_ARROW_START);
      arrow.setDirection(dir);
      label.position.copy(dir).multiplyScalar(LOUPE_LABEL_RADIUS);
    }
  }

  /** Les repères visuels gardent une taille d'écran constante : ils ne grossissent pas avec le zoom. */
  syncMarkers(): void {
    if (!this.markersChanged()) return;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV_DEG / 2));
    // Taille d'un pixel écran, en unités de scène, à la profondeur d'un point.
    const forward = this.camera.getWorldDirection(tmpForward);
    const cam = this.camera.position;
    const unitsPerPixelAt = (p: THREE.Vector3): number =>
      (2 * Math.max((p.x - cam.x) * forward.x + (p.y - cam.y) * forward.y + (p.z - cam.z) * forward.z, 0.01) * tan) / this.height;
    const unitsPerPixel = unitsPerPixelAt(ORIGIN);
    const moonUnitsPerPixel = unitsPerPixelAt(this.moon.group.position);
    const spriteScale = (pixels: number): number => (pixels / this.height) * 2 * tan;
    this.lunarMark.scale.setScalar(spriteScale(LUNAR_MARK_PIXELS));
    const stalkEnd = Math.max(MOON_RADIUS, LUNAR_STALK_PIXELS * moonUnitsPerPixel);
    this.lunarMark.position.copy(this.lunarMarkDirection).multiplyScalar(stalkEnd).add(this.moon.group.position);
    this.lunarStalk.position.copy(this.lunarMarkDirection).multiplyScalar(MOON_RADIUS).add(this.moon.group.position);
    this.lunarStalk.quaternion.setFromUnitVectors(Y_AXIS, this.lunarMarkDirection);
    this.lunarStalk.scale.y = stalkEnd - MOON_RADIUS;
    this.marker.scale.setScalar(spriteScale(MARKER_PIXELS));
    this.zenith.scale.y = Math.max(ZENITH_TICK_PIXELS * unitsPerPixel, 0.5);
    this.earthRing.scale.setScalar(spriteScale(RING_PIXELS));
    this.moonRing.scale.setScalar(spriteScale(RING_PIXELS * 0.75));
    const earthPx = 1 / unitsPerPixel;
    const moonPx = MOON_RADIUS / moonUnitsPerPixel;
    this.earthRing.visible = earthPx < RING_HIDDEN_ABOVE_RADIUS_PX;
    this.moonRing.visible = moonPx < RING_HIDDEN_ABOVE_RADIUS_PX;
    // Les noms se placent à côté du corps, hors de son disque.
    this.earthLabel.dx = Math.max(earthPx, RING_PIXELS / 2) + 6;
    this.earthLabel.dy = 4;
    this.moonLabel.dx = Math.max(moonPx, (RING_PIXELS * 0.75) / 2) + 6;
    this.moonLabel.dy = 2;
    this.sunLabel.off = this.isFramed;
    // De côté, le libellé du Soleil monte au-dessus de la flèche pour laisser la place au « 5° ».
    this.sunLabel.dy = this.side ? -SIDE_SUN_LABEL_LIFT_PX : 0;
    this.updateLabels();
  }

  /** Vrai si la date, la taille, la caméra ou la Lune ont bougé depuis le dernier calcul des repères. */
  private markersChanged(): boolean {
    const sig = this.markerSignature;
    const { position: c, quaternion: q } = this.camera;
    const m = this.moon.group.position;
    const d = this.lunarMarkDirection;
    const values = [c.x, c.y, c.z, q.x, q.y, q.z, q.w, m.x, m.y, m.z, d.x, d.y, d.z, this.width, this.height, this.side ? 1 : 0, this.follow === 'none' ? 0 : 1];
    let changed = this.markersDirty;
    for (let i = 0; i < values.length; i++) {
      if (sig[i] !== values[i]) {
        sig[i] = values[i]!;
        changed = true;
      }
    }
    this.markersDirty = false;
    return changed;
  }

  // --- Repère lunaire (face cachée) ---

  setLunarMarkVisible(visible: boolean): void {
    this.lunarMark.visible = visible;
    this.lunarStalk.visible = visible;
    this.markersDirty = true;
  }

  /** Fige la rotation propre de la Lune à l'angle de cette date (null : rotation synchrone normale). */
  setFrozenSpin(at: Date | null): void {
    this.frozenSpinAt = at;
  }

  // --- Caméra ---

  get isSideView(): boolean {
    return this.side;
  }

  /** Vue de côté : caméra dans le plan de l'écliptique, à 90° de la direction du Soleil, avec plan, orbite lunaire et libellé « 5° ». false : retour à la vue de dessus. */
  setSideView(on: boolean): void {
    if (on === this.side) return;
    this.side = on;
    this.markersDirty = true;
    this.inclinationLabel.off = !on;
    this.inclinationTick.visible = on;
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.transition = { t: 0, fromDir: offset.clone().normalize(), fromQuat: this.camera.quaternion.clone(), distance: offset.length() };
  }

  /**
   * Centre la vue à cette distance (en rayons terrestres) sur la Terre, sur la Lune ou sur la tache d'ombre de la Lune
   * sur la Terre ; la vue suit la Lune ou la tache quand la date change.
   */
  frame(target: 'earth' | 'moon' | 'shadow', distance: number): void {
    this.follow = target === 'moon' || target === 'shadow' ? target : 'none';
    this.markersDirty = true;
    this.transition = null;
    const goal = this.followedPoint() ?? ORIGIN;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(goal);
    this.camera.position.copy(goal).addScaledVector(dir, THREE.MathUtils.clamp(distance, this.controls.minDistance, this.fitDistance));
    this.controls.update();
  }

  /** Retour au cadrage d'ensemble, centré sur la Terre. */
  frameAll(): void {
    this.frame('earth', this.fitDistance);
  }

  /** Vrai quand la vue n'est plus le cadrage d'ensemble centré sur la Terre. */
  get isFramed(): boolean {
    return this.camera.position.distanceTo(this.controls.target) < this.fitDistance - 1e-6 || this.controls.target.lengthSq() > 0;
  }

  private followedPoint(): THREE.Vector3 | null {
    return this.follow === 'moon' ? this.moon.group.position : this.follow === 'shadow' ? this.shadowPoint : null;
  }

  private updateShadowPoint(): void {
    // Intersection de l'axe Soleil → Lune avec la sphère terrestre (rayon 1) : P(t) = M + t·u, |P|² = 1, première racine après la Lune.
    const axis = this.moonWorld.clone().sub(this.sunWorld).normalize();
    const b = this.moonWorld.dot(axis);
    const discriminant = b * b - (this.moonWorld.lengthSq() - 1);
    if (discriminant <= 0) return void this.shadowPoint.set(0, 0, 0);
    this.shadowPoint.copy(this.moonWorld).addScaledVector(axis, -b - Math.sqrt(discriminant));
  }

  /** Direction de la caméra (depuis la cible) et vecteur « haut » de la vue demandée. */
  private poseFor(side: boolean): { dir: THREE.Vector3; up: THREE.Vector3 } {
    if (!side) return { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) };
    // Perpendiculaire au Soleil dans le plan de l'écliptique ; le Soleil est à droite de l'écran.
    const sun = this.sunWorld;
    return { dir: new THREE.Vector3(-sun.z, 0, sun.x).normalize(), up: new THREE.Vector3(0, 1, 0) };
  }

  /** À appeler à chaque frame : transition de caméra, suivi de la Lune, maintien de la vue de côté à 90° du Soleil, puis contrôles. */
  tick(dt: number): void {
    const target = this.controls.target;
    const followed = this.followedPoint();
    if (followed) {
      const delta = followed.clone().sub(target);
      target.add(delta);
      this.camera.position.add(delta);
    }
    const { dir, up } = this.poseFor(this.side);
    const tr = this.transition;
    if (tr) {
      tr.t = Math.min(tr.t + dt / CAMERA_TRANSITION_SECONDS, 1);
      const eased = tr.t * tr.t * (3 - 2 * tr.t);
      const toQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(dir, new THREE.Vector3(), up));
      const turn = new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(tr.fromDir, dir), eased);
      this.camera.position.copy(target).addScaledVector(tr.fromDir.clone().applyQuaternion(turn), tr.distance);
      this.camera.quaternion.copy(tr.fromQuat).slerp(toQuat, eased);
      if (tr.t < 1) return;
      this.transition = null;
    }
    if (this.side || tr) {
      // Le Soleil tourne avec les jours : la caméra reste à 90° de lui.
      const distance = this.camera.position.distanceTo(target);
      this.camera.up.copy(up);
      if (this.side) this.camera.position.copy(target).addScaledVector(dir, distance);
    }
    this.controls.update(dt);
  }

  dispose(): void {
    this.controls.dispose();
    for (const o of this.disposables) o.dispose();
    this.disposables.length = 0;
    this.arrow.dispose();
    this.loupeSunArrow.dispose();
    this.loupeMoonArrow.dispose();
    for (const l of this.labels) l.el.remove();
    this.labels.length = 0;
    this.scene.clear();
  }

  private addLabel(root: HTMLElement, text: string, className: string): Label {
    const el = document.createElement('div');
    el.className = `moon-top-label ${className}`;
    el.textContent = text;
    root.append(el);
    const label = { el, position: new THREE.Vector3(), dx: 0, dy: 0 };
    this.labels.push(label);
    return label;
  }

  private updateLabels(): void {
    for (const l of this.labels) {
      const p = tmpProjected.copy(l.position).project(l.camera ?? this.camera);
      let x: number;
      let y: number;
      if (l.camera && l.clamp) {
        const c = l.clamp;
        x = LOUPE.x + (p.x * 0.5 + 0.5) * LOUPE.size;
        y = LOUPE.y + (-p.y * 0.5 + 0.5) * LOUPE.size;
        x = Math.min(Math.max(x, c.x), c.x + c.w);
        y = Math.min(Math.max(y, c.y), c.y + c.h);
      } else {
        x = (p.x * 0.5 + 0.5) * this.width + l.dx;
        y = (-p.y * 0.5 + 0.5) * this.height + l.dy;
        if (l === this.sunLabel) {
          x = Math.min(Math.max(x, 80), this.width - 80);
          y = Math.min(Math.max(y, 60), this.height - BAR_CLEARANCE_PX);
        }
      }
      const transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (transform !== l.shownTransform) {
        l.el.style.transform = transform;
        l.shownTransform = transform;
      }
      const hidden = p.z > 1 || !!l.off;
      if (hidden !== l.shownHidden) {
        l.el.hidden = hidden;
        l.shownHidden = hidden;
      }
    }
  }
}
