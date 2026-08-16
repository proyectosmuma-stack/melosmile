// frontend/src/lib/billing/utils.ts
import { createClient } from "../../supabase/client";
import { Appointment } from './types/appointment';

// Pure synchronous validation
export const validateBillingEligibility = (appointment: Appointment): boolean => {
  // Check patient and clinic existence
  if (!appointment.patientId || !appointment.clinicId) return false;

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(appointment.date)) return false;

  // Check treatment price is positive
  if (appointment.treatmentPrice <= 0) return false;

  // Ensure status is not cancelled
  if (appointment.status === 'cancelled') return false;

  return true;
};

// Async validation with Supabase
export const validateBillingEligibilityAsync = async (appointment: Appointment): Promise<boolean> => {
  // First perform basic synchronous checks
  if (!validateBillingEligibility(appointment)) {
    return false;
  }

  // Initialize Supabase client
  const supabase = createClient();

  // Check patient exists and is active in database
  const { data: patients, error: patientError } = await supabase
    .from("patients")
    .select("id, is_active")
    .eq("id", appointment.patientId)
    .single();

  if (patientError || !patients || !patients.is_active) {
    return false;
  }

  // Check clinic exists and is active in database
  const { data: clinics, error: clinicError } = await supabase
    .from("clinics")
    .select("id, is_active")
    .eq("id", appointment.clinicId)
    .single();

  if (clinicError || !clinics || !clinics.is_active) {
    return false;
  }

  return true;
};