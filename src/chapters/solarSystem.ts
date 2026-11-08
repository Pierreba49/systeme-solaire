import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Chapter, ChapterContext } from '../app/chapter';
import type { ChapterId, Route } from '../app/router';
import { heliocentricEcliptic, MAX_DATE, MIN_DATE, moonGeocentricEcliptic, type PlanetId } from '../astro/ephemeris';
import { MIN_MARKER_PX, moonOffset, sceneDistance, sceneRadius } from '../astro/scale';
import { mountTimeControl } from '../ui/timeControl';
import { BODIES, ORDER, type BodyId } from '../data/bodies';
import { createBodyMesh, type BodyMesh } from '../scene/bodyMesh';
import { eclipticToScene } from '../scene/coords';
import { createStarfield } from '../scene/starfield';

const ORBIT_POINTS = 256;
const SCALE_ANIMATION_S = 6;
/** Aphélie de Neptune (NASA Planetary Fact Sheet) : l'orbite la plus large doit tenir à l'écran. */
const NEPTUNE_APHELION_AU = 30.33;
const FRAMING_MARGIN = 1.2;
/** Direction de départ de la caméra (vers +Y et +Z) ; son élévation est asin(0,6). */
const START_DIRECTION = new THREE.Vector3(0, 0.6, 0.8);
const START_ELEVATION = Math.asin(START_DIRECTION.y / START_DIRECTION.length());
const TAP_RADIUS_PX = 44;
const NAME_OVERLAP_PX = 30;
const DRAG_THRESHOLD_PX = 8;
/** Plus grand que le rayon du fond d'étoiles (1e6) : il n'est jamais coupé par le plan lointain. */
const CAMERA_FAR = 4e6;
const FOV_DEG = 50;
const LABEL_TOUCH_PX = 44;

const BADGE_COMPRESSED = 'Vue compressée — tailles et distances ne sont pas à l’échelle';
const BADGE_REAL = 'Échelle réelle — les planètes sont trop petites pour être vues : les points montrent où elles sont';

export function easeScale(u: number): number {
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}

/** Position d'une planète dans la scène (Soleil à l'origine) : direction réelle, distance selon l'échelle t. */
export function scenePosition(body: PlanetId, d: Date, t: number): THREE.Vector3 {
  const v = eclipticToScene(heliocentricEcliptic(body, d));
  const au = v.length();
  return v.multiplyScalar(sceneDistance(au, t) / au);
}

interface Label {
  id: PlanetId;
  button: HTMLButtonElement;
  dot: HTMLSpanElement;
  /** Centre projeté en pixels de la fenêtre ; null si derrière la caméra. */
  screen: { x: number; y: number } | null;
  /** Dernières valeurs écrites dans le DOM, pour ne pas réécrire ce qui n'a pas changé. */
  shown: { hidden: boolean; transform: string; size: string; dotHidden: boolean; nameHidden: boolean };
}

/** Écart minimal de date simulée (ms) pour recalculer la scène au rythme « Temps réel ». */
const MIN_DATE_STEP_MS = 60_000;
const labelProjection = new THREE.Vector3();

/** Distance de la caméra pour voir toute l'orbite de Neptune (verticalement et horizontalement). */
export function framingDistance(t: number, aspect: number): number {
  const radius = sceneDistance(NEPTUNE_APHELION_AU, t);
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV_DEG / 2));
  const vertical = FRAMING_MARGIN * radius * (Math.sin(START_ELEVATION) / tanV + Math.cos(START_ELEVATION));
  const horizontal = (FRAMING_MARGIN * radius) / (tanV * aspect);
  return Math.max(vertical, horizontal);
}

interface Orbit {
  line: THREE.LineLoop;
  /** Positions en UA (axes de scène), échantillonnées une période autour de `sampledAt`. */
  samplesAu: THREE.Vector3[];
  sampledAt: number;
}

export class SolarSystemChapter implements Chapter {
  private ctx: ChapterContext | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.01, CAMERA_FAR);
  private controls: OrbitControls | null = null;
  private bodies = new Map<BodyId, BodyMesh>();
  private orbits = new Map<PlanetId, Orbit>();
  private labels: Label[] = [];
  private starfield: THREE.Mesh | null = null;
  private mounted: HTMLElement[] = [];
  private unmountTime: (() => void) | null = null;
  private badge: HTMLElement | null = null;
  private width = window.innerWidth;
  private height = window.innerHeight;

  private u = 0;
  private uTarget = 0;
  private t = 0;
  private appliedT = -1;
  private appliedDate = new Date(0);
  private active = false;
  private removeTap: (() => void) | null = null;

  constructor(readonly id: Extract<ChapterId, 'systeme-solaire' | 'echelle-reelle'>) {}

  async enter(ctx: ChapterContext, _route: Route): Promise<void> {
    this.ctx = ctx;
    this.active = true;
    this.u = 0;
    this.uTarget = this.id === 'echelle-reelle' ? 1 : 0;
    this.t = 0;

    this.scene.add(new THREE.PointLight(0xffffff, 3, 0, 0), new THREE.AmbientLight(0xffffff, 0.03));

    this.starfield = await createStarfield(ctx.textures);
    this.scene.add(this.starfield);

    const ids: BodyId[] = ['sun', ...ORDER, 'moon'];
    const meshes = await Promise.all(ids.map((id) => createBodyMesh(id, ctx.textures, ctx.quality)));
    if (!this.active) {
      for (const m of meshes) m.dispose();
      return;
    }
    for (const m of meshes) {
      this.bodies.set(m.id, m);
      this.scene.add(m.group);
    }
    this.bodies.get('earth')?.setSunWorld?.(new THREE.Vector3(0, 0, 0));

    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x6f8fc8, transparent: true, opacity: 0.55 });
    for (const id of ORDER) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ORBIT_POINTS * 3), 3));
      const line = new THREE.LineLoop(geometry, orbitMaterial);
      line.frustumCulled = false;
      this.scene.add(line);
      this.orbits.set(id, { line, samplesAu: [], sampledAt: Number.NaN });
    }

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(START_DIRECTION).normalize().multiplyScalar(framingDistance(0, this.camera.aspect));
    this.camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(this.camera, ctx.renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 5;
    controls.maxDistance = 2000;
    controls.update();
    this.controls = controls;

    this.mountUi(ctx);
    this.installTap(ctx);
    this.updateScene(true);
  }

  exit(): void {
    this.active = false;
    this.removeTap?.();
    this.removeTap = null;
    this.controls?.dispose();
    this.controls = null;
    this.unmountTime?.();
    this.unmountTime = null;
    for (const el of this.mounted) el.remove();
    this.mounted = [];
    this.labels = [];
    this.badge = null;
    for (const m of this.bodies.values()) m.dispose();
    this.bodies.clear();
    const seen = new Set<unknown>();
    this.scene.traverse((o) => {
      if (!(o instanceof THREE.Line)) return;
      o.geometry.dispose();
      if (!seen.has(o.material)) {
        seen.add(o.material);
        (o.material as THREE.Material).dispose();
      }
    });
    if (this.starfield) {
      this.starfield.geometry.dispose();
      const material = this.starfield.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
      this.starfield = null;
    }
    this.scene.clear();
    this.orbits.clear();
    this.ctx = null;
  }

  update(dt: number): void {
    if (!this.ctx || !this.controls) return;
    if (this.u !== this.uTarget) {
      const step = dt / SCALE_ANIMATION_S;
      this.u = this.uTarget > this.u ? Math.min(this.uTarget, this.u + step) : Math.max(this.uTarget, this.u - step);
    }
    this.updateScene(false);
    this.controls.update();
    this.updateLabels();
  }

  render(): void {
    this.ctx?.renderer.render(this.scene, this.camera);
  }

  resize(w: number, h: number): void {
    const before = framingDistance(this.t, this.camera.aspect);
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    if (this.controls) this.scaleCameraDistance(framingDistance(this.t, this.camera.aspect) / before);
    this.camera.updateProjectionMatrix();
  }

  // --- Interface ---

  private mountUi(ctx: ChapterContext): void {
    const add = <T extends HTMLElement>(el: T): T => {
      ctx.overlay.append(el);
      this.mounted.push(el);
      return el;
    };

    this.badge = add(document.createElement('div'));
    this.badge.className = 'scale-badge';

    const toggle = add(document.createElement('button'));
    toggle.type = 'button';
    toggle.className = 'scale-toggle';
    toggle.textContent = 'Échelle réelle ↔ Vue compressée';
    toggle.addEventListener('click', () => {
      this.uTarget = this.uTarget >= 0.5 ? 0 : 1;
    });

    for (const id of ORDER) {
      const button = add(document.createElement('button'));
      button.type = 'button';
      button.className = 'body-label';
      button.dataset.body = id;
      button.hidden = true;
      const wrap = document.createElement('span');
      wrap.className = 'body-label__target';
      const dot = document.createElement('span');
      dot.className = 'body-label__dot';
      wrap.append(dot);
      const name = document.createElement('span');
      name.className = 'body-label__name';
      name.textContent = BODIES[id].nameFr;
      button.append(wrap, name);
      button.addEventListener('click', () => ctx.navigate({ chapter: 'planete', body: id }));
      this.labels.push({
        id,
        button,
        dot,
        screen: null,
        shown: { hidden: true, transform: '', size: '', dotHidden: false, nameHidden: false },
      });
    }

    this.unmountTime = mountTimeControl(ctx.overlay, ctx.clock);
  }

  /** Un seul point d'entrée pour les touchers : la planète dont le point est le plus proche (44 px max). */
  private installTap(ctx: ChapterContext): void {
    const canvas = ctx.renderer.domElement;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent): void => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onClick = (e: MouseEvent): void => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_THRESHOLD_PX) return;
      let best: Label | null = null;
      let bestD = TAP_RADIUS_PX;
      for (const l of this.labels) {
        if (!l.screen) continue;
        const d = Math.hypot(l.screen.x - e.clientX, l.screen.y - e.clientY);
        if (d <= bestD) {
          best = l;
          bestD = d;
        }
      }
      if (best) ctx.navigate({ chapter: 'planete', body: best.id });
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('click', onClick);
    this.removeTap = () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('click', onClick);
    };
  }

  private updateLabels(): void {
    this.camera.updateMatrixWorld();
    const p = labelProjection;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(FOV_DEG / 2));
    for (const label of this.labels) {
      const { id, button, dot, shown } = label;
      const group = this.bodies.get(id)?.group;
      if (!group) continue;
      p.copy(group.position).applyMatrix4(this.camera.matrixWorldInverse);
      if (p.z >= 0) {
        label.screen = null;
        if (!shown.hidden) {
          button.hidden = true;
          shown.hidden = true;
        }
        continue;
      }
      const depth = -p.z;
      const radiusPx = (sceneRadius(BODIES[id].radiusKm, this.t) / (depth * tanHalfFov)) * (this.height / 2);
      const sphereVisible = radiusPx * 2 >= MIN_MARKER_PX;
      const size = Math.max(MIN_MARKER_PX, radiusPx * 2).toFixed(1);
      const x = ((p.x / (depth * tanHalfFov * this.camera.aspect)) * this.width) / 2 + this.width / 2;
      const y = this.height / 2 - ((p.y / (depth * tanHalfFov)) * this.height) / 2;
      label.screen = { x, y };
      if (shown.hidden) {
        button.hidden = false;
        shown.hidden = false;
      }
      const transform = `translate(${(x - LABEL_TOUCH_PX / 2).toFixed(1)}px, ${(y - LABEL_TOUCH_PX / 2).toFixed(1)}px)`;
      if (transform !== shown.transform) {
        button.style.transform = transform;
        shown.transform = transform;
      }
      if (size !== shown.size) {
        dot.style.width = dot.style.height = `${size}px`;
        shown.size = size;
      }
      if (sphereVisible !== shown.dotHidden) {
        dot.classList.toggle('body-label__dot--hidden', sphereVisible);
        shown.dotHidden = sphereVisible;
      }
    }
    // Les labels sont dans l'ordre du Soleil vers l'extérieur : un nom est masqué s'il chevauche celui d'une planète plus proche du Soleil.
    const labels = this.labels;
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]!;
      const s = label.screen;
      let crowded = false;
      if (s) {
        for (let j = 0; j < i && !crowded; j++) {
          const o = labels[j]!.screen;
          if (o && Math.hypot(o.x - s.x, o.y - s.y) < NAME_OVERLAP_PX) crowded = true;
        }
      }
      if (crowded !== label.shown.nameHidden) {
        label.button.classList.toggle('body-label--name-hidden', crowded);
        label.shown.nameHidden = crowded;
      }
    }
  }

  // --- Scène ---

  private updateScene(force: boolean): void {
    if (!this.ctx) return;
    const t = easeScale(this.u);
    const date = this.ctx.clock.date;
    const scaleChanged = force || t !== this.appliedT;
    const dateChanged = force || Math.abs(date.getTime() - this.appliedDate.getTime()) >= MIN_DATE_STEP_MS;
    if (!scaleChanged && !dateChanged) return;
    this.t = t;

    const sun = this.bodies.get('sun');
    sun?.setRadius(sceneRadius(BODIES.sun.radiusKm, t));
    sun?.update(date);

    for (const id of ORDER) {
      const mesh = this.bodies.get(id);
      if (!mesh) continue;
      mesh.group.position.copy(scenePosition(id, date, t));
      if (scaleChanged) mesh.setRadius(sceneRadius(BODIES[id].radiusKm, t));
      mesh.update(date);
    }

    const earth = this.bodies.get('earth');
    const moon = this.bodies.get('moon');
    if (earth && moon) {
      const geo = eclipticToScene(moonGeocentricEcliptic(date));
      const km = geo.length();
      moon.group.position.copy(earth.group.position).addScaledVector(geo.divideScalar(km), moonOffset(km, t));
      if (scaleChanged) moon.setRadius(sceneRadius(BODIES.moon.radiusKm, t));
      moon.update(date);
    }

    for (const id of ORDER) this.updateOrbit(id, date, t, scaleChanged);

    if (scaleChanged) {
      if (this.badge) this.badge.textContent = t < 1 ? BADGE_COMPRESSED : BADGE_REAL;
      this.moveCamera(t);
    }
    this.appliedT = t;
    this.appliedDate = date;
  }

  private updateOrbit(id: PlanetId, date: Date, t: number, scaleChanged: boolean): void {
    const orbit = this.orbits.get(id);
    const period = BODIES[id].orbitalPeriodDays;
    if (!orbit || !period) return;
    const resample = !(Math.abs(date.getTime() - orbit.sampledAt) < (period * 86_400_000) / 32);
    if (resample) {
      orbit.samplesAu = [];
      // Fenêtre d'une période autour de la date, décalée pour rester dans les dates simulables (sinon l'éphéméride bute sur la borne et l'orbite se déforme).
      const periodMs = period * 86_400_000;
      const start = Math.min(Math.max(date.getTime() - periodMs / 2, MIN_DATE.getTime()), MAX_DATE.getTime() - periodMs);
      for (let i = 0; i < ORBIT_POINTS; i++) {
        const when = new Date(start + (i / ORBIT_POINTS) * periodMs);
        orbit.samplesAu.push(eclipticToScene(heliocentricEcliptic(id, when)));
      }
      orbit.sampledAt = date.getTime();
    }
    if (!resample && !scaleChanged) return;
    const attr = orbit.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    orbit.samplesAu.forEach((v, i) => {
      const au = v.length();
      const k = sceneDistance(au, t) / au;
      attr.setXYZ(i, v.x * k, v.y * k, v.z * k);
    });
    attr.needsUpdate = true;
  }

  /** La caméra s'éloigne avec t pour garder tout le système visible ; le zoom choisi par l'utilisateur est conservé (rapport de distances). */
  private moveCamera(t: number): void {
    const aspect = this.camera.aspect;
    const previous = this.appliedT < 0 ? framingDistance(t, aspect) : framingDistance(this.appliedT, aspect);
    this.scaleCameraDistance(framingDistance(t, aspect) / previous);
  }

  private scaleCameraDistance(ratio: number): void {
    if (!this.controls || ratio === 1) return;
    this.camera.position.sub(this.controls.target).multiplyScalar(ratio).add(this.controls.target);
  }
}
