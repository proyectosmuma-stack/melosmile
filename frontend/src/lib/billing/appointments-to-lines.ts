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
        const match = appt.notes.match(/\[Procedimientos:\s*(\[[\s\S]*?\])\]/);
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
        // Resolve effective price: manual override > current clinic catalog price > snapshot dbPrice
        const catalogEntry = proc.treatmentId
          ? [...catalogMap.values()].find(e => e.id === proc.treatmentId)
          : catalogMap.get((proc.serviceName || '').trim().toLowerCase());
        
        const currentCatalogPrice = catalogEntry?.price ?? proc.dbPrice;
        
        const rawLine: RawLineInput = {
          session_date: appt.appointment_date,
          patient_name: appt.patient?.name || `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`.trim() || 'Desconocido',
          treatment_name: proc.serviceName || appt.reason || 'Tratamiento',
          // Priority: manual overridePrice > current clinic catalog price > snapshot dbPrice
          unit_price: proc.overridePrice !== null ? proc.overridePrice : currentCatalogPrice,
          lab_name: proc.dbLabCost > 0 ? 'Lab Sugerido' : undefined,
          lab_unit_cost: proc.overrideLabCost !== null ? proc.overrideLabCost : (catalogEntry?.lab_cost ?? proc.dbLabCost),
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
      // Basic appointment - use catalogMap which includes clinic-specific price overrides
      const treatmentName = appt.reason || appt.treatment?.service_name || 'Tratamiento';
      const catalogEntry = catalogMap.get(treatmentName.trim().toLowerCase());

      const rawLine: RawLineInput = {
        session_date: appt.appointment_date,
        patient_name: appt.patient?.name || `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`.trim() || 'Desconocido',
        treatment_name: treatmentName,
        // Prefer clinic-specific price from catalogMap over the generic treatment default_price
        unit_price: catalogEntry ? catalogEntry.price : (appt.treatment?.default_price ? Number(appt.treatment.default_price) : 0),
        lab_unit_cost: catalogEntry ? catalogEntry.lab_cost : (appt.treatment?.typical_lab_cost ? Number(appt.treatment.typical_lab_cost) : 0),
        patient_id: appt.patient_id,
        treatment_id: appt.treatment_id || catalogEntry?.id,
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
