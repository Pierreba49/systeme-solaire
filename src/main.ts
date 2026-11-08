import * as THREE from 'three';
import './ui/styles.css';
import { mountOrientationScreen } from './ui/orientation';
import { mountMenu, mountSourcesPanel, type QualityChoice } from './ui/menu';
import { mountSources } from './ui/sources';
import { SimClock } from './core/clock';
import { detectQualityTier, resolveQualityTier, type QualityTier } from './core/quality';
import { TextureStore, warmTextureCache } from './core/textures';
import { CHAPTER_TITLES, createChapter, registerChapter, type Chapter, type ChapterContext } from './app/chapter';
import { navigateTo, onRouteChange, parseHash, type ChapterId, type Route } from './app/router';
import { installContextLossRecovery } from './app/contextLoss';
import { SolarSystemChapter } from './chapters/solarSystem';
import { PlanetChapter } from './chapters/planet';
import { MoonChapter } from './chapters/moon/moonChapter';

const canvas = document.querySelector<HTMLCanvasElement>('canvas#scene');
if (!canvas) throw new Error('canvas#scene introuvable');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setClearColor(0x000000);
installContextLossRecovery(canvas);

// --- Qualité : forçage conservé dans localStorage ('qualite' = 'haute' | 'basse', absent = Auto) ---
const QUALITY_KEY = 'systeme-solaire:qualite';
const TIER_BY_CHOICE: Record<'haute' | 'basse', QualityTier> = { haute: 'high', basse: 'low' };

function readStoredChoice(): QualityChoice {
  try {
    const v = localStorage.getItem(QUALITY_KEY);
    return v === 'haute' || v === 'basse' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function storeChoice(choice: QualityChoice): void {
  try {
    if (choice === 'auto') localStorage.removeItem(QUALITY_KEY);
    else localStorage.setItem(QUALITY_KEY, choice);
  } catch {
    // stockage indisponible : le choix vaut pour cette session seulement
  }
}

const storedChoice = readStoredChoice();
const detected = detectQualityTier({
  maxTextureSize: renderer.capabilities.maxTextureSize,
  hardwareConcurrency: navigator.hardwareConcurrency ?? 2,
  deviceMemoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
});
const quality = resolveQualityTier(
  detected,
  location.search,
  storedChoice === 'auto' ? null : TIER_BY_CHOICE[storedChoice],
);

const clock = new SimClock();
const textures = new TextureStore(quality, import.meta.env.BASE_URL, renderer.capabilities.getMaxAnisotropy());

// --- Interface ---
const overlay = document.createElement('div');
overlay.className = 'chapter-overlay';
const fade = document.createElement('div');
fade.className = 'fade';

// Échec de chargement d'un chapitre : message et bouton pour réessayer.
const errorBox = document.createElement('div');
errorBox.className = 'chapter-error';
errorBox.setAttribute('role', 'alert');
errorBox.hidden = true;
const errorText = document.createElement('p');
errorText.textContent = 'Impossible de charger ce chapitre.';
const retryButton = document.createElement('button');
retryButton.type = 'button';
retryButton.textContent = 'Réessayer';
errorBox.append(errorText, retryButton);
document.body.append(overlay, fade, errorBox);

const sources = mountSourcesPanel(document.body);
mountSources(sources.content);
const menu = mountMenu(document.body, {
  quality: storedChoice,
  onQualityChange(choice) {
    storeChoice(choice);
    location.reload();
  },
  onOpenSources: () => sources.open(),
});
mountOrientationScreen();

// --- Chapitres factices : les tâches 8 à 11 les remplacent via registerChapter ---
function placeholderChapter(id: ChapterId): Chapter {
  let title: HTMLElement | null = null;
  let ctx: ChapterContext | null = null;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  return {
    id,
    async enter(c) {
      ctx = c;
      title = document.createElement('h1');
      title.className = 'chapter-title';
      title.textContent = CHAPTER_TITLES[id];
      c.overlay.append(title);
    },
    exit() {
      title?.remove();
      title = null;
      ctx = null;
    },
    update() {},
    render() {
      ctx?.renderer.render(scene, camera);
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
  };
}
for (const id of Object.keys(CHAPTER_TITLES) as ChapterId[]) registerChapter(id, () => placeholderChapter(id));
registerChapter('systeme-solaire', () => new SolarSystemChapter('systeme-solaire'));
registerChapter('echelle-reelle', () => new SolarSystemChapter('echelle-reelle'));
registerChapter('planete', () => new PlanetChapter());
registerChapter('lune', () => new MoonChapter());

// --- Navigation entre chapitres, derrière un fondu noir de 300 ms ---
const FADE_MS = 300;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const chapterContext: ChapterContext = { renderer, clock, quality, textures, overlay, navigate: navigateTo };

let current: Chapter | null = null;
let transitionToken = 0;

function currentSize(): { w: number; h: number } {
  return { w: window.innerWidth, h: window.innerHeight };
}

async function goTo(route: Route): Promise<void> {
  const token = ++transitionToken;
  menu.setActive(route.chapter);
  fade.classList.add('fade--on');
  await wait(FADE_MS);
  if (token !== transitionToken) return;
  const previous = current;
  current = null;
  previous?.exit();
  textures.releaseGpu();
  errorBox.hidden = true;
  try {
    const next = createChapter(route.chapter);
    await next.enter(chapterContext, route);
    if (token !== transitionToken) {
      next.exit();
      return;
    }
    const { w, h } = currentSize();
    next.resize(w, h);
    current = next;
  } catch (err) {
    console.error(err);
    if (token === transitionToken) {
      errorBox.hidden = false;
      retryButton.onclick = () => void goTo(route);
    }
  }
  fade.classList.remove('fade--on');
}

// --- Taille et boucle de rendu uniques ---
function resize(): void {
  const { w, h } = currentSize();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5));
  renderer.setSize(w, h, false);
  current?.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

const MAX_DT = 0.1;
let lastTime: number | null = null;
let warmed = false;

renderer.setAnimationLoop((time: number) => {
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
  lastTime = time;
  clock.tick(dt);
  if (current) {
    current.update(dt);
    current.render();
  }
  if (!warmed && current) {
    warmed = true;
    void warmTextureCache(textures.allUrls());
  }
});

onRouteChange((r) => void goTo(r));
void goTo(parseHash(location.hash));
