import type * as THREE from 'three';
import type { SimClock } from '../core/clock';
import type { QualityTier } from '../core/quality';
import type { TextureStore } from '../core/textures';
import type { ChapterId, Route } from './router';

export interface ChapterContext {
  renderer: THREE.WebGLRenderer;
  clock: SimClock;
  quality: QualityTier;
  textures: TextureStore;
  /** Conteneur de l'interface du chapitre. Il laisse passer les touchers (pointer-events: none) ; les éléments interactifs doivent activer pointer-events: auto. Le chapitre retire ce qu'il y ajoute dans exit(). */
  overlay: HTMLElement;
  navigate(r: Route): void;
}

export interface Chapter {
  readonly id: ChapterId;
  enter(ctx: ChapterContext, route: Route): Promise<void>;
  exit(): void;
  update(dtSeconds: number): void;
  render(): void;
  resize(w: number, h: number): void;
}

export const CHAPTER_TITLES: Record<ChapterId, string> = {
  'systeme-solaire': 'Système solaire',
  planete: 'Les planètes',
  lune: 'La Lune',
  'echelle-reelle': 'Échelle réelle',
};

const factories = new Map<ChapterId, () => Chapter>();

/** Enregistrer deux fois le même identifiant remplace la fabrique précédente. */
export function registerChapter(id: ChapterId, factory: () => Chapter): void {
  factories.set(id, factory);
}

export function createChapter(id: ChapterId): Chapter {
  const factory = factories.get(id);
  if (!factory) throw new Error(`Chapitre non enregistré : ${id}`);
  return factory();
}
