import { afterEach, describe, expect, test, vi } from 'vitest';
import { ObserverStore, VERSAILLES } from '../../src/astro/observer';

function stubGeolocation(impl: (ok: PositionCallback, ko: PositionErrorCallback, options?: PositionOptions) => void): void {
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: impl } });
}

afterEach(() => vi.unstubAllGlobals());

describe('ObserverStore', () => {
  test('Versailles par défaut', () => {
    expect(new ObserverStore().current).toEqual(VERSAILLES);
  });

  test('useGps : position acceptée, libellé « Ma position », options du brief, abonnés prévenus', async () => {
    let options: PositionOptions | undefined;
    stubGeolocation((ok, _ko, o) => {
      options = o;
      ok({ coords: { latitude: 43.3, longitude: 5.37, altitude: null } } as GeolocationPosition);
    });
    const store = new ObserverStore();
    const seen: string[] = [];
    store.onChange((o) => seen.push(o.label));
    expect(await store.useGps()).toBe('ok');
    expect(store.current).toMatchObject({ latitudeDeg: 43.3, longitudeDeg: 5.37, heightM: 0, label: 'Ma position' });
    expect(options).toEqual({ enableHighAccuracy: false, timeout: 10_000 });
    expect(seen).toEqual(['Ma position']);
  });

  test('useGps : refus -> denied, autre erreur -> unavailable, position inchangée', async () => {
    const store = new ObserverStore();
    stubGeolocation((_ok, ko) => ko({ code: 1 } as GeolocationPositionError));
    expect(await store.useGps()).toBe('denied');
    stubGeolocation((_ok, ko) => ko({ code: 2 } as GeolocationPositionError));
    expect(await store.useGps()).toBe('unavailable');
    stubGeolocation((_ok, ko) => ko({ code: 3 } as GeolocationPositionError));
    expect(await store.useGps()).toBe('unavailable');
    expect(store.current).toEqual(VERSAILLES);
  });

  test('useGps : API absente -> unavailable', async () => {
    vi.stubGlobal('navigator', {});
    expect(await new ObserverStore().useGps()).toBe('unavailable');
  });

  test('useDefault revient à Versailles et prévient les abonnés ; désabonnement', async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: 10, longitude: 20, altitude: 50 } } as GeolocationPosition));
    const store = new ObserverStore();
    await store.useGps();
    expect(store.current.heightM).toBe(50);
    const cb = vi.fn();
    const off = store.onChange(cb);
    store.useDefault();
    expect(store.current).toEqual(VERSAILLES);
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    store.useDefault();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
