import * as THREE from 'three';
import { BODIES } from '../data/bodies';
import type { QualityTier } from './quality';

/** Fond d'étoiles : hors BODIES. */
const STARFIELD_TEXTURE = 'stars_milky_way.jpg';

export class TextureStore {
  private readonly loader = new THREE.TextureLoader();
  private readonly cache = new Map<string, Promise<THREE.Texture>>();
  private readonly resolved = new Map<string, THREE.Texture>();
  private starfieldMap: Promise<THREE.Texture> | null = null;

  constructor(
    private readonly tier: QualityTier,
    private readonly base: string,
    private readonly maxAnisotropy = 8,
  ) {}

  private urlFor(name: string): string {
    return `${this.base}textures/${this.tier}/${name}`;
  }

  /** `path` : nom de fichier relatif au dossier du niveau (ex. 'earth_daymap.jpg'). */
  get(path: string): Promise<THREE.Texture> {
    let pending = this.cache.get(path);
    if (!pending) {
      pending = this.loader.loadAsync(this.urlFor(path)).then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = this.tier === 'high' ? this.maxAnisotropy : Math.min(4, this.maxAnisotropy);
        this.resolved.set(path, texture);
        return texture;
      });
      // Un échec ne reste pas en cache : un nouvel essai est possible.
      pending.catch(() => this.cache.delete(path));
      this.cache.set(path, pending);
    }
    return pending;
  }

  /**
   * Carte du fond d'étoiles, vue de l'intérieur donc inversée horizontalement :
   * une seule copie par session (la copie évite de modifier la texture en cache).
   */
  getStarfieldMap(): Promise<THREE.Texture> {
    if (!this.starfieldMap) {
      this.starfieldMap = this.get(STARFIELD_TEXTURE).then((source) => {
        const map = source.clone();
        map.wrapS = THREE.RepeatWrapping;
        map.repeat.x = -1;
        map.needsUpdate = true;
        this.resolved.set(`${STARFIELD_TEXTURE}#clone`, map);
        return map;
      });
      this.starfieldMap.catch(() => {
        this.starfieldMap = null;
      });
    }
    return this.starfieldMap;
  }

  /**
   * Libère la mémoire GPU de toutes les textures chargées. L'image reste en mémoire JS :
   * three.js la renvoie au GPU à la prochaine utilisation.
   */
  releaseGpu(): void {
    for (const texture of this.resolved.values()) texture.dispose();
  }

  /** Toutes les textures du niveau courant, sans doublon. */
  allUrls(): string[] {
    const names = new Set<string>([STARFIELD_TEXTURE]);
    for (const body of Object.values(BODIES)) {
      for (const name of Object.values(body.textures)) {
        if (name) names.add(name);
      }
    }
    return [...names].map((name) => this.urlFor(name));
  }
}

/**
 * Au tout premier chargement, la page n'est pas encore contrôlée par le service worker :
 * ses requêtes ne passeraient pas par le cache « textures ». On attend donc la prise de contrôle.
 */
async function waitForServiceWorkerControl(timeoutMs = 10_000): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  const control = (async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
    );
  })();
  try {
    await Promise.race([control, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Remplit le cache HTTP du navigateur (service worker compris), une URL à la fois. Les erreurs sont ignorées. */
export async function warmTextureCache(urls: string[]): Promise<void> {
  try {
    await waitForServiceWorkerControl();
  } catch {
    // pas de service worker (dev, navigateur ancien) : on précharge quand même
  }
  for (const url of urls) {
    try {
      const response = await fetch(url);
      await response.blob();
    } catch {
      // hors ligne ou fichier absent : le préchargement est facultatif
    }
  }
  window.__texturesWarm = true;
}
