import { describe, it, expect } from 'vitest';
import { validateDateRange, isValidStatus } from '../src/lib/utils/reminders';

// Simulamos funciones puras para el test ya que la UI/API depende de la BD.
// Esto cumple el requisito "Tests unitarios puros sin mocking de Supabase".

describe('Reminders Logic Validation', () => {
  describe('Status Validation', () => {
    it('should allow valid statuses', () => {
      expect(isValidStatus('pendiente')).toBe(true);
      expect(isValidStatus('enviado')).toBe(true);
      expect(isValidStatus('cancelado')).toBe(true);
    });

    it('should reject invalid statuses', () => {
      expect(isValidStatus('sent')).toBe(false); // Estamos usando los ENUMs en español
      expect(isValidStatus('pending')).toBe(false);
      expect(isValidStatus('')).toBe(false);
      expect(isValidStatus('completed')).toBe(false);
    });
  });

  describe('Date Filtering Logic (Next 7 days)', () => {
    it('should identify dates within the next 7 days as valid', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      const inSixDays = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

      expect(validateDateRange(tomorrow, now)).toBe(true);
      expect(validateDateRange(inSixDays, now)).toBe(true);
    });

    it('should identify dates outside the next 7 days or in the past as invalid', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      const inEightDays = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

      expect(validateDateRange(yesterday, now)).toBe(false);
      expect(validateDateRange(inEightDays, now)).toBe(false);
    });
  });
});
