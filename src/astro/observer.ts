export interface Observer {
  latitudeDeg: number;
  longitudeDeg: number;
  heightM: number;
  label: string;
}

export const VERSAILLES: Observer = {
  latitudeDeg: 48.8049,
  longitudeDeg: 2.1204,
  heightM: 130,
  label: 'Versailles',
};

export type GpsResult = 'ok' | 'denied' | 'unavailable';

const GPS_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000 };
/** Code d'erreur W3C PERMISSION_DENIED (la constante n'existe pas hors navigateur). */
const PERMISSION_DENIED = 1;

/** Lieu d'observation courant : Versailles par défaut, la position de l'appareil sur demande. Elle reste en mémoire et ne part nulle part. */
export class ObserverStore {
  private observer: Observer = VERSAILLES;
  private listeners = new Set<(o: Observer) => void>();

  get current(): Observer {
    return this.observer;
  }

  useGps(): Promise<GpsResult> {
    return new Promise((resolve) => {
      const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
      if (!geolocation) {
        resolve('unavailable');
        return;
      }
      geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
            resolve('unavailable');
            return;
          }
          this.set({
            latitudeDeg: coords.latitude,
            longitudeDeg: coords.longitude,
            heightM: coords.altitude ?? 0,
            label: 'Ma position',
          });
          resolve('ok');
        },
        (err) => resolve(err.code === PERMISSION_DENIED ? 'denied' : 'unavailable'),
        GPS_OPTIONS,
      );
    });
  }

  useDefault(): void {
    this.set(VERSAILLES);
  }

  onChange(cb: (o: Observer) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private set(o: Observer): void {
    this.observer = o;
    for (const cb of this.listeners) cb(o);
  }
}
