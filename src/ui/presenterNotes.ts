const STORAGE_KEY = 'systeme-solaire:notes-ouvertes';

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function storeOpen(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  } catch {
    // stockage indisponible : l'état vaut pour cet écran seulement
  }
}

/** Bouton « Notes » et panneau des notes du présentateur, masqué par défaut ; l'état ouvert/fermé est conservé. */
export function mountPresenterNotes(root: HTMLElement, notes: string[]): () => void {
  const wrap = document.createElement('div');
  wrap.className = 'presenter-notes';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'presenter-notes__toggle';
  button.textContent = 'Notes';

  const panel = document.createElement('section');
  panel.className = 'presenter-notes__panel';
  panel.setAttribute('aria-label', 'Notes du présentateur');
  const heading = document.createElement('h3');
  heading.textContent = 'Notes du présentateur';
  const list = document.createElement('ul');
  for (const n of notes) {
    const li = document.createElement('li');
    li.textContent = n;
    list.append(li);
  }
  panel.append(heading, list);

  let isOpen = false;
  const apply = (open: boolean): void => {
    isOpen = open;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  apply(readOpen());
  button.addEventListener('click', () => {
    apply(!isOpen);
    storeOpen(isOpen);
  });

  wrap.append(button, panel);
  root.append(wrap);
  return () => wrap.remove();
}
