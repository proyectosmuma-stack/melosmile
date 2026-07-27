/**
 * Motor de Cálculo Financiero y Validaciones Contables — Melosmile (Modelo ALBACETE DEFINITIVO)
 */

export interface RawLineInput {
  id?: string;
  session_date?: string;
  patient_name?: string;
  patient_id?: string | null;
  treatment_name?: string;
  treatment_id?: string | null;
  observation?: string;
  quantity?: number;
  unit_price?: number;
  alt_price?: number;
  discount?: number;
  commission_pct?: number;
  lab_name?: string;
  lab_quantity?: number;
  lab_unit_cost?: number;
  lab_discount_pct?: number;
  pct_dr_main?: number;
  pct_dr_secondary?: number;
  payment_status?: 'pending' | 'paid' | 'partial' | 'not_tracked';
  payment_amount?: number;
  sort_order?: number;
  appointment_id?: string;
  procedure_index?: number;
  source_type?: 'appointment' | 'manual' | 'excel_import';
}

export interface ProcessedBillingLine {
  id?: string;
  sort_order: number;
  session_date: string;
  patient_name: string;
  patient_id: string | null;
  treatment_name: string;
  treatment_id: string | null;
  observation: string;
  quantity: number;
  unit_price: number;
  alt_price: number;
  effective_price: number;
  discount: number;
  subtotal: number;
  commission_pct: number;
  commission_amount: number;
  lab_name: string;
  lab_quantity: number;
  lab_unit_cost: number;
  lab_subtotal: number;
  lab_discount_pct: number;
  lab_total_discounted: number;
  net_amount: number;
  pct_dr_main: number;
  amount_dr_main: number;
  pct_dr_secondary: number;
  amount_dr_secondary: number;

  // Flags & Audits
  needs_review: boolean;
  is_negative: boolean;
  no_price: boolean;
  zero_quantity: boolean;
  is_lab_suggested: boolean;
  validation_flags: {
    level: 'ERROR' | 'ALERTA' | 'NEGATIVO' | 'INFO';
    code: string;
    message: string;
  }[];
  catalog_price: number;
  price_deviation_pct: number;
  payment_status: 'pending' | 'paid' | 'partial' | 'not_tracked';
  payment_amount: number;
  appointment_id?: string;
  procedure_index: number;
  source_type: 'appointment' | 'manual' | 'excel_import';
}

export interface SessionTotals {
  total_subtotal: number;
  total_commission: number;
  total_lab: number;
  total_neto: number;
  total_dr_main: number;
  has_blocking_errors: boolean;
  error_count: number;
  warning_count: number;
  info_count: number;
}

// Mapa de Sugerencias de Trabajo/Material de Laboratorio por Tratamiento
export const TREATMENT_LAB_SUGGESTIONS: Record<string, string> = {
  'ortodoncia invisible / alineadores': 'Alineadores Transparentes (Set Completo)',
  'ortodoncia brackets metálicos': 'Set de Brackets y Arcos Metálicos',
  'ortodoncia brackets cerámicos': 'Set de Brackets Estéticos Cerámicos',
  'corona zirconio': 'Corona Zirconio Monolítico',
  'corona metal-porcelana': 'Corona Metal-Cerámica / Porcelana',
  'corona sobre implante': 'Corona Zirconio sobre Implante',
  'implante dental': 'Fase Quirúrgica / Implante Titánio',
  'incrustación / inlay-onlay': 'Incrustación Disilicato de Litio',
  'prótesis removible completa': 'Prótesis Removible Resina Completa',
  'prótesis removible parcial': 'Prótesis Esquelética / Removible Parcial',
  'puente dental': 'Puente Fijo Zirconio / Metal Porcelana',
  'carilla cerámica': 'Carilla Disilicato de Litio',
  'corona pediátrica (acero)': 'Corona de Acero Preconformada',
  'placa de descarga': 'Férula de Descarga Miotensiva / Placa Míchigan',
  'retratamiento de conducto': 'Material de Endodoncia / Perno',
  'blanqueamiento dental': 'Kits y Férulas de Blanqueamiento',
  'elevación de seno': 'Material de Graft Óseo / Membrana',
  'injerto óseo': 'Hueso Liofilizado y Membrana'
};

/**
 * Inteligencia de Tratamientos: Interpreta texto libre y notas
 * para referenciar el tratamiento desde el catálogo de la BD.
 */
export function interpretTreatment(
  rawTreatment: string = '',
  observation: string = '',
  catalogMap?: Map<string, { price: number; id: string; lab_cost: number }>
): { name: string; id: string | null; catalogPrice: number; catalogLabCost: number } {
  const tText = (rawTreatment || '').trim();
  const obsText = (observation || '').trim();
  const combined = `${tText} ${obsText}`.toUpperCase();

  // 1. Direct match on treatment text if present in catalog
  if (tText && catalogMap) {
    const key = tText.toLowerCase();
    if (catalogMap.has(key)) {
      const match = catalogMap.get(key)!;
      return { name: tText, id: match.id, catalogPrice: match.price, catalogLabCost: match.lab_cost };
    }
  }

  // 2. Direct match on observation text if present in catalog
  if (obsText && catalogMap) {
    const key = obsText.toLowerCase();
    if (catalogMap.has(key)) {
      const match = catalogMap.get(key)!;
      return { name: match.id ? obsText : 'Tratamiento', id: match.id, catalogPrice: match.price, catalogLabCost: match.lab_cost };
    }
  }

  // 3. Heuristics based on keywords in combined (Treatment + Observation)
  let matchedName = '';

  if (combined.includes('PULPO')) {
    matchedName = 'Pulpotomía';
  } else if (combined.includes('OBT') || combined.includes('EMPASTE')) {
    matchedName = 'Obturación Simple';
  } else if (combined.includes('ANGEL ALIGNER') || combined.includes('INVISALIGN') || combined.includes('ALINEADOR')) {
    matchedName = 'Ortodoncia Invisible / Alineadores';
  } else if (combined.includes('BCKTS') || combined.includes('BRACKET')) {
    matchedName = 'Ortodoncia Brackets Metálicos';
  } else if (combined.includes('CONTROL') || combined.includes('MENSU') || combined.includes('CUOTA') || combined.includes('TERMINAD') || combined.includes('FINALIZA') || combined.includes('A SU FAVOR')) {
    matchedName = 'Control de Ortodoncia';
  } else if (combined.includes('EXTRACCION') || combined.includes('QUITAR DIENTE')) {
    matchedName = 'Extracción Simple';
  } else if (combined.includes('HIGIENE') || combined.includes('LIMPIEZA')) {
    matchedName = 'Tartrectomía / Limpieza Dental';
  } else if (combined.includes('BLANQUEAMIENTO')) {
    matchedName = 'Blanqueamiento Dental';
  } else if (combined.includes('IMPLANTE')) {
    matchedName = 'Implante Dental';
  } else if (combined.includes('FERULA') || combined.includes('DESCARGA')) {
    matchedName = 'Placa de Descarga';
  } else if (combined.includes('ENDODONCIA')) {
    matchedName = 'Endodoncia Unirradicular';
  }

  if (matchedName && catalogMap && catalogMap.has(matchedName.toLowerCase())) {
    const match = catalogMap.get(matchedName.toLowerCase())!;
    return {
      name: matchedName,
      id: match.id,
      catalogPrice: match.price,
      catalogLabCost: match.lab_cost
    };
  }

  // Fallback
  return {
    name: tText || 'Control de Ortodoncia',
    id: catalogMap?.get('control de ortodoncia')?.id || null,
    catalogPrice: catalogMap?.get('control de ortodoncia')?.price || 60,
    catalogLabCost: 0
  };
}

/**
 * Procesa una línea contable individual aplicando las reglas del modelo ALBACETE DEFINITIVO
 */
export function processBillingLine(
  input: RawLineInput,
  clinicCommissionPct: number = 60,
  clinicLabDiscountPct: number = 50,
  catalogMap?: Map<string, { price: number; id: string; lab_cost: number }>
): ProcessedBillingLine {
  const patient_name = (input.patient_name || '').trim();
  const observation = (input.observation || '').trim();

  // Interpret treatment from catalog DB
  const interpreted = interpretTreatment(input.treatment_name, observation, catalogMap);
  const rawTName = (input.treatment_name || '').trim();
  const isGeneric = !rawTName || rawTName.toLowerCase() === 'tratamiento' || rawTName.toLowerCase() === 'consulta general';

  // Override treatment_name & treatment_id with catalog matched entries if generic or if interpreted found a match
  const treatment_name = (interpreted.id || isGeneric) ? interpreted.name : rawTName;
  const treatment_id = input.treatment_id || interpreted.id;
  const catalog_price = interpreted.catalogPrice;

  const quantity = Number(input.quantity ?? 1);
  const unit_price = Number(input.unit_price ?? 0);
  const alt_price = Number(input.alt_price ?? 0);
  const discount = Number(input.discount ?? 0);

  // 1. Effective Price = max(Precio, Otro Precio)
  const basePrice = Math.max(unit_price, alt_price);
  const effective_price = basePrice > 0 ? basePrice : catalog_price;

  // 2. Subtotal = (Effective Price * Quantity) - Discount
  const subtotal = Math.max(0, (effective_price * quantity) - discount);

  // 3. Commission = Subtotal * (% Commission / 100)
  const commission_pct = Number(input.commission_pct ?? clinicCommissionPct);
  const commission_amount = Number(((subtotal * commission_pct) / 100).toFixed(2));

  // 4. Lab Costs = Lab Qty * Lab Unit Cost * (1 - % Lab Dto / 100)
  let lab_name = (input.lab_name || '').trim();
  let lab_unit_cost = Number(input.lab_unit_cost ?? 0);
  let lab_quantity = Number(input.lab_quantity ?? 0);
  let is_lab_suggested = false;

  // Intelligent Lab Suggestion: If lab_name is empty BUT catalog treatment has typical_lab_cost > 0
  if (!lab_name && interpreted.catalogLabCost > 0) {
    const tKey = treatment_name.toLowerCase();
    lab_name = TREATMENT_LAB_SUGGESTIONS[tKey] || `${treatment_name} (Laboratorio)`;
    lab_unit_cost = lab_unit_cost > 0 ? lab_unit_cost : interpreted.catalogLabCost;
    lab_quantity = lab_quantity > 0 ? lab_quantity : quantity;
    is_lab_suggested = true;
  } else if (lab_name && lab_unit_cost === 0 && interpreted.catalogLabCost > 0) {
    lab_unit_cost = interpreted.catalogLabCost;
    lab_quantity = lab_quantity > 0 ? lab_quantity : quantity;
    is_lab_suggested = true;
  } else if (lab_name) {
    lab_quantity = lab_quantity > 0 ? lab_quantity : quantity;
  }

  const lab_subtotal = lab_quantity * lab_unit_cost;
  const lab_discount_pct = Number(input.lab_discount_pct ?? clinicLabDiscountPct);
  const lab_total_discounted = Number((lab_subtotal * (1 - (lab_discount_pct / 100))).toFixed(2));

  // 5. Net Amount = Commission Amount - Lab Total Discounted
  const net_amount = Number((commission_amount - lab_total_discounted).toFixed(2));

  // 6. Doctor split (Default 100% main doctor)
  const pct_dr_main = Number(input.pct_dr_main ?? 100);
  const amount_dr_main = Number(((net_amount * pct_dr_main) / 100).toFixed(2));
  const pct_dr_secondary = Number(input.pct_dr_secondary ?? 0);
  const amount_dr_secondary = Number(((net_amount * pct_dr_secondary) / 100).toFixed(2));

  // 7. Flags & Validation Audit
  const validation_flags: ProcessedBillingLine['validation_flags'] = [];
  const no_price = effective_price === 0 && subtotal === 0;
  const zero_quantity = quantity === 0;
  const is_negative = net_amount < 0;

  // Rule: Missing or #N/A Patient
  if (!patient_name || patient_name.toUpperCase() === '#N/A' || patient_name.toUpperCase().includes('#N/A')) {
    validation_flags.push({
      level: 'ERROR',
      code: 'ERR_NO_PATIENT',
      message: 'Línea sin nombre de paciente válido (#N/A)'
    });
  }

  // Rule: Price 0 and subtotal 0
  if (no_price && subtotal === 0) {
    validation_flags.push({
      level: 'ERROR',
      code: 'ERR_NO_PRICE',
      message: 'Precio y subtotal son 0€ (Requiere asignación)'
    });
  }

  // Rule: Price Deviation > 20% vs Catalog
  let price_deviation_pct = 0;
  if (catalog_price > 0 && effective_price > 0) {
    price_deviation_pct = Number((((effective_price - catalog_price) / catalog_price) * 100).toFixed(1));
    if (Math.abs(price_deviation_pct) > 20) {
      validation_flags.push({
        level: 'ALERTA',
        code: 'WARN_PRICE_DEVIATION',
        message: `Precio (${effective_price}€) se desvía un ${price_deviation_pct}% del catálogo (${catalog_price}€)`
      });
    }
  }

  // Rule: Negative Net Amount
  if (is_negative) {
    validation_flags.push({
      level: 'NEGATIVO',
      code: 'NEG_NET_AMOUNT',
      message: `El importe neto es negativo (${net_amount}€). Los gastos de laboratorio superan la comisión.`
    });
  }

  // Rule: Zero Quantity
  if (zero_quantity) {
    validation_flags.push({
      level: 'INFO',
      code: 'INFO_ZERO_QTY',
      message: 'Cantidad 0 (Línea de seguimiento o control sin coste de tratamiento)'
    });
  }

  // Rule: Observation highlights
  if (observation.toUpperCase().includes('A SU FAVOR') || observation.toUpperCase().includes('FINALIZA')) {
    validation_flags.push({
      level: 'INFO',
      code: 'INFO_OBSERVATION',
      message: `Nota especial en observación: "${observation}"`
    });
  }

  const needs_review = validation_flags.some(f => f.level === 'ERROR' || f.level === 'ALERTA');

  return {
    id: input.id,
    sort_order: input.sort_order ?? 0,
    session_date: input.session_date || new Date().toISOString().split('T')[0],
    patient_name,
    patient_id: input.patient_id || null,
    treatment_name,
    treatment_id,
    observation,
    quantity,
    unit_price,
    alt_price,
    effective_price,
    discount,
    subtotal,
    commission_pct,
    commission_amount,
    lab_name,
    lab_quantity,
    lab_unit_cost,
    lab_subtotal,
    lab_discount_pct,
    lab_total_discounted,
    net_amount,
    pct_dr_main,
    amount_dr_main,
    pct_dr_secondary,
    amount_dr_secondary,
    needs_review,
    is_negative,
    no_price,
    zero_quantity,
    is_lab_suggested,
    validation_flags,
    catalog_price,
    price_deviation_pct,
    payment_status: input.payment_status || 'not_tracked',
    payment_amount: input.payment_amount ?? 0,
    appointment_id: input.appointment_id,
    procedure_index: input.procedure_index || 0,
    source_type: input.source_type || 'manual'
  };
}

/**
 * Calcula los totales globales de la sesión contable
 */
export function calculateSessionTotals(lines: ProcessedBillingLine[]): SessionTotals {
  let total_subtotal = 0;
  let total_commission = 0;
  let total_lab = 0;
  let total_neto = 0;
  let total_dr_main = 0;

  let error_count = 0;
  let warning_count = 0;
  let info_count = 0;

  for (const line of lines) {
    total_subtotal += line.subtotal;
    total_commission += line.commission_amount;
    total_lab += line.lab_total_discounted;
    total_neto += line.net_amount;
    total_dr_main += line.amount_dr_main;

    for (const flag of line.validation_flags) {
      if (flag.level === 'ERROR') error_count++;
      else if (flag.level === 'ALERTA' || flag.level === 'NEGATIVO') warning_count++;
      else if (flag.level === 'INFO') info_count++;
    }
  }

  return {
    total_subtotal: Number(total_subtotal.toFixed(2)),
    total_commission: Number(total_commission.toFixed(2)),
    total_lab: Number(total_lab.toFixed(2)),
    total_neto: Number(total_neto.toFixed(2)),
    total_dr_main: Number(total_dr_main.toFixed(2)),
    has_blocking_errors: error_count > 0,
    error_count,
    warning_count,
    info_count
  };
}
