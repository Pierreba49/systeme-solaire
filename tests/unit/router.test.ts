import { describe, expect, it } from 'vitest';
import { formatHash, parseHash, type ChapterId } from '../../src/app/router';

describe('router', () => {
  it.each<ChapterId>(['systeme-solaire', 'planete', 'lune', 'echelle-reelle'])('aller-retour pour %s', (chapter) => {
    expect(parseHash(formatHash({ chapter }))).toEqual({ chapter });
  });

  it('aller-retour avec un corps', () => {
    expect(formatHash({ chapter: 'planete', body: 'mars' })).toBe('#planete/mars');
    expect(parseHash('#planete/mars')).toEqual({ chapter: 'planete', body: 'mars' });
  });

  it.each(['sun', 'moon', 'earth'] as const)('aller-retour avec le corps %s', (body) => {
    expect(parseHash(formatHash({ chapter: 'planete', body }))).toEqual({ chapter: 'planete', body });
  });

  it('un corps inconnu est ignoré', () => {
    expect(parseHash('#planete/pluton')).toEqual({ chapter: 'planete' });
  });

  it('hash vide ou inconnu → système solaire', () => {
    expect(parseHash('')).toEqual({ chapter: 'systeme-solaire' });
    expect(parseHash('#')).toEqual({ chapter: 'systeme-solaire' });
    expect(parseHash('#nimporte-quoi')).toEqual({ chapter: 'systeme-solaire' });
  });
});
