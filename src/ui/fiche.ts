import type { Fiche } from '../content/fr/fiches';

/** Panneau de la Fiche : titre, puis chaque chiffre en libellé / valeur / comparaison. */
export function mountFiche(root: HTMLElement, fiche: Fiche): () => void {
  const panel = document.createElement('aside');
  panel.className = 'fiche';
  panel.setAttribute('aria-label', 'Fiche');

  const title = document.createElement('h2');
  title.className = 'fiche__titre';
  title.textContent = fiche.titre;
  panel.append(title);

  for (const c of fiche.chiffres) {
    const row = document.createElement('div');
    row.className = 'fiche__chiffre';
    const label = document.createElement('div');
    label.className = 'fiche__libelle';
    label.textContent = c.libelle;
    const value = document.createElement('div');
    value.className = 'fiche__valeur';
    value.textContent = c.valeur;
    const comparison = document.createElement('div');
    comparison.className = 'fiche__comparaison';
    comparison.textContent = c.comparaison;
    row.append(label, value, comparison);
    panel.append(row);
  }

  root.append(panel);
  return () => panel.remove();
}
