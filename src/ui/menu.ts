import { CHAPTER_TITLES } from '../app/chapter';
import { formatHash, type ChapterId } from '../app/router';

export type QualityChoice = 'auto' | 'haute' | 'basse';

const QUALITY_LABELS: ReadonlyArray<{ id: QualityChoice; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'haute', label: 'Haute' },
  { id: 'basse', label: 'Basse' },
];

export interface MenuOptions {
  quality: QualityChoice;
  onQualityChange(choice: QualityChoice): void;
  onOpenSources(): void;
}

export interface Menu {
  setActive(chapter: ChapterId): void;
}

export function mountMenu(parent: HTMLElement, opts: MenuOptions): Menu {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'menu-toggle';
  toggle.textContent = 'Menu';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'menu-panel');

  const panel = document.createElement('nav');
  panel.id = 'menu-panel';
  panel.className = 'menu-panel';
  panel.setAttribute('aria-label', 'Chapitres');
  panel.hidden = true;

  const links = new Map<ChapterId, HTMLAnchorElement>();
  for (const id of Object.keys(CHAPTER_TITLES) as ChapterId[]) {
    const a = document.createElement('a');
    a.href = formatHash({ chapter: id });
    a.textContent = CHAPTER_TITLES[id];
    a.className = 'menu-item';
    a.addEventListener('click', () => setOpen(false));
    links.set(id, a);
    panel.append(a);
  }

  const sources = document.createElement('button');
  sources.type = 'button';
  sources.className = 'menu-item';
  sources.textContent = 'Sources';
  sources.addEventListener('click', () => {
    setOpen(false);
    opts.onOpenSources();
  });
  panel.append(sources);

  const group = document.createElement('div');
  group.className = 'menu-quality';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Qualité');
  const caption = document.createElement('span');
  caption.textContent = 'Qualité';
  group.append(caption);
  for (const { id, label } of QUALITY_LABELS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(id === opts.quality));
    b.addEventListener('click', () => {
      if (id !== opts.quality) opts.onQualityChange(id);
    });
    group.append(b);
  }
  panel.append(group);

  function setOpen(open: boolean): void {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', () => setOpen(Boolean(panel.hidden)));
  // Fermeture en touchant ailleurs ou avec Échap.
  document.addEventListener('pointerdown', (e) => {
    if (panel.hidden) return;
    const target = e.target as Node;
    if (!panel.contains(target) && !toggle.contains(target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  parent.append(toggle, panel);

  return {
    setActive(chapter) {
      for (const [id, a] of links) {
        if (id === chapter) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
    },
  };
}

/** Panneau Sources : son contenu est rempli par mountSources (src/ui/sources.ts). */
export function mountSourcesPanel(parent: HTMLElement): { open(): void; content: HTMLElement } {
  const panel = document.createElement('section');
  panel.className = 'sources-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Sources');
  panel.hidden = true;
  const content = document.createElement('div');
  content.className = 'sources-panel__content';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'sources-panel__close';
  close.textContent = 'Fermer';
  close.addEventListener('click', () => {
    panel.hidden = true;
  });
  panel.append(close, content);
  parent.append(panel);
  return {
    open() {
      panel.hidden = false;
    },
    content,
  };
}
