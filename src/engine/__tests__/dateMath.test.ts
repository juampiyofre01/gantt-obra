import { describe, expect, it } from 'vitest';
import { addWorkingDays, endFromDuration, spanDays } from '../dateMath';
import { CORRIDOS, HABILES } from './testUtils';

describe('addWorkingDays', () => {
  it('días corridos: suma calendario simple', () => {
    // 2026-01-05 is a Monday
    expect(addWorkingDays('2026-01-05', 5, CORRIDOS)).toBe('2026-01-10');
  });

  it('días hábiles: salta fines de semana', () => {
    // Mon 2026-01-05 + 5 work days = Mon 2026-01-12 (skips Sat 10, Sun 11)
    expect(addWorkingDays('2026-01-05', 5, HABILES)).toBe('2026-01-12');
  });

  it('días hábiles: salta feriados cargados', () => {
    const calendar = { workOnWeekends: false, holidays: ['2026-01-06'] };
    // Mon 5 -> Tue 6 is a holiday, so 1 work day lands on Wed 7
    expect(addWorkingDays('2026-01-05', 1, calendar)).toBe('2026-01-07');
  });

  it('acepta días negativos (retrocede)', () => {
    expect(addWorkingDays('2026-01-12', -5, HABILES)).toBe('2026-01-05');
  });

  it('0 días devuelve la misma fecha', () => {
    expect(addWorkingDays('2026-01-05', 0, HABILES)).toBe('2026-01-05');
  });
});

describe('endFromDuration', () => {
  it('duración 1 día: fin = inicio', () => {
    expect(endFromDuration('2026-01-05', 1, CORRIDOS)).toBe('2026-01-05');
  });

  it('duración 0 (hito): fin = inicio', () => {
    expect(endFromDuration('2026-01-05', 0, CORRIDOS)).toBe('2026-01-05');
  });

  it('duración 5 hábiles cruzando un fin de semana', () => {
    expect(endFromDuration('2026-01-05', 5, HABILES)).toBe('2026-01-09');
  });
});

describe('spanDays', () => {
  it('cuenta días hábiles inclusive entre dos fechas', () => {
    // Mon 5 .. Fri 9 = 5 work days
    expect(spanDays('2026-01-05', '2026-01-09', HABILES)).toBe(5);
  });

  it('cuenta corridos inclusive entre dos fechas', () => {
    expect(spanDays('2026-01-05', '2026-01-11', CORRIDOS)).toBe(7);
  });
});
