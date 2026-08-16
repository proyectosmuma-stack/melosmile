// frontend/src/lib/billing/types/appointment.ts
export interface Appointment {
  id: string;
  patientId: string;
  clinicId: string;
  treatmentId: string;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  treatmentPrice: number;
}