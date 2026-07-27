"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Building2, 
  Calendar, 
  Sparkles,
  CreditCard,
  FileText,
  PieChart,
  UserCheck,
  RefreshCw,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  ProcessedBillingLine as ProcessedLine, 
  SessionTotals, 
  RawLineInput, 
  TREATMENT_LAB_SUGGESTIONS,
  processBillingLine
} from "@/lib/billing/calculator";
import { supabase } from "@/lib/supabase/client";

interface BillingSession {
  id: string;
  clinic_id: string;
  clinic_name: string;
  month: number;
  year: number;
  model_type: string;
  commission_pct: number;
  lab_discount_pct: number;
  status: 'draft' | 'pending_review' | 'approved' | 'invoiced';
  total_subtotal: number;
  total_commission: number;
  total_lab: number;
  total_neto: number;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  clinic?: {
    id: string;
    name: string;
    color_hex?: string;
    tracks_payments?: boolean;
  };
}

interface TreatmentCatalogItem {
  id: string;
  service_name: string;
  default_price: number;
  typical_lab_cost: number;
  family_name?: string;
}

interface PatientCatalogItem {
  id: string;
  name: string;
  historia_id: string;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function BillingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<BillingSession | null>(null);
  const [lines, setLines] = useState<ProcessedLine[]>([]);
  const [totals, setTotals] = useState<SessionTotals | null>(null);

  const [treatmentsCatalog, setTreatmentsCatalog] = useState<TreatmentCatalogItem[]>([]);
  const [patientsCatalog, setPatientsCatalog] = useState<PatientCatalogItem[]>([]);

  const [activeTab, setActiveTab] = useState<"detail" | "resumen" | "pivot">("detail");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editable session settings
  const [commissionPct, setCommissionPct] = useState<number>(60);
  const [labDiscountPct, setLabDiscountPct] = useState<number>(50);
  const [notes, setNotes] = useState<string>("");

  // Load Session & Catalogs Data
  const loadSessionData = async () => {
    setLoading(true);
    try {
      // 1. Load Session
      const res = await fetch(`/api/billing/sessions/${id}`);
      if (!res.ok) {
        setFeedbackMessage({ type: 'error', text: 'No se pudo cargar la sesión de cálculo.' });
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setLines(data.lines || []);
      setTotals(data.totals || null);
      setCommissionPct(data.session.commission_pct ?? 60);
      setLabDiscountPct(data.session.lab_discount_pct ?? 50);
      setNotes(data.session.notes || "");

      // 2. Load Treatments Catalog
      const { data: tData } = await supabase
        .from('treatments')
        .select('id, service_name, default_price, typical_lab_cost, family_id, treatment_families(name)')
        .eq('is_active', true)
        .order('service_name');

      if (tData) {
        setTreatmentsCatalog(tData.map((t: any) => ({
          id: t.id,
          service_name: t.service_name,
          default_price: Number(t.default_price || 0),
          typical_lab_cost: Number(t.typical_lab_cost || 0),
          family_name: t.treatment_families?.name || 'General'
        })));
      }

      // 3. Load Patients Catalog
      const { data: pData } = await supabase
        .from('patients')
        .select('id, first_name, last_name, historia_id')
        .order('first_name');

      if (pData) {
        setPatientsCatalog(pData.map((p: any) => ({
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          historia_id: p.historia_id || 'PAC-'
        })));
      }

    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionData();
  }, [id]);

  // Recalculate Line with Motor
  const recalculateLine = (line: ProcessedLine): ProcessedLine => {
    const catalogMap = new Map<string, { price: number; id: string; lab_cost: number }>();
    treatmentsCatalog.forEach(t => {
      catalogMap.set(t.service_name.toLowerCase(), { id: t.id, price: t.default_price, lab_cost: t.typical_lab_cost });
    });

    return processBillingLine(
      {
        ...line,
        patient_name: line.patient_name,
        treatment_name: line.treatment_name,
        treatment_id: line.treatment_id,
        observation: line.observation,
        quantity: line.quantity,
        unit_price: line.unit_price,
        alt_price: line.alt_price,
        discount: line.discount,
        commission_pct: line.commission_pct ?? commissionPct,
        lab_name: line.lab_name,
        lab_quantity: line.lab_quantity,
        lab_unit_cost: line.lab_unit_cost,
        lab_discount_pct: line.lab_discount_pct ?? labDiscountPct,
        pct_dr_main: line.pct_dr_main ?? 100
      },
      commissionPct,
      labDiscountPct,
      catalogMap
    );
  };

  // Line Change Handler
  const handleLineChange = (index: number, field: keyof RawLineInput, value: any) => {
    const updated = [...lines];
    const targetLine = { ...updated[index], [field]: value };
    updated[index] = recalculateLine(targetLine);
    setLines(updated);
  };

  // Treatment Dropdown Select Handler
  const handleTreatmentSelect = (index: number, selectedId: string) => {
    const selected = treatmentsCatalog.find(t => t.id === selectedId);
    if (!selected) return;

    const updated = [...lines];
    const curr = updated[index];
    const tKey = selected.service_name.toLowerCase();
    const suggestedLabName = TREATMENT_LAB_SUGGESTIONS[tKey] || (selected.typical_lab_cost > 0 ? `${selected.service_name} (Laboratorio)` : '');

    const modified = {
      ...curr,
      treatment_id: selected.id,
      treatment_name: selected.service_name,
      unit_price: selected.default_price > 0 ? selected.default_price : curr.unit_price,
      catalog_price: selected.default_price,
      lab_name: suggestedLabName || curr.lab_name,
      lab_unit_cost: selected.typical_lab_cost > 0 ? selected.typical_lab_cost : curr.lab_unit_cost,
      lab_quantity: selected.typical_lab_cost > 0 ? (curr.quantity || 1) : curr.lab_quantity,
      is_lab_suggested: selected.typical_lab_cost > 0 && !curr.lab_name
    };

    updated[index] = recalculateLine(modified);
    setLines(updated);
  };

  // Lab Equipment Dropdown Select Handler
  const handleLabSelect = (index: number, labServiceName: string) => {
    const matchedLab = treatmentsCatalog.find(t => t.service_name === labServiceName);
    const updated = [...lines];
    const curr = updated[index];

    const modified = {
      ...curr,
      lab_name: labServiceName,
      lab_unit_cost: matchedLab ? matchedLab.typical_lab_cost : curr.lab_unit_cost,
      lab_quantity: curr.lab_quantity > 0 ? curr.lab_quantity : (curr.quantity || 1),
      is_lab_suggested: false // manually selected
    };

    updated[index] = recalculateLine(modified);
    setLines(updated);
  };

  // Patient Dropdown Select Handler
  const handlePatientSelect = (index: number, selectedPatientId: string) => {
    const selectedP = patientsCatalog.find(p => p.id === selectedPatientId);
    if (!selectedP) return;

    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      patient_id: selectedP.id,
      patient_name: selectedP.name
    };
    setLines(updated);
  };

  // Add New Line
  const handleAddLine = () => {
    const newLine: ProcessedLine = {
      sort_order: lines.length,
      session_date: new Date().toISOString().split("T")[0],
      patient_name: "Nuevo Paciente",
      patient_id: null,
      treatment_name: "Control de Ortodoncia",
      treatment_id: null,
      observation: "",
      quantity: 1,
      unit_price: 60,
      alt_price: 0,
      effective_price: 60,
      discount: 0,
      subtotal: 60,
      commission_pct: commissionPct,
      commission_amount: Number((60 * (commissionPct / 100)).toFixed(2)),
      lab_name: "",
      lab_quantity: 0,
      lab_unit_cost: 0,
      lab_subtotal: 0,
      lab_discount_pct: labDiscountPct,
      lab_total_discounted: 0,
      net_amount: Number((60 * (commissionPct / 100)).toFixed(2)),
      pct_dr_main: 100,
      amount_dr_main: Number((60 * (commissionPct / 100)).toFixed(2)),
      pct_dr_secondary: 0,
      amount_dr_secondary: 0,
      needs_review: false,
      is_negative: false,
      no_price: false,
      zero_quantity: false,
      is_lab_suggested: false,
      validation_flags: [],
      catalog_price: 60,
      price_deviation_pct: 0,
      payment_status: "not_tracked",
      payment_amount: 0
    };
    setLines([...lines, newLine]);
  };

  // Remove Line
  const handleRemoveLine = (index: number) => {
    const updated = lines.filter((_, idx) => idx !== index);
    setLines(updated);
  };

  // Save Session Changes
  const handleSave = async () => {
    setSaving(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/billing/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commission_pct: commissionPct,
          lab_discount_pct: labDiscountPct,
          notes,
          lines
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al guardar los cambios.");
      }

      setSession(data.session);
      setLines(data.lines);
      setTotals(data.totals);
      setFeedbackMessage({ type: 'success', text: 'Cambios guardados correctamente.' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  };

  // Approve Session
  const handleApprove = async () => {
    setApproving(true);
    setFeedbackMessage(null);
    try {
      await handleSave();

      const res = await fetch(`/api/billing/sessions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: "Dra. Osly Melo" })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al aprobar la contabilidad.");
      }

      setSession(data.session);
      setFeedbackMessage({ type: 'success', text: '🎉 ¡Contabilidad APROBADA exitosamente!' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Error al aprobar.' });
    } finally {
      setApproving(false);
    }
  };

  // Refresh from Appointments
  const handleRefreshFromAppointments = async () => {
    if (!session || session.status === "approved") return;
    if (!confirm('¿Desea actualizar las líneas leyendo las citas realizadas del mes? Sus ajustes manuales se preservarán.')) return;

    setRefreshing(true);
    try {
      const res = await fetch(`/api/billing/sessions/generate?clinic_id=${session.clinic_id}&month=${session.month}&year=${session.year}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar');
      }
      
      // Recargar la data completa
      await loadSessionData();
      setFeedbackMessage({ type: 'success', text: 'Líneas actualizadas correctamente desde las citas.' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
        <div>Cargando contabilidad y catálogo de tratamientos...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-12 text-center text-slate-500">
        Sesión contable no encontrada.
      </div>
    );
  }

  const periodTitle = `${MONTH_NAMES[(session.month || 1) - 1].toUpperCase()} ${session.year}`;
  const tracksPayments = session.clinic?.tracks_payments ?? false;

  // Filter lab treatments catalog (treatments with typical_lab_cost > 0 or in lab families)
  const labCatalog = treatmentsCatalog.filter(t => 
    t.typical_lab_cost > 0 || ['Prostodoncia', 'Implantología', 'Ortodoncia', 'Radiología y Diagnóstico', 'Estética Dental'].includes(t.family_name || '')
  );

  // Build Resumen Map
  const servicesMap = new Map<string, { qty: number; subtotal: number; commission: number }>();
  const labMap = new Map<string, { qty: number; subtotal: number; discounted: number }>();

  for (const l of lines) {
    if (l.treatment_name) {
      const sKey = l.treatment_name.trim();
      const curr = servicesMap.get(sKey) || { qty: 0, subtotal: 0, commission: 0 };
      servicesMap.set(sKey, {
        qty: curr.qty + (l.quantity || 1),
        subtotal: curr.subtotal + l.subtotal,
        commission: curr.commission + l.commission_amount
      });
    }

    if (l.lab_name && l.lab_name.trim() !== "") {
      const lKey = l.lab_name.trim();
      const curr = labMap.get(lKey) || { qty: 0, subtotal: 0, discounted: 0 };
      labMap.set(lKey, {
        qty: curr.qty + (l.lab_quantity || 1),
        subtotal: curr.subtotal + l.lab_subtotal,
        discounted: curr.discounted + l.lab_total_discounted
      });
    }
  }

  // Build Pivot Map
  const pivotMap = new Map<string, { totalPrice: number; totalLab: number; neto: number }>();
  for (const l of lines) {
    const pName = l.patient_name || "Sin nombre";
    const curr = pivotMap.get(pName) || { totalPrice: 0, totalLab: 0, neto: 0 };
    pivotMap.set(pName, {
      totalPrice: curr.totalPrice + l.subtotal,
      totalLab: curr.totalLab + l.lab_total_discounted,
      neto: curr.neto + l.net_amount
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link href="/billing">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
            <ArrowLeft className="w-4 h-4" />
            Volver al Hub Contable
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <a href={`/api/billing/report/${id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="w-4 h-4 text-slate-600" />
              Ver PDF / Imprimir
            </Button>
          </a>

          {session.status !== "approved" && (
            <Button
              onClick={handleRefreshFromAppointments}
              disabled={refreshing || saving}
              variant="outline"
              size="sm"
              className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <FileText className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? "Actualizando..." : "Actualizar desde Citas"}
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || session.status === "approved"}
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Borrador"}
          </Button>

          {session.status !== "approved" && (
            <Button
              onClick={handleApprove}
              disabled={approving || totals?.has_blocking_errors}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {approving ? "Aprobando..." : "Aprobar Contabilidad"}
            </Button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between ${
          feedbackMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
        }`}>
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="font-bold text-xs">✕</button>
        </div>
      )}

      {/* Header Info Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: session.clinic?.color_hex || "#10b981" }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{session.clinic_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  session.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {session.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Período: <strong>{periodTitle}</strong> | Modelo: <strong className="uppercase">{session.model_type}</strong>
              </p>
            </div>
          </div>

          {/* Editable Commission % and Lab % */}
          <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-500 block">% Comisión Clínica</label>
              <input
                type="number"
                value={commissionPct}
                onChange={(e) => setCommissionPct(parseFloat(e.target.value) || 0)}
                disabled={session.status === "approved"}
                className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm font-extrabold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block">% Descuento Lab</label>
              <input
                type="number"
                value={labDiscountPct}
                onChange={(e) => setLabDiscountPct(parseFloat(e.target.value) || 0)}
                disabled={session.status === "approved"}
                className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm font-extrabold text-indigo-700 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Validation Status Banner */}
        {totals && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-2 border-t border-slate-100">
            {totals.has_blocking_errors ? (
              <span className="text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                {totals.error_count} errores críticos (bloquean aprobación)
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Sin errores críticos (listo para aprobar)
              </span>
            )}

            {totals.warning_count > 0 && (
              <span className="text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                ⚠️ {totals.warning_count} advertencias (desviación precio / NETO negativo)
              </span>
            )}

            {totals.info_count > 0 && (
              <span className="text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                ℹ️ {totals.info_count} informativos (seguimientos / notas)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("detail")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "detail"
              ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          1. Tabla Detallada ({lines.length} líneas)
        </button>

        <button
          onClick={() => setActiveTab("resumen")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "resumen"
              ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PieChart className="w-4 h-4" />
          2. Resumen Servicios y Lab
        </button>

        <button
          onClick={() => setActiveTab("pivot")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "pivot"
              ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          3. Pivot por Paciente ({pivotMap.size} pacientes)
        </button>
      </div>

      {/* TAB 1: Detailed Table */}
      {activeTab === "detail" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 w-10">#</th>
                <th className="p-3 min-w-[110px]">Fecha</th>
                <th className="p-3 min-w-[170px]">Paciente (BD / Selección)</th>
                <th className="p-3 min-w-[190px]">Tratamiento (Catálogo BD)</th>
                <th className="p-3 min-w-[120px]">Observación</th>
                <th className="p-3 w-14 text-right">Cant</th>
                <th className="p-3 w-20 text-right">Precio €</th>
                <th className="p-3 w-20 text-right">Otro P. €</th>
                <th className="p-3 w-16 text-right">Dto. €</th>
                <th className="p-3 w-20 text-right">Subtotal</th>
                <th className="p-3 w-22 text-right text-emerald-800">Comisión €</th>
                <th className="p-3 min-w-[180px]">Equipo / Trabajo Lab</th>
                <th className="p-3 w-14 text-right">Cant L</th>
                <th className="p-3 w-20 text-right">Coste L €</th>
                <th className="p-3 w-22 text-right text-indigo-800">Lab Dto. €</th>
                <th className="p-3 w-16 text-right font-bold text-sky-800">% Dr</th>
                <th className="p-3 w-20 text-right font-bold text-sky-800">€ Dr</th>
                <th className="p-3 w-22 text-right font-extrabold">NETO €</th>
                {tracksPayments && <th className="p-3 w-20">Pago</th>}
                {session.status !== "approved" && <th className="p-3 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr 
                  key={idx}
                  className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                    l.needs_review ? "bg-rose-50/70" : l.is_negative ? "bg-amber-50/70" : l.zero_quantity ? "bg-slate-100/50" : ""
                  }`}
                >
                  <td className="p-2 text-slate-400 font-medium">{idx + 1}</td>

                  {/* Fecha */}
                  <td className="p-2">
                    <input
                      type="date"
                      value={l.session_date || ""}
                      onChange={(e) => handleLineChange(idx, "session_date", e.target.value)}
                      disabled={session.status === "approved"}
                      className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1 py-1 text-xs"
                    />
                  </td>

                  {/* Paciente Dropdown + Auto-complete / Custom Input */}
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <select
                        value={l.patient_id || ''}
                        onChange={(e) => handlePatientSelect(idx, e.target.value)}
                        disabled={session.status === "approved"}
                        className={`w-full font-semibold border rounded px-1.5 py-1 text-xs bg-white text-slate-900 focus:ring-1 focus:ring-emerald-500 ${
                          !l.patient_name || l.patient_name === '#N/A' ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-200'
                        }`}
                      >
                        {l.patient_id ? (
                          <option value={l.patient_id}>{l.patient_name}</option>
                        ) : (
                          <option value="">{l.patient_name || '-- Seleccionar Paciente --'}</option>
                        )}
                        {patientsCatalog.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.historia_id})
                          </option>
                        ))}
                      </select>

                      {l.patient_id && (
                        <Link
                          href={`/patients/${l.patient_id}`}
                          target="_blank"
                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded shrink-0"
                          title="Abrir ficha del paciente e historial clínico"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </td>

                  {/* Tratamiento Dropdown del Catálogo Completo de la BD */}
                  <td className="p-2">
                    <select
                      value={l.treatment_id || ''}
                      onChange={(e) => handleTreatmentSelect(idx, e.target.value)}
                      disabled={session.status === "approved"}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded px-1.5 py-1 text-xs font-semibold text-slate-800"
                    >
                      <option value="">{l.treatment_name || '-- Seleccionar Tratamiento --'}</option>
                      {treatmentsCatalog.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.service_name} ({t.default_price}€)
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Observación */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={l.observation || ""}
                      onChange={(e) => handleLineChange(idx, "observation", e.target.value)}
                      disabled={session.status === "approved"}
                      className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1.5 py-1 text-xs text-slate-600"
                    />
                  </td>

                  {/* Cantidad */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={l.quantity}
                      onChange={(e) => handleLineChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                      disabled={session.status === "approved"}
                      className="w-12 text-right bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-1 text-xs"
                    />
                  </td>

                  {/* Precio */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={l.unit_price}
                      onChange={(e) => handleLineChange(idx, "unit_price", parseFloat(e.target.value) || 0)}
                      disabled={session.status === "approved"}
                      className="w-16 text-right bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-1 text-xs font-semibold"
                    />
                  </td>

                  {/* Otro Precio */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={l.alt_price}
                      onChange={(e) => handleLineChange(idx, "alt_price", parseFloat(e.target.value) || 0)}
                      disabled={session.status === "approved"}
                      className="w-16 text-right bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-1 text-xs"
                    />
                  </td>

                  {/* Dto */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={l.discount}
                      onChange={(e) => handleLineChange(idx, "discount", parseFloat(e.target.value) || 0)}
                      disabled={session.status === "approved"}
                      className="w-12 text-right bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-1 text-xs"
                    />
                  </td>

                  {/* Subtotal */}
                  <td className="p-2 text-right font-bold text-slate-800">
                    {l.subtotal.toFixed(2)} €
                  </td>

                  {/* Comisión € */}
                  <td className="p-2 text-right font-bold text-emerald-700">
                    {l.commission_amount.toFixed(2)} €
                  </td>

                  {/* Equipo Lab Dropdown (con sugerencia resaltada en amarillo) */}
                  <td className="p-2">
                    <div className="relative flex items-center">
                      <select
                        value={l.lab_name || ''}
                        onChange={(e) => handleLabSelect(idx, e.target.value)}
                        disabled={session.status === "approved"}
                        className={`w-full border rounded px-1.5 py-1 text-xs font-medium transition-colors ${
                          l.is_lab_suggested 
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="">{l.lab_name || '-- Sin Equipo / Lab --'}</option>
                        {labCatalog.map(lt => (
                          <option key={lt.id} value={lt.service_name}>
                            {lt.service_name} ({lt.typical_lab_cost}€)
                          </option>
                        ))}
                      </select>
                      {l.is_lab_suggested && (
                        <span className="absolute -top-2 right-1 bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase shadow-xs flex items-center gap-0.5 pointer-events-none">
                          <Lightbulb className="w-2.5 h-2.5" /> Sugerido
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cant Lab */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={l.lab_quantity}
                      onChange={(e) => handleLineChange(idx, "lab_quantity", parseFloat(e.target.value) || 0)}
                      disabled={session.status === "approved"}
                      className="w-12 text-right bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-1 text-xs"
                    />
                  </td>

                  {/* Coste Lab */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={l.lab_unit_cost}
                      onChange={(e) => handleLineChange(idx, "lab_unit_cost", parseFloat(e.target.value) || 0)}
                      disabled={session.status === "approved"}
                      className="w-16 text-right bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-1 text-xs font-medium text-slate-700"
                    />
                  </td>

                  {/* Lab Dto € */}
                  <td className="p-2 text-right text-indigo-700 font-semibold">
                    {l.lab_total_discounted.toFixed(2)} €
                  </td>

                  {/* % Dr Main */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={l.pct_dr_main}
                      onChange={(e) => handleLineChange(idx, "pct_dr_main", parseFloat(e.target.value) || 0)}
                      disabled={session.status === "approved"}
                      className="w-12 text-right bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-1 text-xs text-sky-800 font-bold"
                    />
                  </td>

                  {/* € Dr Main */}
                  <td className="p-2 text-right font-bold text-sky-700">
                    {l.amount_dr_main.toFixed(2)} €
                  </td>

                  {/* NETO € */}
                  <td className={`p-2 text-right font-extrabold text-sm ${l.net_amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {l.net_amount.toFixed(2)} €
                  </td>

                  {tracksPayments && (
                    <td className="p-2">
                      <select
                        value={l.payment_status || 'pending'}
                        onChange={(e) => handleLineChange(idx, "payment_status", e.target.value)}
                        disabled={session.status === "approved"}
                        className="bg-transparent border rounded px-1 py-0.5 text-xs font-semibold"
                      >
                        <option value="paid">✅ Pagado</option>
                        <option value="partial">🟡 Parcial</option>
                        <option value="pending">❌ Pendiente</option>
                      </select>
                    </td>
                  )}

                  {session.status !== "approved" && (
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleRemoveLine(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {session.status !== "approved" && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <Button
                onClick={handleAddLine}
                variant="outline"
                size="sm"
                className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
              >
                <Plus className="w-4 h-4" />
                Añadir Línea Manual
              </Button>

              <div className="text-xs text-slate-500 font-medium">
                💡 <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">Campos Amarillos</span> indican aparatología/laboratorio auto-sugerido por el sistema según el tratamiento.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Resumen por Servicio */}
      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-l-4 border-emerald-600 pl-3">
              Servicios Clínicos Agregados
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold">
                  <th className="p-2 text-left">Tratamiento</th>
                  <th className="p-2 text-right">Cant</th>
                  <th className="p-2 text-right">Subtotal</th>
                  <th className="p-2 text-right">Comisión €</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(servicesMap.entries()).map(([name, s], idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-2 font-semibold text-slate-800">{name}</td>
                    <td className="p-2 text-right font-medium">{s.qty}</td>
                    <td className="p-2 text-right">{s.subtotal.toFixed(2)} €</td>
                    <td className="p-2 text-right font-bold text-emerald-700">{s.commission.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">
              Equipo de Laboratorio Agregado
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold">
                  <th className="p-2 text-left">Proveedor / Trabajo</th>
                  <th className="p-2 text-right">Cant</th>
                  <th className="p-2 text-right">Coste Lab</th>
                  <th className="p-2 text-right">Lab Dto. €</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(labMap.entries()).map(([name, l], idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-2 font-semibold text-slate-800">{name}</td>
                    <td className="p-2 text-right font-medium">{l.qty}</td>
                    <td className="p-2 text-right">{l.subtotal.toFixed(2)} €</td>
                    <td className="p-2 text-right font-bold text-indigo-700">{l.discounted.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Pivot por Paciente */}
      {activeTab === "pivot" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 border-l-4 border-emerald-600 pl-3">
            Resumen Acumulado por Paciente (Hoja Pivot)
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold">
                <th className="p-2 text-left">Paciente</th>
                <th className="p-2 text-right">Total Precio Tratamientos</th>
                <th className="p-2 text-right">Total Gasto Lab</th>
                <th className="p-2 text-right font-extrabold">MONTO FINAL (NETO)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(pivotMap.entries()).map(([pName, p], idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-2 font-bold text-slate-800">{pName}</td>
                  <td className="p-2 text-right font-medium">{p.totalPrice.toFixed(2)} €</td>
                  <td className="p-2 text-right text-slate-600">{p.totalLab.toFixed(2)} €</td>
                  <td className="p-2 text-right font-extrabold text-emerald-700 text-sm">{p.neto.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky Totals Footer Bar with Comprehensive Percentage & Amount Breakdowns */}
      {totals && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Total Subtotal</div>
              <div className="text-lg font-bold">{totals.total_subtotal.toFixed(2)} € <span className="text-xs text-slate-400 font-normal">(100%)</span></div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Comisión Clínica ({commissionPct}%)</div>
              <div className="text-lg font-bold text-emerald-400">{totals.total_commission.toFixed(2)} €</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Gastos Lab ({labDiscountPct}% Dto)</div>
              <div className="text-lg font-bold text-indigo-300">{totals.total_lab.toFixed(2)} €</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Honorarios Médico</div>
              <div className="text-lg font-bold text-sky-300">{(totals.total_dr_main ?? totals.total_neto).toFixed(2)} €</div>
            </div>
          </div>

          <div className="bg-emerald-500/20 border border-emerald-500/40 px-6 py-3 rounded-xl text-right">
            <div className="text-xs text-emerald-300 uppercase font-bold">NETO TOTAL MES</div>
            <div className="text-2xl font-extrabold text-emerald-400">{totals.total_neto.toFixed(2)} €</div>
          </div>
        </div>
      )}
    </div>
  );
}
