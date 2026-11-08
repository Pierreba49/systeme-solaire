import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { TextureStore } from '../../src/core/textures';

function storeWithFakeLoader(tier: 'high' | 'low') {
  const store = new TextureStore(tier, '/', 16);
  const loaded: THREE.Texture[] = [];
  (store as unknown as { loader: { loadAsync: (u: string) => Promise<THREE.Texture> } }).loader = {
    loadAsync: async () => {
      const t = new THREE.Texture();
      loaded.push(t);
      return t;
    },
  };
  return { store, loaded };
}

describe('TextureStore', () => {
  it('releaseGpu libère chaque texture chargée, y compris la copie du fond d’étoiles', async () => {
    const { store, loaded } = storeWithFakeLoader('high');
    await store.get('earth_daymap.jpg');
    const map = await store.getStarfieldMap();
    const spies = [...loaded, map].map((t) => vi.spyOn(t, 'dispose'));
    store.releaseGpu();
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
  });

  it('la carte du fond d’étoiles est copiée une seule fois par session', async () => {
    const { store } = storeWithFakeLoader('high');
    expect(await store.getStarfieldMap()).toBe(await store.getStarfieldMap());
  });

  it('anisotropie : maximale en high, 4 en low', async () => {
    expect((await storeWithFakeLoader('high').store.get('a.jpg')).anisotropy).toBe(16);
    expect((await storeWithFakeLoader('low').store.get('a.jpg')).anisotropy).toBe(4);
  });
});
