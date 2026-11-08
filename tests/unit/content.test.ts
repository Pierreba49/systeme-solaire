import { describe, expect, test } from 'vitest';
import { BODIES } from '../../src/data/bodies';
import type { BodyId } from '../../src/data/bodies';
import { SOURCES } from '../../src/content/sources';
import { FICHES } from '../../src/content/fr/fiches';
import { NOTES_LUNE } from '../../src/content/fr/lune';

const IDS = Object.keys(BODIES) as BodyId[];
const sourceIds = new Set(SOURCES.map((s) => s.id));

function* allStrings(): Generator<string> {
  for (const f of Object.values(FICHES)) {
    yield f.titre;
    for (const c of f.chiffres) yield* [c.libelle, c.valeur, c.comparaison, c.sourceId];
    yield* f.notes;
  }
  for (const notes of Object.values(NOTES_LUNE)) yield* notes;
  for (const s of SOURCES) yield* [s.id, s.titre, s.url, s.licence, s.consulte];
}

describe('fiches', () => {
  test('chaque corps a une fiche', () => {
    expect(Object.keys(FICHES).sort()).toEqual([...IDS].sort());
  });

  test.each(IDS)('%s : 3 à 4 chiffres et au moins 3 notes', (id) => {
    const f = FICHES[id];
    expect(f.titre).toBe(BODIES[id].nameFr);
    expect(f.chiffres.length).toBeGreaterThanOrEqual(3);
    expect(f.chiffres.length).toBeLessThanOrEqual(4);
    expect(f.notes.length).toBeGreaterThanOrEqual(3);
    for (const c of f.chiffres) {
      expect(c.libelle.trim()).not.toBe('');
      expect(c.valeur.trim()).not.toBe('');
      expect(c.comparaison.trim()).not.toBe('');
    }
  });

  test('chaque sourceId existe dans SOURCES', () => {
    for (const f of Object.values(FICHES))
      for (const c of f.chiffres) expect(sourceIds.has(c.sourceId), c.sourceId).toBe(true);
  });
});

describe('sources', () => {
  test('URL https et date de consultation valide', () => {
    for (const s of SOURCES) {
      expect(s.url.startsWith('https://'), s.url).toBe(true);
      expect(s.consulte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(s.consulte))).toBe(false);
      expect(s.licence.trim()).not.toBe('');
    }
  });

  test('identifiants uniques', () => {
    expect(sourceIds.size).toBe(SOURCES.length);
  });

  test('Solar System Scope est sous CC BY 4.0', () => {
    expect(SOURCES.find((s) => s.id === 'solar-system-scope')?.licence).toContain('CC BY 4.0');
  });
});

describe('notes de la Lune', () => {
  test.each(['phases', 'jour', 'face-cachee', 'eclipses'] as const)('%s : au moins 3 notes', (k) => {
    expect(NOTES_LUNE[k].length).toBeGreaterThanOrEqual(3);
  });
});

describe('qualité du texte', () => {
  test('aucune chaîne ne contient TODO, point d’exclamation ou « socle »', () => {
    for (const s of allStrings()) {
      expect(s).not.toMatch(/TODO/);
      expect(s).not.toMatch(/!/);
      expect(s.toLowerCase()).not.toContain('socle');
    }
  });
});
