"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Calendar as CalendarIcon, Clock, Building2, Stethoscope, FileText, Upload,
  CreditCard, MessageSquare, CheckCircle2, Save, Loader2, AlertCircle, ArrowLeft, Receipt,
  TrendingDown, TrendingUp, AlertTriangle, FlaskConical, Plus, Sparkles, ExternalLink,
  Pill, Activity, ShieldAlert, ChevronRight, Check, DollarSign, Settings2, Trash2, Camera, Image as ImageIcon, UserCheck
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import { PaymentRegistrationModal } from "@/components/billing/payment-registration-modal";
import { Odontogram, OdontogramData } from "@/components/appointments/odontogram";

type AppointmentData = {
  id: string;
  appointment_date: string;
  reason: string;
  status: string;
  notes: string | null;
  clinicName: string;
  professionalName: string;
  patientId: string;
  patientName: string;
  patientHistoriaId: string;
  patientPhone: string;
  patientEmail: string;
  patientNif: string;
  patientDob: string | null;
  patientAllergies: string | null;
  patientDiseases: string | null;
  patientMedication: string | null;
  billingId: string | null;
  customPrice: number;
  actualLabCost: number;
  customCommission: number;
  customLabDiscount: number;
  paymentStatus: string;
  odooInvoiceId: number | null;
  odooInvoiceNumber: string | null;
  profitabilityStatus: string;
};

type TreatmentOption = {
  id: string;
  service_name: string;
  default_price: number;
};

type ApptDocument = {
  id: string;
  file_name: string;
  document_type: string;
  file_path?: string;
  file_url?: string;
  description: string | null;
  created_at: string;
};

export type ProcedureItem = {
  id: string;
  treatmentId: string;
  serviceName: string;
  toothRef: string;
  dbPrice: number;
  dbCommission: number;
  dbLabCost: number;
  overridePrice: number | null;
  overrideCommission: number | null;
  overrideLabCost: number | null;
  showOverride: boolean;
};

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = React.use(params as any) as { id: string };
  const targetId = resolvedParams?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingOdoo, setSyncingOdoo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [showGuestPanel, setShowGuestPanel] = useState(false);

  const [appt, setAppt] = useState<AppointmentData | null>(null);
  const [treatmentsList, setTreatmentsList] = useState<TreatmentOption[]>([]);
  const [apptDocs, setApptDocs] = useState<ApptDocument[]>([]);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [odontogramData, setOdontogramData] = useState<OdontogramData>({});

  const [status, setStatus] = useState("Confirmada");
  const [notes, setNotes] = useState("");
  const [guestDoctor, setGuestDoctor] = useState("");
  const [prescribedMedication, setPrescribedMedication] = useState("");
  const [nextStepNotes, setNextStepNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pendiente");
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [isAiAnalyzed, setIsAiAnalyzed] = useState(false);

  const [professionalsCatalog, setProfessionalsCatalog] = useState<{ id: string; name: string; specialty?: string }[]>([]);
  const [newDoctorInput, setNewDoctorInput] = useState("");
  const [creatingDoctor, setCreatingDoctor] = useState(false);

  const handleCreateNewProfessional = async () => {
    if (!newDoctorInput.trim()) return;
    setCreatingDoctor(true);
    try {
      const parts = newDoctorInput.trim().split(" ");
      const first_name = parts[0];
      const last_name = parts.slice(1).join(" ") || "Colaborador";

      const { data: newPro, error } = await supabase
        .from("professionals")
        .insert({
          first_name,
          last_name,
          specialty: "Doctor Colaborador",
        } as any)
        .select("id, first_name, last_name, specialty")
        .single();

      if (error) throw error;

      if (newPro) {
        const createdName = `Dr. ${newPro.first_name} ${newPro.last_name}`;
        setGuestDoctor(createdName);
        setNewDoctorInput("");
        
        const { data: updatedPros } = await supabase
          .from("professionals")
          .select("id, first_name, last_name, specialty")
          .order("first_name");
        if (updatedPros) {
          setProfessionalsCatalog(updatedPros.map((p) => ({
            id: p.id,
            name: `Dr. ${p.first_name} ${p.last_name}`,
            specialty: p.specialty ?? undefined,
          })));
        }
        alert(`✅ Profesional "${createdName}" guardado con éxito en la BD de Profesionales.`);
      }
    } catch (err: any) {
      console.error("Error creando profesional:", err);
      alert(`Error guardando profesional: ${err.message}`);
    } finally {
      setCreatingDoctor(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isMinor = appt?.patientDob
    ? (new Date().getFullYear() - new Date(appt.patientDob).getFullYear()) < 18
    : false;

  const fetchAppointment = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const { data: a } = await supabase
        .from("appointments")
        .select(`
          id, appointment_date, reason, status, notes,
          clinics ( name ),
          professionals ( first_name, last_name ),
          patients ( id, first_name, last_name, historia_id, dob, phone, email, nif_cif, allergies, important_diseases, current_medication, billing_name, billing_address, billing_city, billing_postal_code )
        `)
        .eq("id", targetId)
        .limit(1)
        .maybeSingle();

      if (a) {
        const { data: bData } = await (supabase as any)
          .from("billing_records")
          .select("*")
          .eq("appointment_id", a.id)
          .maybeSingle();

        const { data: tData } = await (supabase as any)
          .from("treatments")
          .select("id, service_name, default_price")
          .eq("is_active", true)
          .order("service_name");
        if (tData) setTreatmentsList(tData);

        const { data: dData } = await (supabase as any)
          .from("documents")
          .select("id, file_name, document_type, file_path, file_url, description, created_at")
          .eq("appointment_id", a.id)
          .order("created_at", { ascending: false });
        if (dData) setApptDocs(dData);

        const p = a.patients as any;
        const prof = a.professionals as any;
        const clinic = a.clinics as any;

        const loadedAppt: AppointmentData = {
          id: a.id,
          appointment_date: a.appointment_date,
          reason: a.reason ?? "Consulta",
          status: a.status ?? "Confirmada",
          notes: a.notes ?? "",
          clinicName: clinic?.name ?? "Clínica",
          professionalName: prof ? `${prof.first_name} ${prof.last_name}` : "Dra. Osly Melo",
          patientId: p?.id ?? "",
          patientName: p ? `${p.first_name} ${p.last_name}` : "Paciente",
          patientHistoriaId: p?.historia_id ?? "PAC-",
          patientDob: p?.dob ?? null,
          patientPhone: p?.phone ?? "",
          patientEmail: p?.email ?? "",
          patientNif: p?.nif_cif ?? "",
          patientAllergies: p?.allergies ?? null,
          patientDiseases: p?.important_diseases ?? null,
          patientMedication: p?.current_medication ?? null,
          billingId: bData?.id ?? null,
          customPrice: bData?.custom_price ?? 0,
          actualLabCost: bData?.actual_lab_cost ?? 0,
          customCommission: bData?.applied_commission_rate ?? 60,
          customLabDiscount: bData?.applied_lab_discount_rate ?? 50,
          paymentStatus: bData?.status ?? "Pendiente",
          odooInvoiceId: bData?.odoo_invoice_id ?? null,
          odooInvoiceNumber: bData?.odoo_invoice_number ?? null,
          profitabilityStatus: bData?.profitability_status ?? "ok",
        };

        setAppt(loadedAppt);
        setStatus(loadedAppt.status);

        // Parse structured blocks from notes
        const rawNotes = loadedAppt.notes ?? "";
        let parsedNotes = rawNotes;

        // Parse Procedures
        const procMatch = rawNotes.match(/\[Procedimientos:\s*([\s\S]*?)\]/i);
        if (procMatch) {
          try {
            const parsedProcs = JSON.parse(procMatch[1]);
            setProcedures(parsedProcs);
          } catch (e) {
            console.warn("Could not parse procedures JSON from notes");
          }
          parsedNotes = parsedNotes.replace(procMatch[0], "").trim();
        } else {
          setProcedures([
            {
              id: Date.now().toString(),
              treatmentId: "",
              serviceName: loadedAppt.reason || "Consulta General",
              toothRef: "",
              dbPrice: loadedAppt.customPrice || 0,
              dbCommission: loadedAppt.customCommission || 60,
              dbLabCost: loadedAppt.actualLabCost || 0,
              overridePrice: null,
              overrideCommission: null,
              overrideLabCost: null,
              showOverride: false,
            },
          ]);
        }

        // Parse Odontogram
        const odontoMatch = rawNotes.match(/\[Odontograma:\s*([\s\S]*?)\]/i);
        if (odontoMatch) {
          try {
            setOdontogramData(JSON.parse(odontoMatch[1]));
          } catch (e) {}
          parsedNotes = parsedNotes.replace(odontoMatch[0], "").trim();
        }

        // Parse Guest Doctor
        const guestMatch = rawNotes.match(/\[DoctorInvitado:\s*(.*?)\]/i);
        if (guestMatch) {
          setGuestDoctor(guestMatch[1]);
          parsedNotes = parsedNotes.replace(guestMatch[0], "").trim();
        }

        // Parse Medication
        const medMatch = rawNotes.match(/\[Receta\/Medicación:\s*(.*?)\]/i);
        if (medMatch) {
          setPrescribedMedication(medMatch[1]);
          parsedNotes = parsedNotes.replace(medMatch[0], "").trim();
        }

        // Parse Next Step Notes
        const nextMatch = rawNotes.match(/\[Seguimiento\/Próxima cita:\s*(.*?)\]/i);
        if (nextMatch) {
          setNextStepNotes(nextMatch[1]);
          parsedNotes = parsedNotes.replace(nextMatch[0], "").trim();
        }

        // Fetch professionals catalog
        const { data: prosData } = await supabase
          .from("professionals")
          .select("id, first_name, last_name, specialty")
          .order("first_name");
        if (prosData) {
          setProfessionalsCatalog(prosData.map((p) => ({
            id: p.id,
            name: `Dr. ${p.first_name} ${p.last_name}`,
            specialty: p.specialty ?? undefined,
          })));
        }

        // Parse AI Suggestion
        const aiMatch = rawNotes.match(/\[CitaSugeridaIA:\s*([\s\S]*?)\]/i);
        if (aiMatch) {
          try {
            setAiSuggestion(JSON.parse(aiMatch[1]));
            setIsAiAnalyzed(true);
          } catch (e) {}
          parsedNotes = parsedNotes.replace(aiMatch[0], "").trim();
        }

        setNotes(parsedNotes.trim());
        setPaymentStatus(loadedAppt.paymentStatus ?? "Pendiente");
      }
    } catch (err) {
      console.error("Error cargando cita:", err);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => { fetchAppointment(); }, [fetchAppointment]);

  // Financial Summary Calculation across procedures
  const getProcedureTotals = () => {
    let totalPrice = 0;
    let totalLabCost = 0;
    let totalNeto = 0;

    procedures.forEach((p) => {
      const price = p.overridePrice !== null ? p.overridePrice : p.dbPrice;
      const commRate = p.overrideCommission !== null ? p.overrideCommission : p.dbCommission;
      const labCost = p.overrideLabCost !== null ? p.overrideLabCost : p.dbLabCost;

      totalPrice += price;
      totalLabCost += labCost;
      totalNeto += (price * (commRate / 100)) - (labCost * (50 / 100)); // Default 50% lab discount
    });

    const margin = totalPrice > 0 ? (totalNeto / totalPrice) * 100 : 100;
    let profStatus = "ok";
    if (totalNeto < 0) profStatus = "loss";
    else if (totalPrice > 0 && margin < 15) profStatus = "warning";

    return { totalPrice, totalLabCost, totalNeto, margin, profStatus };
  };

  const totals = getProcedureTotals();

  // Add Procedure Row
  const addProcedureRow = () => {
    setProcedures((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        treatmentId: "",
        serviceName: "",
        toothRef: "",
        dbPrice: 0,
        dbCommission: 60,
        dbLabCost: 0,
        overridePrice: null,
        overrideCommission: null,
        overrideLabCost: null,
        showOverride: false,
      },
    ]);
  };

  // Update Procedure Row
  const updateProcedure = (id: string, updates: Partial<ProcedureItem>) => {
    setProcedures((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  // Remove Procedure Row
  const removeProcedure = (id: string) => {
    if (procedures.length <= 1) return;
    setProcedures((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = async () => {
    if (!appt) return;
    setSaving(true);
    try {
      // Build main reason string from procedures
      const primaryReason = procedures.map((p) => p.serviceName).filter(Boolean).join(" + ") || "Consulta";

      // Build structured notes
      let combinedNotes = notes;
      if (procedures.length > 0) {
        combinedNotes += `\n[Procedimientos: ${JSON.stringify(procedures)}]`;
      }
      if (Object.keys(odontogramData).length > 0) {
        combinedNotes += `\n[Odontograma: ${JSON.stringify(odontogramData)}]`;
      }
      if (guestDoctor.trim()) {
        combinedNotes += `\n[DoctorInvitado: ${guestDoctor.trim()}]`;
      }
      if (prescribedMedication) {
        combinedNotes += `\n[Receta/Medicación: ${prescribedMedication}]`;
      }
      if (nextStepNotes) {
        combinedNotes += `\n[Seguimiento/Próxima cita: ${nextStepNotes}]`;
      }

      // Automatic Background AI Analysis on Save
      let currentAi = aiSuggestion;
      if (nextStepNotes.trim() || notes.trim()) {
        try {
          const aiRes = await fetch("/api/ai/analyze-appointment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: appt.patientId,
              patientName: appt.patientName,
              appointmentNotes: `${notes}\n${nextStepNotes}`.trim(),
            }),
          });
          const aiData = await aiRes.json();
          if (aiData.success && aiData.suggestion) {
            currentAi = aiData.suggestion;
            setAiSuggestion(aiData.suggestion);
            setIsAiAnalyzed(true);
          }
        } catch (err) {
          console.error("Error realizando análisis IA automático:", err);
        }
      }

      if (currentAi) {
        combinedNotes += `\n[CitaSugeridaIA: ${JSON.stringify(currentAi)}]`;
        setIsAiAnalyzed(true);
      }

      await supabase.from("appointments").update({
        status: status as any,
        reason: primaryReason,
        notes: combinedNotes.trim(),
      }).eq("id", appt.id);

      // Save/Update billing record
      if (appt.billingId) {
        await (supabase as any).from("billing_records").update({
          custom_price: totals.totalPrice,
          total_amount: totals.totalPrice,
          status: paymentStatus,
          actual_lab_cost: totals.totalLabCost,
          profitability_status: totals.profStatus,
          appointment_reason: primaryReason,
        }).eq("id", appt.billingId);
      } else {
        await (supabase as any).from("billing_records").insert({
          appointment_id: appt.id,
          patient_id: appt.patientId,
          appointment_reason: primaryReason,
          custom_price: totals.totalPrice,
          total_amount: totals.totalPrice,
          status: paymentStatus,
          actual_lab_cost: totals.totalLabCost,
          profitability_status: totals.profStatus,
          billing_month: appt.appointment_date.substring(0, 10),
        });
      }

      // Trigger AI Next Step Analysis in Background
      if (nextStepNotes.trim()) {
        fetch("/api/ai/analyze-appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: appt.id,
            patientId: appt.patientId,
            patientName: appt.patientName,
            evolutionNotes: notes,
            nextStepNotes,
            appointmentDate: appt.appointment_date,
          }),
        }).catch((e) => console.warn("AI appointment analyzer notice:", e));
      }

      await fetchAppointment();
      alert("Ficha de cita guardada correctamente");
    } catch (err) {
      console.error("Error guardando cita:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleOdooInvoice = async () => {
    if (!appt) return;
    setSyncingOdoo(true);
    try {
      const res = await fetch("/api/odoo/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: appt.patientId,
          billingRecordId: appt.billingId,
          patientDetails: {
            firstName: appt.patientName.split(" ")[0],
            lastName: appt.patientName.split(" ").slice(1).join(" "),
            historiaId: appt.patientHistoriaId,
            nifCif: appt.patientNif,
            email: appt.patientEmail,
            phone: appt.patientPhone,
          },
          treatmentName: appt.reason,
          price: totals.totalPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Factura Odoo creada: ${data.invoiceNumber || `#${data.invoiceId}`}`);
        await fetchAppointment();
      } else {
        throw new Error(data.error || "Error creando factura Odoo");
      }
    } catch (err: any) {
      console.error("Error creando factura Odoo:", err);
      alert(`Error Odoo: ${err.message}`);
    } finally {
      setSyncingOdoo(false);
    }
  };

  // Upload document / image using VPS route
  const handleFileUpload = async (files: FileList | null, forceImage = false) => {
    if (!files || files.length === 0 || !appt) return;
    setUploadingDoc(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("patientId", appt.patientId);
        formData.append("appointmentId", appt.id);
        formData.append("appointmentDate", appt.appointment_date);
        if (forceImage) formData.append("documentType", "foto_clinica");

        await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
      }
      await fetchAppointment();
    } catch (err) {
      console.error("Error subiendo archivo al VPS:", err);
    } finally {
      setUploadingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span className="ml-3 text-slate-600 font-medium">Cargando Ficha de Cita...</span>
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-slate-300" />
        <p className="text-slate-600 font-semibold">Cita no encontrada en la base de datos</p>
        <Link href="/"><Button variant="outline">Volver a la agenda</Button></Link>
      </div>
    );
  }

  const apptDate = new Date(appt.appointment_date);

  // Group photos by date
  const images = apptDocs.filter(d => {
    const ext = d.file_name.split('.').pop()?.toLowerCase() || '';
    return ['jpg','jpeg','png','webp','gif'].includes(ext) || d.document_type === 'foto_clinica';
  });

  const nonImageDocs = apptDocs.filter(d => !images.includes(d));

  return (
    <div className="flex flex-col gap-6 max-w-[1280px] mx-auto p-4 md:p-6">
      <div>
        <Link href={`/patients/${appt.patientId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver a la ficha del paciente
        </Link>
      </div>

      {/* Notion-Style Top Header Banner with 3-Button Action Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Patient Avatar Icon Box with AI Gradient Ring */}
            <div className={`relative transition-all duration-300 shrink-0 ${
              isAiAnalyzed
                ? "p-[3px] rounded-[18px] bg-gradient-to-tr from-violet-600 via-purple-500 to-indigo-500 shadow-md shadow-purple-500/25"
                : ""
            }`}>
              <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-black text-xl">
                {appt.patientName[0]}
              </div>
              {isAiAnalyzed && (
                <span
                  title="Esta cita ha sido analizada automáticamente por la IA de Melosmile"
                  className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 border-2 border-white"
                >
                  <Sparkles className="h-2.5 w-2.5" /> IA
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900">{appt.patientName}</h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                  {appt.patientHistoriaId}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <CalendarIcon className="h-3.5 w-3.5 text-rose-500" />
                  {apptDate.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-rose-500" />
                  {apptDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> {appt.clinicName}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Stethoscope className="h-3.5 w-3.5 text-slate-400" /> {appt.professionalName || "Dra. Osly Melo"}
                  {guestDoctor && <span className="text-rose-600 font-bold ml-1 flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> + {guestDoctor} (Invitado)</span>}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Action Toolbar for Expanded Appointment Options */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
              {/* Button 1: Dr. Colaborador */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowGuestPanel(!showGuestPanel)}
                title="Añadir o editar Dr. Invitado / Colaborador"
                className={`h-8 px-3 rounded-lg text-xs font-bold gap-1.5 transition-all cursor-pointer ${
                  showGuestPanel || guestDoctor
                    ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
                    : "text-slate-700 hover:bg-white hover:text-slate-900"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                {guestDoctor ? "Dr. Invitado ✓" : "Dr. Colaborador"}
              </Button>

              {/* Button 2: Contabilidad ($) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowFinancials(!showFinancials)}
                title="Mostrar u ocultar panel de contabilidad ($)"
                className={`h-8 px-3 rounded-lg text-xs font-bold gap-1.5 transition-all cursor-pointer ${
                  showFinancials
                    ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                    : "text-slate-700 hover:bg-white hover:text-slate-900"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                Contabilidad ($)
              </Button>
            </div>

            <Select value={status} onValueChange={(val) => setStatus(val || "")}>
              <SelectTrigger className="w-[140px] bg-white border-slate-200 text-xs font-bold shadow-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Confirmada">Confirmada</SelectItem>
                <SelectItem value="En Proceso">En Proceso</SelectItem>
                <SelectItem value="Realizada">Realizada (Completada)</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
                <SelectItem value="No Presentado">No Presentado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl h-9 shadow-md shadow-rose-500/20 cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
            </Button>
          </div>
        </div>

        {/* Expandable Top Panel for Guest / Collaborator Doctor Selection & Creation */}
        {showGuestPanel && (
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-3 bg-rose-50/50 p-4 rounded-xl border border-rose-100 animate-in fade-in">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <UserCheck className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Dr. Invitado / Colaborador especialista de esta cita:</span>
              </div>
              {guestDoctor && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setGuestDoctor("")}
                  className="h-7 px-2 text-[11px] text-slate-500 hover:text-rose-600 font-bold"
                >
                  Quitar Dr. Invitado
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Select from Database Professionals */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Seleccionar de Profesionales en BD</Label>
                <Select
                  value={guestDoctor || ""}
                  onValueChange={(val) => setGuestDoctor(val || "")}
                >
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl font-medium">
                    <SelectValue placeholder="Seleccionar doctor registrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {professionalsCatalog.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name} {p.specialty ? `(${p.specialty})` : ""}
                      </SelectItem>
                    ))}
                    {professionalsCatalog.length === 0 && (
                      <SelectItem value="__none" disabled>No hay profesionales registrados</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Option B: Create new Professional in Database */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">¿Es un doctor nuevo? Escribe y guarda en la BD</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newDoctorInput}
                    onChange={(e) => setNewDoctorInput(e.target.value)}
                    placeholder="Ej: Dr. Manuel Rivas"
                    className="h-9 text-xs bg-white border-slate-200 rounded-xl font-medium"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateNewProfessional}
                    disabled={creatingDoctor || !newDoctorInput.trim()}
                    className="h-9 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shrink-0 gap-1.5 cursor-pointer shadow-xs"
                  >
                    {creatingDoctor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Guardar en BD
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Next Appointment Suggestion Banner */}
      {aiSuggestion && (
        <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-blue-900 shadow-xs">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-violet-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-blue-950">
                🤖 El Agente IA detectó una sugerencia de cita futura:
              </p>
              <p className="text-blue-800 font-medium mt-0.5">
                <strong>Motivo:</strong> {aiSuggestion.motivo || aiSuggestion.detalles} · <strong>Sugerido:</strong> {aiSuggestion.timeframe}
              </p>
            </div>
          </div>
          <Link href={`/patients/${appt.patientId}`}>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl gap-1.5 cursor-pointer shrink-0">
              Agendar Cita Sugerida <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Anamnesis Alert Banner */}
      {(appt.patientAllergies || appt.patientDiseases || appt.patientMedication) && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
              Alerta Médica de Anamnesis para la Consulta:
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-800 font-medium">
              {appt.patientAllergies && <span><strong>Alergias:</strong> {appt.patientAllergies}</span>}
              {appt.patientDiseases && <span><strong>Antecedentes:</strong> {appt.patientDiseases}</span>}
              {appt.patientMedication && <span><strong>Medicación habitual:</strong> {appt.patientMedication}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Procedures, Clinical Notes & Image Gallery (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Multi-Procedure Section */}
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-rose-500" /> Tratamientos & Procedimientos de la Sesión
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addProcedureRow}
                className="gap-1.5 text-xs font-bold rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir Procedimiento
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {procedures.map((proc, index) => {
                const effectivePrice = proc.overridePrice !== null ? proc.overridePrice : proc.dbPrice;
                const effectiveComm = proc.overrideCommission !== null ? proc.overrideCommission : proc.dbCommission;
                const effectiveLab = proc.overrideLabCost !== null ? proc.overrideLabCost : proc.dbLabCost;

                return (
                  <div key={proc.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Procedimiento #{index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateProcedure(proc.id, { showOverride: !proc.showOverride })}
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${
                            proc.showOverride ? "bg-amber-100 text-amber-800" : "text-slate-500 hover:text-slate-900 bg-white border border-slate-200"
                          }`}
                        >
                          <Settings2 className="h-3 w-3" /> Modificar valores
                        </button>
                        {procedures.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProcedure(proc.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Tratamiento del Catálogo</Label>
                        {treatmentsList.length > 0 ? (
                          <select
                            value={proc.serviceName}
                            onChange={(e) => {
                              const val = e.target.value;
                              const found = treatmentsList.find(t => t.service_name === val);
                              updateProcedure(proc.id, {
                                serviceName: val,
                                treatmentId: found?.id || "",
                                dbPrice: found?.default_price || 0,
                              });
                            }}
                            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            <option value="">{proc.serviceName || "-- Seleccionar del catálogo --"}</option>
                            {treatmentsList.map((t) => (
                              <option key={t.id} value={t.service_name}>
                                {t.service_name} ({t.default_price} €)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={proc.serviceName}
                            onChange={(e) => updateProcedure(proc.id, { serviceName: e.target.value })}
                            placeholder="Ej: Ajuste de Ortodoncia"
                            className="h-9 text-xs bg-white"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Pieza / Zona Dental</Label>
                        <Input
                          value={proc.toothRef}
                          onChange={(e) => updateProcedure(proc.id, { toothRef: e.target.value })}
                          placeholder="Ej: Pieza 36 / Cuadrante 2"
                          className="h-9 text-xs bg-white rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Expandable Override Fields Panel (Local to this appointment) */}
                    {proc.showOverride && (
                      <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Precio Local (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={effectivePrice}
                            onChange={(e) => updateProcedure(proc.id, { overridePrice: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">% Comisión Sede</Label>
                          <Input
                            type="number"
                            value={effectiveComm}
                            onChange={(e) => updateProcedure(proc.id, { overrideCommission: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Gasto Lab (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={effectiveLab}
                            onChange={(e) => updateProcedure(proc.id, { overrideLabCost: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Clinical Evolution & Medication */}
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-rose-500" /> Evolución Clínica & Observaciones del Doctor
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Notas de Evolución (Formato Libre / Notion Block)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[140px] bg-slate-50/60 border-slate-200 text-xs leading-relaxed resize-y rounded-xl p-4 font-normal"
                  placeholder="Escribe aquí los detalles clínicos de la sesión, respuesta del paciente, técnica empleada..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-purple-600" /> Medicación Recetada / Pauta
                  </Label>
                  <Input
                    value={prescribedMedication}
                    onChange={(e) => setPrescribedMedication(e.target.value)}
                    placeholder="Ej: Amoxicilina 875mg c/8h por 7 días"
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-blue-600" /> Pauta Próxima Cita / Seguimiento (Musly)
                  </Label>
                  <Textarea
                    value={nextStepNotes}
                    onChange={(e) => setNextStepNotes(e.target.value)}
                    placeholder="Escribe la pauta para la próxima cita (ej. Citar en 3 semanas para quitar puntos). Musly analizará esto al guardar."
                    className="rounded-xl text-xs min-h-[90px] bg-slate-50/60"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dedicated Photo Registration Section (VPS Storage, Grouped by Date) */}
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="h-5 w-5 text-rose-500" /> Registro Fotográfico (Almacenado en VPS)
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingDoc}
                className="gap-1.5 rounded-xl text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                {uploadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Subir Fotografías
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, true)}
              />

              {images.length === 0 ? (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-rose-300 rounded-2xl p-6 text-center bg-slate-50/50 transition-all cursor-pointer"
                >
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <ImageIcon className="h-7 w-7 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-700">Arrastra o selecciona fotografías clínicas de esta cita</p>
                    <p className="text-[11px] text-slate-400">Guardado directo en VPS bajo paciente/registros/{apptDate.toISOString().substring(0,10)}/</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-1 border-b border-slate-100">
                    <span>Fotos registradas el {apptDate.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{images.length} foto(s)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img) => (
                      <div key={img.id} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-square flex items-center justify-center">
                        {img.file_url ? (
                          <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center p-2 text-center text-slate-500">
                            <ImageIcon className="h-6 w-6 text-slate-400 mb-1" />
                            <span className="text-[10px] font-bold truncate max-w-[100px]">{img.file_name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <span className="text-[10px] text-white font-bold truncate text-center">{img.file_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attached Non-Image Documents (Vectorized via n8n) */}
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-rose-500" /> Documentos & Informes (Vectorizados n8n)
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                className="gap-1.5 rounded-xl text-xs font-semibold"
              >
                {uploadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Subir Documento
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, false)}
              />

              {nonImageDocs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nonImageDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-slate-400">{doc.description || "Vectorizado 🧠"}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700 border border-violet-200">
                        IA 🧠
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financials (Top when active) + Odontogram (1/3) */}
        <div className="space-y-6">
          
          {/* Collapsible Financial & Odoo Panel (Appears ABOVE Odontogram when active) */}
          {showFinancials && (
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-850 text-white animate-in fade-in slide-in-from-top-2">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-base flex items-center justify-between text-white/90">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-rose-400" /> Contabilidad & Odoo
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
                    {paymentStatus}
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-300">Estado del Pago</Label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full h-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs px-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Pendiente">Pendiente de cobro</option>
                    <option value="Aconto">Aconto / Entrega parcial</option>
                    <option value="Pagado">Pagado Total</option>
                    <option value="Facturado Odoo">Facturado Odoo</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Procedimientos</span>
                    <span className="font-bold text-white text-sm">{totals.totalPrice.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Gasto Laboratorio</span>
                    <span className="font-bold text-amber-400">{totals.totalLabCost.toFixed(2)} €</span>
                  </div>

                  {/* Profitability Calculation */}
                  <div className="pt-3 border-t border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Neto Calculado</span>
                      <span className={`text-xl font-bold ${
                        totals.profStatus === "loss" ? "text-red-400" :
                        totals.profStatus === "warning" ? "text-amber-400" :
                        "text-emerald-400"
                      }`}>
                        {totals.totalNeto.toFixed(2)} €
                      </span>
                    </div>

                    {totals.profStatus === "loss" && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300">
                        <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">⚠️ TRATAMIENTO EN PÉRDIDA</p>
                          <p className="text-[10px] text-red-400 mt-0.5">El gasto de laboratorio supera el neto del profesional.</p>
                        </div>
                      </div>
                    )}
                    {totals.profStatus === "warning" && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">⚠️ MARGEN BAJO ({totals.margin.toFixed(0)}%)</p>
                          <p className="text-[10px] text-amber-400 mt-0.5">El margen es inferior al 15%.</p>
                        </div>
                      </div>
                    )}
                    {totals.profStatus === "ok" && totals.totalPrice > 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                        <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                        <p className="text-xs font-semibold">Rentable — Margen {totals.margin.toFixed(0)}%</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => setPaymentModalOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 font-bold text-xs h-10 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Registrar Pago de esta Cita
                  </Button>

                  {appt.odooInvoiceNumber ? (
                    <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-800 text-center">
                      <p className="text-xs font-bold text-purple-300 flex items-center justify-center gap-1.5">
                        <Receipt className="h-4 w-4" /> Factura Odoo: {appt.odooInvoiceNumber}
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleOdooInvoice}
                      disabled={syncingOdoo}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 gap-2 font-bold text-xs h-10 rounded-xl shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      {syncingOdoo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                      Generar Factura en Odoo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interactive Odontogram Component */}
          <Odontogram
            initialData={odontogramData}
            isMinor={isMinor}
            onChange={(newData) => setOdontogramData(newData)}
          />
        </div>
      </div>

      {/* Payment Modal Pre-Populated for this Appointment */}
      {appt && (
        <PaymentRegistrationModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          patientId={appt.patientId}
          patientName={appt.patientName}
          defaultAppointmentId={appt.id}
          defaultAmount={totals.totalPrice}
          onSuccess={fetchAppointment}
        />
      )}
    </div>
  );
}
