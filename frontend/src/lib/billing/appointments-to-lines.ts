import { RawLineInput, ProcessedBillingLine, processBillingLine } from './calculator';

export interface AppointmentProcedure {
  id?: string;
  treatmentId: string;
  serviceName: string;
  toothRef?: string;
  dbPrice: number;
  dbCommission: number;
  dbLabCost: number;
  overridePrice: number | null;
  overrideCommission: number | null;
  overrideLabCost: number | null;
  showOverride?: boolean;
}

export function generateBillingLinesFromAppointments(
  appointments: any[], 
  clinicCommissionPct: number,
  clinicLabDiscountPct: number,
  catalogMap: Map<string, { price: number; id: string; lab_cost: number }>
): ProcessedBillingLine[] {
  
  const allLines: ProcessedBillingLine[] = [];
  let sortOrder = 0;

  for (const appt of appointments) {
    if (appt.status !== 'Realizada') continue;

    // Check if we have structured procedures in notes
    let procedures: AppointmentProcedure[] = [];
    if (appt.notes && appt.notes.includes('[Procedimientos:')) {
      try {
        const match = appt.notes.match(/\[Procedimientos:\s*(\[.*?\])\]/s);
        if (match && match[1]) {
          procedures = JSON.parse(match[1]);
        }
      } catch (e) {
        console.error('Error parsing procedures for appointment', appt.id, e);
      }
    }

    if (procedures.length > 0) {
      // Create a line for each procedure
      procedures.forEach((proc, idx) => {
        const rawLine: RawLineInput = {
          session_date: appt.appointment_date,
          patient_name: appt.patient?.name || `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`.trim() || 'Desconocido',
          treatment_name: proc.serviceName || appt.reason || 'Tratamiento',
          unit_price: proc.overridePrice !== null ? proc.overridePrice : proc.dbPrice,
          lab_name: proc.dbLabCost > 0 ? 'Lab Sugerido' : undefined,
          lab_unit_cost: proc.overrideLabCost !== null ? proc.overrideLabCost : proc.dbLabCost,
          commission_pct: proc.overrideCommission !== null ? proc.overrideCommission : undefined,
          patient_id: appt.patient_id,
          treatment_id: proc.treatmentId,
          appointment_id: appt.id,
          procedure_index: idx,
          source_type: 'appointment',
          sort_order: sortOrder++
        };
        
        allLines.push(processBillingLine(rawLine, clinicCommissionPct, clinicLabDiscountPct, catalogMap));
      });
    } else {
      // Basic appointment - just one line
      const rawLine: RawLineInput = {
        session_date: appt.appointment_date,
        patient_name: appt.patient?.name || `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`.trim() || 'Desconocido',
        treatment_name: appt.reason || appt.treatment?.serviceName || 'Tratamiento',
        unit_price: appt.treatment?.default_price ? Number(appt.treatment.default_price) : 0,
        lab_unit_cost: appt.treatment?.typical_lab_cost ? Number(appt.treatment.typical_lab_cost) : 0,
        patient_id: appt.patient_id,
        treatment_id: appt.treatment_id,
        appointment_id: appt.id,
        procedure_index: 0,
        source_type: 'appointment',
        sort_order: sortOrder++
      };

      allLines.push(processBillingLine(rawLine, clinicCommissionPct, clinicLabDiscountPct, catalogMap));
    }
  }

  return allLines;
}
