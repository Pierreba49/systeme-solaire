import { describe, expect, test, vi } from 'vitest';
import { SimClock } from '../../src/core/clock';
import { MAX_DATE } from '../../src/astro/ephemeris';

const DAY_MS = 86_400_000;

describe('SimClock', () => {
  test('vitesse day : tick(2) avance de 2 jours exactement', () => {
    const clock = new SimClock();
    const start = new Date('2026-01-01T00:00:00Z');
    clock.setDate(start);
    clock.setRate('day');
    clock.tick(2);
    expect(clock.date.getTime() - start.getTime()).toBe(2 * DAY_MS);
  });

  test('vitesse year près de MAX_DATE : clampe à MAX_DATE et passe en pause', () => {
    const clock = new SimClock();
    clock.setDate(new Date('2100-12-01T00:00:00Z'));
    clock.setRate('year');
    clock.tick(1);
    expect(clock.date.getTime()).toBe(MAX_DATE.getTime());
    expect(clock.rate).toBe('pause');
  });

  test('onChange est appelé à chaque tick non nul, pas à la pause', () => {
    const clock = new SimClock();
    const cb = vi.fn();
    clock.onChange(cb);
    clock.setRate('day');
    clock.tick(1);
    clock.tick(0.5);
    expect(cb).toHaveBeenCalledTimes(2);
    clock.setRate('pause');
    clock.tick(1);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  test('onChange renvoie une fonction de désabonnement', () => {
    const clock = new SimClock();
    const cb = vi.fn();
    const off = clock.onChange(cb);
    off();
    clock.setRate('day');
    clock.tick(1);
    expect(cb).not.toHaveBeenCalled();
  });

  test('resetToNow revient à moins d\'1 s de Date.now()', () => {
    const clock = new SimClock();
    clock.setDate(new Date('1950-06-15T12:00:00Z'));
    clock.resetToNow();
    expect(Math.abs(clock.date.getTime() - Date.now())).toBeLessThan(1000);
  });

  test('setDate clampe aux bornes', () => {
    const clock = new SimClock();
    clock.setDate(new Date('3000-01-01T00:00:00Z'));
    expect(clock.date.getTime()).toBe(MAX_DATE.getTime());
  });
});
