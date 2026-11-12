// frontend/src/lib/billing/utils.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateBillingEligibilityAsync } from './utils';
import { Appointment } from './types/appointment';

// Resultado configurable que devolverá .single() en cada consulta.
// utils.ts encadena .eq("id", ...).single() igual para patients y clinics,
// por lo que un único resultado configurable sirve para ambas llamadas.
const { singleResult, setSingleResult } = vi.hoisted(() => {
  type SingleResult = { data: unknown; error: unknown };
  let current: SingleResult = { data: null, error: null };
  return {
    setSingleResult: (result: SingleResult) => {
      current = result;
    },
    singleResult: async (): Promise<SingleResult> => current,
  };
});

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: singleResult,
        }),
      }),
    }),
  },
}));

const buildAppointment = (): Appointment => ({
  id: '123',
  patientId: 'p123',
  clinicId: 'c456',
  treatmentId: 't789',
  date: '2026-08-16',
  status: 'pending',
  treatmentPrice: 150.0,
});

describe('validateBillingEligibilityAsync', () => {
  beforeEach(() => {
    setSingleResult({ data: null, error: null });
  });

  it('should return true when patient and clinic are active', async () => {
    setSingleResult({ data: { id: 'p123', is_active: true }, error: null });
    expect(await validateBillingEligibilityAsync(buildAppointment())).toBe(true);
  });

  it('should return false when the query fails', async () => {
    setSingleResult({ data: null, error: { message: 'db unavailable' } });
    expect(await validateBillingEligibilityAsync(buildAppointment())).toBe(false);
  });
});
