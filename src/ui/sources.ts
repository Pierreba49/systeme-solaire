import { SOURCES, CC_BY_URL, type Source } from '../content/sources';

const DATE_FR = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' });

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(href: string, text: string): HTMLAnchorElement {
  const a = el('a', text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function sourceItem(s: Source): HTMLLIElement {
  const li = el('li');
  li.append(el('strong', s.titre), el('br'), link(s.url, s.url));
  const date = DATE_FR.format(new Date(`${s.consulte}T00:00:00Z`));
  li.append(el('p', `Licence : ${s.licence}. Consulté le ${date}.`, 'sources__meta'));
  return li;
}

/** Écran Sources : toutes les sources, plus les crédits de textures exigés par la CC BY 4.0. */
export function mountSources(root: HTMLElement): () => void {
  const section = el('div', undefined, 'sources');
  section.append(el('h2', 'Sources'));
  section.append(
    el('p', 'Chaque chiffre des fiches vient d’une des sources ci-dessous. Les comparaisons sont calculées à partir de ces chiffres.'),
  );

  const list = el('ul');
  for (const s of SOURCES) list.append(sourceItem(s));
  section.append(list);

  section.append(el('h3', 'Crédits des textures'));
  const credit = el('p');
  credit.append(
    'Les textures du Soleil, des planètes et du fond d’étoiles viennent de Solar System Scope (',
    link('https://www.solarsystemscope.com/textures/', 'solarsystemscope.com/textures'),
    '), sous licence ',
    link(CC_BY_URL, 'Creative Commons Attribution 4.0 (CC BY 4.0)'),
    '. Elles ont été redimensionnées et recompressées pour l’application.',
  );
  section.append(credit);
  section.append(
    el('p', 'La texture de la Lune vient du CGI Moon Kit de la NASA Scientific Visualization Studio, dans le domaine public.'),
  );
  section.append(
    el('p', 'La texture de Vénus utilisée en haute qualité est la version 2k (2048 × 1024 pixels).'),
  );

  section.append(el('h3', 'Hypothèses des comparaisons'));
  section.append(
    el(
      'p',
      'Voiture : 130 km/h sans arrêt. Avion de ligne : 900 km/h. Lumière : 299 792,458 km/s. Diamètres : deux fois le rayon équatorial de la fiche NASA ; pour le Soleil, le rayon moyen en volume.',
    ),
  );

  root.append(section);
  return () => {
    section.remove();
  };
}
