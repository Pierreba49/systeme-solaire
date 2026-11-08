import { describe, expect, it } from 'vitest';
import { detectQualityTier, resolveQualityTier } from '../../src/core/quality';
import { TextureStore } from '../../src/core/textures';

describe('detectQualityTier', () => {
  it('iPad : high quand deviceMemory est absent', () => {
    expect(detectQualityTier({ maxTextureSize: 16384, hardwareConcurrency: 6 })).toBe('high');
  });
  it('Android d\'entrée de gamme (3 Go) : low', () => {
    expect(detectQualityTier({ maxTextureSize: 8192, hardwareConcurrency: 8, deviceMemoryGb: 3 })).toBe('low');
  });
  it('texture max 4096 : low', () => {
    expect(detectQualityTier({ maxTextureSize: 4096, hardwareConcurrency: 8, deviceMemoryGb: 8 })).toBe('low');
  });
  it('moins de 4 cœurs : low', () => {
    expect(detectQualityTier({ maxTextureSize: 16384, hardwareConcurrency: 2 })).toBe('low');
  });
  it('seuils inclusifs : 8192, 4 cœurs, 4 Go : high', () => {
    expect(detectQualityTier({ maxTextureSize: 8192, hardwareConcurrency: 4, deviceMemoryGb: 4 })).toBe('high');
  });
});

describe('resolveQualityTier', () => {
  it('?qualite=basse l\'emporte sur un high stocké', () => {
    expect(resolveQualityTier('high', '?qualite=basse', 'high')).toBe('low');
  });
  it('?qualite=haute l\'emporte sur la détection low', () => {
    expect(resolveQualityTier('low', '?qualite=haute', null)).toBe('high');
  });
  it('la valeur stockée l\'emporte sur la détection', () => {
    expect(resolveQualityTier('high', '', 'low')).toBe('low');
  });
  it('une valeur stockée invalide est ignorée', () => {
    expect(resolveQualityTier('high', '', 'ultra')).toBe('high');
  });
  it('un paramètre d\'URL invalide est ignoré', () => {
    expect(resolveQualityTier('low', '?qualite=max', 'high')).toBe('high');
  });
  it('sans rien : la détection', () => {
    expect(resolveQualityTier('low', '', null)).toBe('low');
  });
});

describe('TextureStore.allUrls', () => {
  it('liste chaque texture du niveau une seule fois, fond d\'étoiles compris', () => {
    const urls = new TextureStore('low', '/systeme-solaire/').allUrls();
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain('/systeme-solaire/textures/low/stars_milky_way.jpg');
    expect(urls).toContain('/systeme-solaire/textures/low/saturn_ring_alpha.png');
    expect(urls).toContain('/systeme-solaire/textures/low/moon.jpg');
    expect(urls).toHaveLength(14);
  });
});
