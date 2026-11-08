import { BODIES } from '../data/bodies';
import type { BodyId } from '../data/bodies';

export type ChapterId = 'systeme-solaire' | 'planete' | 'lune' | 'echelle-reelle';
export interface Route {
  chapter: ChapterId;
  body?: BodyId;
}

const CHAPTER_IDS: readonly ChapterId[] = ['systeme-solaire', 'planete', 'lune', 'echelle-reelle'];

function isChapterId(s: string): s is ChapterId {
  return (CHAPTER_IDS as readonly string[]).includes(s);
}

/** Hash inconnu ou vide → système solaire. Le corps n'est conservé que pour le chapitre « planete », et seulement si c'est un BodyId connu (soleil, planètes, Lune). */
export function parseHash(hash: string): Route {
  const [chapter = '', body = ''] = hash.replace(/^#/, '').split('/');
  if (!isChapterId(chapter)) return { chapter: 'systeme-solaire' };
  if (chapter === 'planete' && Object.hasOwn(BODIES, body)) return { chapter, body: body as BodyId };
  return { chapter };
}

export function formatHash(r: Route): string {
  return r.body && r.chapter === 'planete' ? `#${r.chapter}/${r.body}` : `#${r.chapter}`;
}

/** Appelle `cb` à chaque changement de hash ; renvoie la fonction de désinscription. */
export function onRouteChange(cb: (r: Route) => void): () => void {
  const handler = (): void => cb(parseHash(location.hash));
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

export function navigateTo(r: Route): void {
  location.hash = formatHash(r);
}
