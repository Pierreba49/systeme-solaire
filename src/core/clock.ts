import { clampDate, MAX_DATE, MIN_DATE } from '../astro/ephemeris';

const DAY_MS = 86_400_000;

/** Jours simulés par seconde réelle. */
export const RATES = { pause: 0, realtime: 1 / 86400, day: 1, month: 30, year: 365.25 } as const;
export type RateId = keyof typeof RATES;

export class SimClock {
  private current = new Date();
  private currentRate: RateId = 'realtime';
  private listeners = new Set<(d: Date) => void>();

  get date(): Date {
    return new Date(this.current);
  }

  get rate(): RateId {
    return this.currentRate;
  }

  setRate(r: RateId): void {
    this.currentRate = r;
  }

  setDate(d: Date): void {
    this.current = new Date(clampDate(d));
    this.emit();
  }

  resetToNow(): void {
    this.setDate(new Date());
  }

  /** Avance de RATES[rate]·dt jours, clampe ; passe en 'pause' s'il atteint une borne. */
  tick(dtSeconds: number): void {
    const days = RATES[this.currentRate] * dtSeconds;
    if (days === 0) return;
    const next = this.current.getTime() + days * DAY_MS;
    if (next >= MAX_DATE.getTime() || next <= MIN_DATE.getTime()) {
      this.current = new Date(next >= MAX_DATE.getTime() ? MAX_DATE : MIN_DATE);
      this.currentRate = 'pause';
    } else {
      this.current = new Date(next);
    }
    this.emit();
  }

  onChange(cb: (d: Date) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit(): void {
    const d = this.date;
    for (const cb of this.listeners) cb(d);
  }
}
