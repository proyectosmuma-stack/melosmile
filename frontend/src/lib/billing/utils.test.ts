// frontend/src/lib/billing/utils.test.ts
import { validateBillingEligibility } from './utils';
import { Appointment } from './types/appointment';
import { jest } from 'vitest';

// Mock Supabase client
jest.mock('../../supabase/client', () => {
  return {
    createClient: jest.fn(() => ({
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (key: string, value: string) => ({
            single: jest.fn((cb: any) => cb({ data: { id: 'p123', is_active: true } }))
          }),
        }),
      }),
    })
  });
});

describe('validateBillingEligibilityAsync', () => {
  it('should return true when patient and clinic are active', async () => {
    const appointment: Appointment = {
      id: '123',
      patientId: 'p123',
      clinicId: 'c456',
      treatmentId: 't789',
      date: '2026-08-16',
      status: 'pending',
      treatmentPrice: 150.0
    };
    expect(await validateBillingEligibilityAsync(appointment)).toBe(true);
  });

  it('should return false when patient or clinic is not active', async () => {
    const appointment: Appointment = {
      id: '456',
      patientId: 'p789',
      clinicId: 'c101',
      treatmentId: 't303',
      date: '2026-08-16',
      status: 'pending',
      treatmentPrice: 150.0
    };
    expect(await validateBillingEligibilityAsync(appointment)).toBe(false);
  });
});