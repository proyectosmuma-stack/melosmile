// frontend/src/lib/utils/date-parser.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDateRange } from './date-parser';

// "Hoy" fijado a domingo 2026-08-23 (Europe/Madrid) para resultados deterministas.
const PINNED_NOW = new Date('2026-08-23T10:00:00Z');

describe('getDateRange - nombres de mes en español', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(PINNED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resuelve el mes actual completo ("agosto")', () => {
    const r = getDateRange('agosto');
    expect(r.startISO).toBe('2026-08-01T00:00:00.000Z');
    expect(r.endISO).toBe('2026-08-31T23:59:59.999Z');
    expect(r.dateLabel).toBe('agosto (2026-08-01 al 2026-08-31)');
  });

  it('resuelve un mes futuro del año en curso ("el mes de septiembre")', () => {
    const r = getDateRange('el mes de septiembre');
    expect(r.startISO).toBe('2026-09-01T00:00:00.000Z');
    expect(r.endISO).toBe('2026-09-30T23:59:59.999Z');
    expect(r.dateLabel).toBe('septiembre (2026-09-01 al 2026-09-30)');
  });

  it('resuelve la próxima ocurrencia de un mes ya pasado ("enero" -> 2027)', () => {
    const r = getDateRange('enero');
    expect(r.startISO).toBe('2027-01-01T00:00:00.000Z');
    expect(r.endISO).toBe('2027-01-31T23:59:59.999Z');
    expect(r.dateLabel).toBe('enero (2027-01-01 al 2027-01-31)');
  });
});

describe('getDateRange - regresiones', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(PINNED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('"26 de agosto" sigue resolviendo como día único (no rango de mes)', () => {
    const r = getDateRange('26 de agosto');
    expect(r.startISO).toBe('2026-08-26T00:00:00.000Z');
    expect(r.endISO).toBe('2026-08-26T23:59:59.999Z');
    expect(r.dateLabel).toBe('2026-08-26');
  });

  it('"esta semana" sigue funcionando (lunes 17 al domingo 23)', () => {
    const r = getDateRange('esta semana');
    expect(r.startISO).toBe('2026-08-17T00:00:00.000Z');
    expect(r.endISO).toBe('2026-08-23T23:59:59.999Z');
    expect(r.dateLabel).toBe('esta semana (2026-08-17 al 2026-08-23)');
  });
});

describe('getDateRange - rangos explícitos YYYY-MM-DD/YYYY-MM-DD', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(PINNED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resuelve un rango de mes completo ("2026-08-01/2026-08-31")', () => {
    const r = getDateRange('2026-08-01/2026-08-31');
    expect(r.startISO).toBe('2026-08-01T00:00:00.000Z');
    expect(r.endISO).toBe('2026-08-31T23:59:59.999Z');
    expect(r.dateLabel).toBe('2026-08-01 al 2026-08-31');
  });

  it('resuelve un rango parcial ("2026-08-10/2026-08-12")', () => {
    const r = getDateRange('2026-08-10/2026-08-12');
    expect(r.startISO).toBe('2026-08-10T00:00:00.000Z');
    expect(r.endISO).toBe('2026-08-12T23:59:59.999Z');
    expect(r.dateLabel).toBe('2026-08-10 al 2026-08-12');
  });

  it('tolera espacios alrededor del separador ("2026-08-10 / 2026-08-12")', () => {
    const r = getDateRange('2026-08-10 / 2026-08-12');
    expect(r.startISO).toBe('2026-08-10T00:00:00.000Z');
    expect(r.endISO).toBe('2026-08-12T23:59:59.999Z');
    expect(r.dateLabel).toBe('2026-08-10 al 2026-08-12');
  });
});
