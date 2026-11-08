import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Chapter, ChapterContext } from '../app/chapter';
import type { Route } from '../app/router';
import { heliocentricEcliptic, moonGeocentricEcliptic, sunGeocentricEcliptic, type PlanetId } from '../astro/ephemeris';
import { BODIES, ORDER, type BodyId } from '../data/bodies';
import { FICHES } from '../content/fr/fiches';
import { createBodyMesh, type BodyMesh } from '../scene/bodyMesh';
import { eclipticToScene } from '../scene/coords';
import { createStarfield } from '../scene/starfield';
import { mountFiche } from '../ui/fiche';
import { mountPresenterNotes } from '../ui/presenterNotes';

const DEFAULT_BODY: BodyId = 'earth';
const CAMERA_DISTANCE = 3;
/** Plus grand que le rayon du fond d'étoiles (1e6) : il n'est jamais coupé par le plan lointain. */
const CAMERA_FAR = 4e6;
const FOV_DEG = 50;
/** 0,3 rad/s : avec un deltaTime, OrbitControls tourne de 2π/60 × autoRotateSpeed par seconde. */
const AUTO_ROTATE_SPEED = (0.3 * 60) / (2 * Math.PI);
const SUN_LIGHT_DISTANCE = 100;
/** Part de la largeur d'écran dont le corps est décalé vers la gauche pour laisser la place à la Fiche. */
const VIEW_SHIFT = 0.08;
/** Terre : la caméra recule pour garder la Lune dans le cadre, à distance réduite. */
const EARTH_CAMERA_DISTANCE = 7.5;
const MOON_DISPLAY_DISTANCE = 3;
const MOON_RADIUS = BODIES.moon.radiusKm / BODIES.earth.radiusKm;
const MOON_LABEL = 'Lune — distance réduite';
const STRIP_ORDER: BodyId[] = ['sun', ...ORDER, 'moon'];

/** Direction du corps vers le Soleil, en axes de scène (unitaire). */
export function sunDirection(body: BodyId, d: Date): THREE.Vector3 {
  if (body === 'sun') return new THREE.Vector3(0, 1, 0);
  if (body === 'moon') {
    const sun = eclipticToScene(sunGeocentricEcliptic(d));
    return sun.sub(eclipticToScene(moonGeocentricEcliptic(d))).normalize();
  }
  return eclipticToScene(heliocentricEcliptic(body as PlanetId, d)).negate().normalize();
}

function cameraDistance(body: BodyId): number {
  if (body === 'earth') return EARTH_CAMERA_DISTANCE;
  const ringOuter = BODIES[body].ringOuterKm;
  // Les anneaux de Saturne (2,3 rayons) ne tiendraient pas à la distance de 3.
  return ringOuter ? Math.max(CAMERA_DISTANCE, 3.0 * (ringOuter / BODIES[body].radiusKm)) : CAMERA_DISTANCE;
}

/** Caméra orbitale du chapitre ; `update(dt)` doit recevoir le temps écoulé pour que la rotation automatique soit en rad/s. */
export function createPlanetControls(camera: THREE.Camera, element: HTMLElement, distance: number): OrbitControls {
  const controls = new OrbitControls(camera, element);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.8;
  controls.maxDistance = distance * 2;
  controls.autoRotate = true;
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });
  return controls;
}

/** Écart minimal de date simulée (ms) pour recalculer la scène au rythme « Temps réel ». */
const MIN_DATE_STEP_MS = 60_000;

export class PlanetChapter implements Chapter {
  readonly id = 'planete' as const;
  private ctx: ChapterContext | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.01, CAMERA_FAR);
  private controls: OrbitControls | null = null;
  private body: BodyId = DEFAULT_BODY;
  private mesh: BodyMesh | null = null;
  private moon: BodyMesh | null = null;
  private moonLabel: HTMLElement | null = null;
  private starfield: THREE.Mesh | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private unmounts: Array<() => void> = [];
  private mounted: HTMLElement[] = [];
  private appliedDate = new Date(0);
  private active = false;
  private width = window.innerWidth;
  private height = window.innerHeight;

  async enter(ctx: ChapterContext, route: Route): Promise<void> {
    this.ctx = ctx;
    this.active = true;
    this.body = route.body ?? DEFAULT_BODY;
    const body = this.body;

    const starfield = await createStarfield(ctx.textures);
    if (!this.active) {
      this.disposeStarfield(starfield);
      return;
    }
    this.starfield = starfield;
    const mesh = await createBodyMesh(body, ctx.textures, ctx.quality);
    const moon = body === 'earth' ? await createBodyMesh('moon', ctx.textures, ctx.quality) : null;
    if (!this.active) {
      // exit() a déjà libéré le fond d'étoiles ; il reste les corps créés pendant l'attente.
      mesh.dispose();
      moon?.dispose();
      return;
    }

    const isSun = body === 'sun';
    this.scene.add(new THREE.AmbientLight(0xffffff, isSun ? 1 : 0.03));
    if (!isSun) {
      this.sunLight = new THREE.DirectionalLight(0xffffff, 3);
      this.scene.add(this.sunLight);
    }
    this.scene.add(starfield);
    this.mesh = mesh;
    mesh.setRadius(1);
    this.scene.add(mesh.group);
    if (moon) {
      this.moon = moon;
      moon.setRadius(MOON_RADIUS);
      this.scene.add(moon.group);
    }

    const distance = cameraDistance(body);
    this.camera.aspect = this.width / this.height;
    this.camera.position.set(0, distance * 0.25, distance).setLength(distance);
    this.camera.lookAt(0, 0, 0);
    const controls = createPlanetControls(this.camera, ctx.renderer.domElement, distance);
    controls.update();
    this.controls = controls;
    this.applyViewOffset();

    this.mountUi(ctx, body);
    this.updateScene(true);
  }

  exit(): void {
    this.active = false;
    this.controls?.dispose();
    this.controls = null;
    for (const unmount of this.unmounts) unmount();
    this.unmounts = [];
    for (const el of this.mounted) el.remove();
    this.mounted = [];
    this.moonLabel = null;
    this.mesh?.dispose();
    this.mesh = null;
    this.moon?.dispose();
    this.moon = null;
    if (this.starfield) this.disposeStarfield(this.starfield);
    this.starfield = null;
    this.sunLight = null;
    this.scene.clear();
    this.camera.clearViewOffset();
    this.ctx = null;
  }

  update(dt: number): void {
    if (!this.ctx || !this.controls) return;
    this.updateScene(false);
    this.controls.update(dt);
    this.updateMoonLabel();
  }

  render(): void {
    this.ctx?.renderer.render(this.scene, this.camera);
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.applyViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private disposeStarfield(starfield: THREE.Mesh): void {
    starfield.geometry.dispose();
    const material = starfield.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
  }

  private applyViewOffset(): void {
    if (!this.mesh) return;
    this.camera.setViewOffset(this.width, this.height, this.width * VIEW_SHIFT, 0, this.width, this.height);
  }

  // --- Interface ---

  private mountUi(ctx: ChapterContext, body: BodyId): void {
    const fiche = FICHES[body];
    this.unmounts.push(mountFiche(ctx.overlay, fiche), mountPresenterNotes(ctx.overlay, fiche.notes));

    const strip = document.createElement('nav');
    strip.className = 'body-strip';
    strip.setAttribute('aria-label', 'Corps célestes');
    for (const id of STRIP_ORDER) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = BODIES[id].nameFr;
      if (id === body) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', () => ctx.navigate({ chapter: 'planete', body: id }));
      strip.append(button);
    }
    ctx.overlay.append(strip);
    this.mounted.push(strip);

    if (this.moon) {
      this.moonLabel = document.createElement('div');
      this.moonLabel.className = 'moon-label';
      this.moonLabel.textContent = MOON_LABEL;
      ctx.overlay.append(this.moonLabel);
      this.mounted.push(this.moonLabel);
    }
  }

  private updateMoonLabel(): void {
    if (!this.moon || !this.moonLabel) return;
    const p = this.moon.group.position.clone().project(this.camera);
    const x = Math.min(Math.max((p.x * 0.5 + 0.5) * this.width, 90), this.width - 90);
    const y = (-p.y * 0.5 + 0.5) * this.height;
    const radiusPx = (MOON_RADIUS / (this.camera.position.distanceTo(this.moon.group.position) * Math.tan(THREE.MathUtils.degToRad(FOV_DEG / 2)))) * (this.height / 2);
    this.moonLabel.style.transform = `translate(${x.toFixed(1)}px, ${(y + radiusPx + 8).toFixed(1)}px) translateX(-50%)`;
    this.moonLabel.hidden = p.z > 1;
  }

  // --- Scène ---

  private updateScene(force: boolean): void {
    if (!this.ctx || !this.mesh) return;
    const date = this.ctx.clock.date;
    if (!force && Math.abs(date.getTime() - this.appliedDate.getTime()) < MIN_DATE_STEP_MS) return;
    this.appliedDate = date;

    this.mesh.update(date);
    const toSun = sunDirection(this.body, date);
    if (this.sunLight) this.sunLight.position.copy(toSun).multiplyScalar(SUN_LIGHT_DISTANCE);
    this.mesh.setSunWorld?.(toSun.clone().multiplyScalar(SUN_LIGHT_DISTANCE));

    if (this.moon) {
      const geo = eclipticToScene(moonGeocentricEcliptic(date)).normalize();
      this.moon.group.position.copy(geo).multiplyScalar(MOON_DISPLAY_DISTANCE);
      this.moon.update(date);
    }
  }
}
