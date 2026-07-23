"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Phone, Mail, FileText, Calendar as CalendarIcon, CreditCard,
  Activity, Upload, CheckCircle2, AlertCircle, ShieldAlert, Pill,
  Stethoscope, ArrowLeft, Clock, MapPin, Loader2, Building2, Edit3,
  Bell, Plus, Receipt, ChevronRight, X, UserCheck, Baby,
  BadgeCheck, Sparkles, ExternalLink, Tag as TagIcon, Save, Smile, MessageSquare,
  Trash2, CheckSquare, Square
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import { TagItem, getTagStyle } from "@/components/patients/tag-input";
import { cn } from "@/lib/utils";
import { triggerNewAppointmentModal } from "@/components/calendar/new-appointment-modal";
import { PaymentRegistrationModal } from "@/components/billing/payment-registration-modal";
import { Odontogram, OdontogramData } from "@/components/appointments/odontogram";
import { NewReminderModal } from "@/components/reminders/new-reminder-modal";
import { Send as SendIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  historiaId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  dni: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  importantDiseases: string | null;
  previousOperations: string | null;
  allergies: string | null;
  currentMedication: string | null;
  treatmentPlan: string | null;
  inTreatment: boolean;
  nifCif: string | null;
  billingName: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  odooPartnerId: number | null;
  aiSummary: string | null;
};

type Appointment = {
  id: string;
  appointment_date: string;
  reason: string;
  status: string;
  notes: string | null;
  clinicName: string;
  clinicId: string;
  professionalName: string;
  guestDoctor?: string | null;
  treatmentName: string;
};

type BillingRecord = {
  id: string;
  billing_month: string;
  custom_price: number;
  calculated_total: number;
  status: string;
  appointment_reason: string;
  odoo_invoice_id: number | null;
  odoo_invoice_number: string | null;
  payment_method: string | null;
};

type PatientClinic = {
  id: string;
  clinic_id: string;
  clinic_name: string;
  is_primary: boolean;
};

type Reminder = {
  id: string;
  reminder_type: string;
  channel: string;
  scheduled_at: string;
  subject: string | null;
  message: string;
  status: string;
};

type Document = {
  id: string;
  file_name: string;
  document_type: string;
  created_at: string;
  description: string | null;
  file_url: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: MONTHS_ES[d.getMonth()],
    year: d.getFullYear(),
    time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,
    full: d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
  };
}

function calculateAge(dob: string): { years: number; label: string; isMinor: boolean } {
  const birth = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return { years, label: `${years} años`, isMinor: years < 18 };
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Realizada: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Confirmada: "bg-blue-50 text-blue-700 border-blue-200",
    Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    Cancelada: "bg-red-50 text-red-700 border-red-200",
    Aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Facturado Odoo": "bg-purple-50 text-purple-700 border-purple-200",
    pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    enviado: "bg-blue-50 text-blue-700 border-blue-200",
    leido: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-red-50 text-red-700 border-red-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

const REMINDER_TYPE_LABELS: Record<string, string> = {
  cambio_alineador: "Cambio de Alineador",
  confirmar_cita: "Confirmar Cita",
  recordatorio_cita: "Recordatorio de Cita",
  pago_pendiente: "Pago Pendiente",
  seguimiento: "Seguimiento",
  personalizado: "Personalizado",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  consentimiento: "Consentimiento",
  radiografia: "Radiografía",
  foto_clinica: "Foto Clínica",
  presupuesto: "Presupuesto",
  plan_tratamiento: "Plan de Tratamiento",
  informe: "Informe",
  otro: "Otro",
};

// ─── Document Upload Drop Zone ────────────────────────────────────────────────

function DocumentDropZone({ patientId, onUpload }: { patientId: string; onUpload: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let docType: string = "otro";
      if (["pdf"].includes(ext) && file.name.toLowerCase().includes("consentimiento")) docType = "consentimiento";
      else if (["jpg","jpeg","png","webp"].includes(ext)) docType = "foto_clinica";
      else if (["pdf"].includes(ext)) docType = "informe";

      const filePath = `/opt/melosmile/docs/${patientId}/${Date.now()}_${file.name}`;
      const { data: newDoc, error } = await (supabase as any).from("documents").insert({
        patient_id: patientId,
        document_type: docType,
        file_name: file.name,
        file_path: filePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_by: "Dra. Melo",
        description: "Enviado a IA vectorizadora ⏳",
      }).select("id").single();

      if (newDoc && !error) {
        // Trigger n8n vectorization
        fetch("/api/documents/vectorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: newDoc.id,
            patientId,
            fileName: file.name,
            filePath,
            documentType: docType,
          }),
        }).catch((e) => console.warn("Error enviando vectorización:", e));
      }
    }
    setUploading(false);
    onUpload();
  }, [patientId, onUpload]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
        dragging ? "border-rose-400 bg-rose-50" : "border-slate-200 hover:border-rose-300 hover:bg-rose-50/40"
      }`}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {uploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      ) : (
        <Upload className={`h-8 w-8 ${dragging ? "text-rose-500" : "text-slate-300"}`} />
      )}
      <div className="text-center">
        <p className="font-semibold text-sm text-slate-700">Arrastra archivos aquí o haz clic para seleccionar</p>
        <p className="text-xs text-slate-400 mt-1">Consentimientos, RX, fotografías, informes · PDF, JPG, PNG</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ActiveTab = "historial" | "recordatorios" | "facturacion";

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = React.use(params as any) as { id: string };
  const targetId = resolvedParams?.id;

  const [activeTab, setActiveTab] = useState<ActiveTab>("historial");
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [patientClinics, setPatientClinics] = useState<PatientClinic[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);

  // Payment & Invoicing states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBillingIds, setSelectedBillingIds] = useState<string[]>([]);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [generatingAiSummary, setGeneratingAiSummary] = useState(false);

  // Bulk appointment selection
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const toggleAppointmentSelection = (id: string) => {
    setSelectedAppointmentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllAppointments = () => {
    if (selectedAppointmentIds.length === appointments.length) {
      setSelectedAppointmentIds([]);
    } else {
      setSelectedAppointmentIds(appointments.map(a => a.id));
    }
  };

  const handleBulkDeleteAppointments = async () => {
    if (selectedAppointmentIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedAppointmentIds.length} cita(s) seleccionada(s)? Esta acción no se puede deshacer.`)) return;
    setBulkActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("appointments")
        .delete()
        .in("id", selectedAppointmentIds);
      if (error) throw error;
      setSelectedAppointmentIds([]);
      await fetchAll();
    } catch (e: any) {
      alert(`Error eliminando citas: ${e.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedAppointmentIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("appointments")
        .update({ status: newStatus })
        .in("id", selectedAppointmentIds);
      if (error) throw error;
      setSelectedAppointmentIds([]);
      await fetchAll();
    } catch (e: any) {
      alert(`Error actualizando estado: ${e.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Reminders Modal State
  const [newReminderModalOpen, setNewReminderModalOpen] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Patient Master Odontogram State
  const [patientOdontogram, setPatientOdontogram] = useState<OdontogramData>({});
  const [isEditingOdontogram, setIsEditingOdontogram] = useState<boolean>(false);
  const [savingOdontogram, setSavingOdontogram] = useState<boolean>(false);

  const fetchAll = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      // 1. Patient
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      let query = supabase.from("patients").select("*");
      if (isUuid) {
        query = query.eq("id", targetId);
      } else {
        query = query.eq("historia_id", targetId);
      }
      let { data: pData } = await query.limit(1);

      let p = pData?.[0];
      if (!p) return;

      setPatient({
        id: p.id as string, historiaId: p.historia_id as string,
        firstName: p.first_name, lastName: p.last_name,
        phone: p.phone ?? null, email: p.email ?? null,
        dni: p.dni_nie ?? null, dob: p.dob ?? null,
        gender: p.gender ?? null, address: p.address ?? null,
        importantDiseases: p.important_diseases ?? null,
        previousOperations: p.previous_operations ?? null,
        allergies: p.allergies ?? null,
        currentMedication: p.current_medication ?? null,
        treatmentPlan: p.treatment_plan ?? null,
        inTreatment: (p.in_treatment as boolean | null) ?? false,
        nifCif: (p as any).nif_cif ?? null,
        billingName: (p as any).billing_name ?? null,
        billingAddress: (p as any).billing_address ?? null,
        billingCity: (p as any).billing_city ?? null,
        billingPostalCode: (p as any).billing_postal_code ?? null,
        billingCountry: (p as any).billing_country ?? "España",
        odooPartnerId: (p as any).odoo_partner_id ?? null,
        aiSummary: (p as any).ai_summary ?? null,
      });

      // 2. Appointments
      const { data: apptData } = await supabase
        .from("appointments")
        .select(`id, appointment_date, reason, status, notes, clinic_id,
          clinics ( name ),
          professionals ( first_name, last_name ),
          treatments ( service_name )`)
        .eq("patient_id", p.id)
        .order("appointment_date", { ascending: false });

      if (apptData) {
        setAppointments(apptData.map((a: any) => {
          const guestMatch = a.notes ? a.notes.match(/\[DoctorInvitado:\s*(.*?)\]/i) : null;
          const guestDoc = guestMatch ? guestMatch[1] : null;
          const baseProf = a.professionals ? `${a.professionals.first_name} ${a.professionals.last_name}` : "Dra. Osly Melo";

          return {
            id: a.id,
            appointment_date: a.appointment_date,
            reason: a.reason ?? "Visita",
            status: a.status ?? "Pendiente",
            notes: a.notes,
            clinicId: a.clinic_id,
            clinicName: a.clinics?.name ?? "—",
            professionalName: baseProf,
            guestDoctor: guestDoc,
            treatmentName: a.treatments?.service_name ?? "—",
          };
        }));

        // Consolidate Odontogram across all appointments (chronological from oldest to newest)
        let mergedOdonto: OdontogramData = {};
        const sortedAppts = [...apptData].sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
        sortedAppts.forEach((a: any) => {
          if (a.notes) {
            const odontoMatch = a.notes.match(/\[Odontograma:\s*([\s\S]*?)\]/i);
            if (odontoMatch) {
              try {
                const parsed = JSON.parse(odontoMatch[1]);
                mergedOdonto = { ...mergedOdonto, ...parsed };
              } catch (e) {}
            }
          }
        });

        // Check if patient's treatment_plan contains explicit [OdontogramaBase: ...] override
        if (p.treatment_plan) {
          const baseMatch = p.treatment_plan.match(/\[OdontogramaBase:\s*([\s\S]*?)\]/i);
          if (baseMatch) {
            try {
              const baseParsed = JSON.parse(baseMatch[1]);
              mergedOdonto = { ...mergedOdonto, ...baseParsed };
            } catch (e) {}
          }
        }

        setPatientOdontogram(mergedOdonto);

        // 3. Billing
        if (apptData.length > 0) {
          const { data: billingData } = await supabase
            .from("billing_records")
            .select(`id, billing_month, custom_price, calculated_total, status, odoo_invoice_id, odoo_invoice_number, payment_method, appointments ( reason )`)
            .in("appointment_id", apptData.map((a: any) => a.id))
            .order("billing_month", { ascending: false });

          if (billingData) {
            setBilling(billingData.map((b: any) => ({
              id: b.id, billing_month: b.billing_month,
              custom_price: b.custom_price ?? 0,
              calculated_total: b.calculated_total ?? 0,
              status: b.status ?? "Pendiente",
              appointment_reason: b.appointments?.reason ?? "Tratamiento",
              odoo_invoice_id: b.odoo_invoice_id ?? null,
              odoo_invoice_number: b.odoo_invoice_number ?? null,
              payment_method: b.payment_method ?? null,
            })));
          }
        }
      }

      // 4. Patient Clinics
      const { data: clinicsData } = await (supabase as any)
        .from("patient_clinics")
        .select(`id, clinic_id, is_primary, clinics ( name )`)
        .eq("patient_id", p.id);

      if (clinicsData) {
        setPatientClinics((clinicsData as any[]).map((c: any) => ({
          id: c.id, clinic_id: c.clinic_id,
          clinic_name: c.clinics?.name ?? "Clínica",
          is_primary: c.is_primary,
        })));
      }

      // 5. Reminders
      const { data: remindersData } = await (supabase as any)
        .from("reminders")
        .select("id, reminder_type, channel, scheduled_at, subject, message, status")
        .eq("patient_id", p.id)
        .order("scheduled_at", { ascending: true });

      if (remindersData) setReminders(remindersData as unknown as Reminder[]);

      // 6. Documents
      const { data: docsData } = await (supabase as any)
        .from("documents")
        .select("id, file_name, document_type, created_at, description, file_url")
        .eq("patient_id", p.id)
        .order("created_at", { ascending: false });

      if (docsData) setDocuments(docsData as unknown as Document[]);

      // 7. Tags
      const { data: pTags } = await (supabase as any)
        .from("patient_tags")
        .select("tags ( id, name, color )")
        .eq("patient_id", p.id);

      if (pTags) {
        const loadedTags: TagItem[] = pTags
          .map((pt: any) => pt.tags)
          .filter(Boolean);
        setTags(loadedTags);
      }

    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span className="ml-3 text-slate-600 font-medium">Cargando ficha del paciente...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-slate-300" />
        <p className="text-slate-600 font-semibold">Paciente no encontrado</p>
        <Link href="/patients"><Button variant="outline">Volver al directorio</Button></Link>
      </div>
    );
  }

  const initials = `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`;
  const ageInfo = patient.dob ? calculateAge(patient.dob) : null;
  const dobFormatted = patient.dob
    ? new Date(patient.dob).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const totalPaid = billing.filter(b => b.status !== "Pendiente").reduce((s, b) => s + b.custom_price, 0);
  const totalPending = billing.filter(b => b.status === "Pendiente").reduce((s, b) => s + b.custom_price, 0);

  // Clinics this patient visited but isn't linked to
  const linkedClinicIds = new Set(patientClinics.map(c => c.clinic_id));
  const visitedOtherClinics = appointments
    .filter(a => !linkedClinicIds.has(a.clinicId))
    .reduce((acc, a) => { acc.set(a.clinicId, a.clinicName); return acc; }, new Map<string, string>());

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Back */}
      <div>
        <Link href="/patients" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver al directorio de pacientes
        </Link>
      </div>

      {/* ── Header Profile Card ─────────────────────────────────── */}
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 h-28" />
        <CardContent className="px-6 sm:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-12 mb-6">
            <div className="h-24 w-24 rounded-2xl bg-white p-2 shadow-xl flex-shrink-0 flex items-center justify-center border border-slate-100">
              <div className="h-full w-full rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-black text-2xl">
                {initials}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex flex-wrap items-center gap-3">
                    {patient.firstName} {patient.lastName}
                    <Badge variant="outline" className={`text-xs px-3 py-0.5 rounded-full font-bold border ${patient.inTreatment ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                      {patient.inTreatment ? "En Tratamiento" : "Alta"}
                    </Badge>
                    {ageInfo?.isMinor && (
                      <Badge variant="outline" className="text-xs px-3 py-0.5 rounded-full font-bold border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                        <Baby className="h-3 w-3" /> Menor de edad
                      </Badge>
                    )}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100">{patient.historiaId}</span>
                    {patient.gender && <span>Sexo: <strong>{patient.gender}</strong></span>}
                    {dobFormatted && <span>Nacido: <strong>{dobFormatted}</strong></span>}
                    {ageInfo && (
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" /> {ageInfo.label}
                      </span>
                    )}
                  </div>
                  {/* Clinics */}
                  {(patientClinics.length > 0 || visitedOtherClinics.size > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {patientClinics.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                          <Building2 className="h-3 w-3" /> {c.clinic_name} {c.is_primary && <BadgeCheck className="h-3 w-3" />}
                        </span>
                      ))}
                      {[...visitedOtherClinics.entries()].map(([id, name]) => (
                        <span key={id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                          <Building2 className="h-3 w-3" /> {name} (visita puntual)
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Patient Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {tags.map((t) => {
                        const style = getTagStyle(t.color);
                        return (
                          <span
                            key={t.id}
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border shadow-xs",
                              style.bg, style.text, style.border
                            )}
                          >
                            <TagIcon className="h-3 w-3 opacity-70" />
                            {t.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/patients/${targetId}/edit`}>
                    <Button variant="outline" className="h-9 gap-2 rounded-xl text-xs font-semibold">
                      <Edit3 className="h-4 w-4 text-slate-500" /> Editar Ficha
                    </Button>
                  </Link>
                  <Button
                    onClick={() =>
                      triggerNewAppointmentModal({
                        patientId: patient.id,
                        patientName: `${patient.firstName} ${patient.lastName}`,
                      })
                    }
                    className="h-9 gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-500/20 cursor-pointer"
                  >
                    <CalendarIcon className="h-4 w-4" /> Agendar Cita
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            {/* Contact */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Phone className="h-4 w-4 text-rose-500" /> Información de Contacto
              </h3>
              <div className="text-xs text-slate-700 space-y-1.5 font-medium">
                {patient.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {patient.phone}</p>}
                {patient.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> {patient.email}</p>}
                {patient.address && <p className="flex items-start gap-2 text-slate-500 pt-1"><MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />{patient.address}</p>}
                {patient.dni && <p className="flex items-center gap-2 text-slate-400"><FileText className="h-3.5 w-3.5" /> DNI/NIE: {patient.dni}</p>}
              </div>
            </div>

            {/* Medical Alerts */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" /> Alertas Médicas & Anamnesis
              </h3>
              <div className="text-xs space-y-2">
                {patient.allergies && (
                  <div className="flex items-start gap-2 text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Alergias:</strong> {patient.allergies}</span>
                  </div>
                )}
                {patient.importantDiseases && (
                  <div className="flex items-start gap-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100 font-medium">
                    <Activity className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span><strong>Antecedentes:</strong> {patient.importantDiseases}</span>
                  </div>
                )}
                {patient.previousOperations && (
                  <div className="flex items-start gap-2 text-blue-800 bg-blue-50 p-2.5 rounded-xl border border-blue-100 font-medium">
                    <Stethoscope className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                    <span><strong>Operaciones:</strong> {patient.previousOperations}</span>
                  </div>
                )}
                {patient.currentMedication && (
                  <div className="flex items-start gap-2 text-purple-800 bg-purple-50 p-2.5 rounded-xl border border-purple-100 font-medium">
                    <Pill className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
                    <span><strong>Medicación:</strong> {patient.currentMedication}</span>
                  </div>
                )}
                {!patient.allergies && !patient.importantDiseases && !patient.previousOperations && !patient.currentMedication && (
                  <p className="text-slate-400 text-xs italic">Sin alertas médicas registradas</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2-Column Clinical Intelligence Grid: AI Summary (Left) + Odontogram (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: AI Clinical Summary & Treatment Plan */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" /> Resumen Técnico IA & Plan de Tratamiento
              </h2>
              <Button
                size="sm"
                variant="outline"
                disabled={generatingAiSummary}
                onClick={async () => {
                  setGeneratingAiSummary(true);
                  try {
                    const res = await fetch("/api/ai/patient-summary", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ patientId: patient.id }),
                    });
                    const json = await res.json();
                    if (json.success) {
                      fetchAll();
                    } else {
                      alert(`Error: ${json.error || "No se pudo generar el informe"}`);
                    }
                  } catch (e: any) {
                    alert(`Error: ${e.message}`);
                  } finally {
                    setGeneratingAiSummary(false);
                  }
                }}
                className="h-8 px-3 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-200 gap-1.5 rounded-xl cursor-pointer"
              >
                {generatingAiSummary ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" /> : <Sparkles className="h-3.5 w-3.5 text-violet-600" />}
                {patient.aiSummary ? "Re-generar Informe IA" : "Generar Informe IA"}
              </Button>
            </div>

            {/* AI Summary Card */}
            {patient.aiSummary ? (
              <div className="p-4 rounded-xl bg-violet-50/80 border border-violet-200 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-violet-800">
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-violet-600" /> Resumen Clínico Consolidado</span>
                  <span className="text-[10px] bg-violet-200/70 text-violet-900 px-2 py-0.5 rounded-full font-extrabold">IA Basada en Notas Reales</span>
                </div>
                <p className="text-xs text-violet-950 leading-relaxed font-medium whitespace-pre-line">{patient.aiSummary}</p>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                <Sparkles className="h-7 w-7 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Sin informe de IA generado aún</p>
                <p className="text-[11px] text-slate-400">Haz clic en &quot;Generar Informe IA&quot; para sintetizar todas las notas clínicas del paciente.</p>
              </div>
            )}

            {/* Treatment Plan Section */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-rose-500" /> Plan de Tratamiento Registrado
              </span>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                  {patient.treatmentPlan ? patient.treatmentPlan.replace(/\[OdontogramaBase:\s*[\s\S]*?\]/gi, '').trim() || "Sin plan registrado" : "Sin plan registrado"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Odontogram General (Visión de Boca) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Smile className="h-5 w-5 text-rose-500" /> Odontograma General (Visión de Boca)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Estado consolidado de las piezas dentales. Por defecto en solo lectura.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isEditingOdontogram ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingOdontogram(true)}
                  className="h-8 text-xs font-bold gap-1.5 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Editar Base
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingOdontogram(false)}
                    className="h-8 text-xs font-bold rounded-xl text-slate-600 border-slate-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingOdontogram}
                    onClick={async () => {
                      setSavingOdontogram(true);
                      try {
                        const tagText = `\n[OdontogramaBase: ${JSON.stringify(patientOdontogram)}]`;
                        const existingPlan = patient.treatmentPlan || "";
                        let newPlan = existingPlan;
                        if (newPlan.includes("[OdontogramaBase:")) {
                          newPlan = newPlan.replace(/\[OdontogramaBase:\s*([\s\S]*?)\]/i, tagText.trim());
                        } else {
                          newPlan = (newPlan + tagText).trim();
                        }
                        await supabase.from("patients").update({ treatment_plan: newPlan }).eq("id", patient.id);
                        setIsEditingOdontogram(false);
                        await fetchAll();
                        alert("Odontograma base guardado correctamente");
                      } catch (e: any) {
                        alert(`Error guardando odontograma: ${e.message}`);
                      } finally {
                        setSavingOdontogram(false);
                      }
                    }}
                    className="h-8 text-xs font-bold gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    {savingOdontogram ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar Base
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Odontogram
            initialData={patientOdontogram}
            isMinor={ageInfo?.isMinor}
            readOnly={!isEditingOdontogram}
            onChange={(updated) => setPatientOdontogram(updated)}
          />
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Visitas totales", value: appointments.length, icon: CalendarIcon, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Recordatorios", value: reminders.length, icon: Bell, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Total cobrado", value: `${totalPaid.toFixed(0)} €`, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Pendiente cobro", value: `${totalPending.toFixed(0)} €`, icon: CreditCard, color: "text-rose-600 bg-rose-50 border-rose-100" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900">{stat.value}</p>
              <p className="text-[11px] text-slate-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {([
            { id: "historial", label: `Historial de Citas${appointments.length > 0 ? ` (${appointments.length})` : ""}`, icon: CalendarIcon },
            { id: "facturacion", label: `Facturación y Pagos${billing.length > 0 ? ` (${billing.length})` : ""}`, icon: Receipt },
            { id: "recordatorios", label: `Recordatorios${reminders.length > 0 ? ` (${reminders.length})` : ""}`, icon: Bell },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-rose-500 text-rose-600 bg-rose-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* HISTORIAL */}
        {activeTab === "historial" && (
          <div className="p-0">
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-50">
              <div className="flex items-center gap-3">
                {/* Select all toggle */}
                {appointments.length > 0 && (
                  <button
                    onClick={toggleSelectAllAppointments}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                  >
                    {selectedAppointmentIds.length === appointments.length ? (
                      <CheckSquare className="h-4 w-4 text-rose-500" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedAppointmentIds.length === appointments.length ? "Deseleccionar todo" : "Seleccionar todo"}
                  </button>
                )}
                <p className="text-xs text-slate-400 font-medium">Historial completo de visitas</p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  triggerNewAppointmentModal({
                    patientId: patient.id,
                    patientName: `${patient.firstName} ${patient.lastName}`,
                  })
                }
                className="h-7 gap-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Nueva Cita
              </Button>
            </div>

            {/* Bulk action bar — shown when items are selected */}
            {selectedAppointmentIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-rose-50 border-b border-rose-100">
                <span className="text-xs font-bold text-rose-700">
                  {selectedAppointmentIds.length} cita(s) seleccionada(s)
                </span>
                <div className="flex flex-wrap items-center gap-2 ml-2">
                  <select
                    disabled={bulkActionLoading}
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) handleBulkStatusChange(e.target.value); }}
                    className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 cursor-pointer focus:ring-2 focus:ring-rose-300 focus:outline-none"
                  >
                    <option value="" disabled>Cambiar estado…</option>
                    <option value="Confirmada">✅ Confirmada</option>
                    <option value="Pendiente">⏳ Pendiente</option>
                    <option value="Realizada">🏁 Realizada</option>
                    <option value="Cancelada">❌ Cancelada</option>
                  </select>
                  <Button
                    size="sm"
                    disabled={bulkActionLoading}
                    onClick={handleBulkDeleteAppointments}
                    className="h-7 gap-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    {bulkActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Eliminar seleccionadas
                  </Button>
                  <button
                    onClick={() => setSelectedAppointmentIds([])}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors ml-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <CalendarIcon className="h-10 w-10 mb-3 text-slate-200" />
                <p className="font-semibold text-sm">Sin citas registradas</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {appointments.map((app) => {
                  const d = formatDate(app.appointment_date);
                  const isSelected = selectedAppointmentIds.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      className={`px-5 py-4 flex items-center gap-3 transition-colors ${
                        isSelected ? "bg-rose-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleAppointmentSelection(app.id)}
                        className="shrink-0 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>

                      {/* Row content — click navigates to detail */}
                      <Link href={`/appointments/${app.id}`} className="flex items-center justify-between flex-1 group cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-rose-50 flex flex-col items-center justify-center shrink-0 border border-rose-100">
                            <span className="text-sm font-black text-slate-800">{d.day}</span>
                            <span className="text-[10px] font-bold text-rose-600 uppercase">{d.month}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-rose-600 transition-colors">
                              {app.reason} — {app.treatmentName}
                            </p>
                            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {app.professionalName}
                                {app.guestDoctor && <span className="font-bold text-rose-600 ml-0.5">(+ {app.guestDoctor})</span>}
                              </span>
                              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{app.clinicName}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{d.time}</span>
                            </p>
                            {app.notes && <p className="text-[11px] text-slate-400 mt-1 italic truncate max-w-md">{app.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs font-semibold ${getStatusBadge(app.status)}`}>{app.status}</Badge>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-rose-400 transition-colors" />
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FACTURACIÓN */}
        {activeTab === "facturacion" && (
          <div className="p-0">
            {/* Billing data & action header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total cobrado</p>
                  <p className="text-base font-black text-emerald-600">{totalPaid.toFixed(2)} €</p>
                </div>
                {totalPending > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Pendiente cobro</p>
                    <p className="text-base font-black text-amber-600">{totalPending.toFixed(2)} €</p>
                  </div>
                )}
                {selectedBillingIds.length > 0 && (
                  <div className="pl-4 border-l border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-violet-500">Seleccionados para Factura</p>
                    <p className="text-sm font-black text-violet-700">
                      {selectedBillingIds.length} cobro(s) · {
                        billing
                          .filter((b) => selectedBillingIds.includes(b.id))
                          .reduce((acc, b) => acc + (b.custom_price || 0), 0)
                          .toFixed(2)
                      } €
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setPaymentModalOpen(true)}
                  className="h-9 px-3.5 gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Crear Pago
                </Button>

                <Button
                  size="sm"
                  disabled={selectedBillingIds.length === 0 || generatingInvoice}
                  onClick={async () => {
                    if (selectedBillingIds.length === 0) return;
                    setGeneratingInvoice(true);
                    try {
                      const selectedItems = billing.filter((b) => selectedBillingIds.includes(b.id));
                      const res = await fetch("/api/odoo/invoice", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          patientId: patient.id,
                          items: selectedItems.map((it) => ({
                            id: it.id,
                            name: it.appointment_reason || "Servicio Dental",
                            price: it.custom_price,
                          })),
                          patientDetails: {
                            firstName: patient.firstName,
                            lastName: patient.lastName,
                            historiaId: patient.historiaId,
                            nifCif: patient.nifCif,
                            billingName: patient.billingName,
                            billingAddress: patient.billingAddress,
                            billingCity: patient.billingCity,
                            billingPostalCode: patient.billingPostalCode,
                            email: patient.email,
                            phone: patient.phone,
                          },
                        }),
                      });
                      const json = await res.json();
                      if (json.success) {
                        alert(`Factura Odoo generada exitosamente: ${json.invoiceNumber || `#${json.invoiceId}`}`);
                        setSelectedBillingIds([]);
                        fetchAll();
                      } else {
                        throw new Error(json.error || "Error al facturar en Odoo");
                      }
                    } catch (e: any) {
                      console.error("Error generando factura Odoo:", e);
                      alert(`Error: ${e.message}`);
                    } finally {
                      setGeneratingInvoice(false);
                    }
                  }}
                  className={`h-9 px-3.5 gap-1.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                    selectedBillingIds.length > 0
                      ? "bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed"
                  }`}
                >
                  {generatingInvoice ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Receipt className="h-4 w-4" />
                  )}
                  Generar Factura Odoo {selectedBillingIds.length > 0 ? `(${selectedBillingIds.length})` : ""}
                </Button>
              </div>
            </div>

            {/* Billing data fields */}
            {(patient.nifCif || patient.billingName) && (
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Datos de facturación</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-700">
                  {patient.billingName && <div><span className="text-slate-400">Nombre/Razón social:</span><br/><strong>{patient.billingName}</strong></div>}
                  {patient.nifCif && <div><span className="text-slate-400">NIF/CIF:</span><br/><strong>{patient.nifCif}</strong></div>}
                  {patient.billingAddress && <div><span className="text-slate-400">Dirección:</span><br/><strong>{patient.billingAddress}</strong></div>}
                  {patient.billingCity && <div><span className="text-slate-400">Ciudad/CP:</span><br/><strong>{patient.billingCity} {patient.billingPostalCode}</strong></div>}
                  {patient.odooPartnerId && (
                    <div>
                      <span className="text-slate-400">Odoo Partner:</span><br/>
                      <a href={`${process.env.NEXT_PUBLIC_ODOO_URL}/web#id=${patient.odooPartnerId}&model=res.partner`} target="_blank" rel="noopener noreferrer" className="text-violet-600 font-bold flex items-center gap-1 hover:underline">
                        #{patient.odooPartnerId} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {billing.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <CreditCard className="h-10 w-10 mb-3 text-slate-200" />
                <p className="font-semibold text-sm">Sin registros financieros</p>
                <p className="text-xs text-slate-400 mt-1">Usa el botón &quot;Crear Pago&quot; para añadir el primer cobro</p>
              </div>
            ) : (
              <div>
                {/* Select All Checkbox Header */}
                <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        billing.filter((b) => !b.odoo_invoice_id && b.status !== "Facturado Odoo" && !b.odoo_invoice_number).length > 0 &&
                        billing
                          .filter((b) => !b.odoo_invoice_id && b.status !== "Facturado Odoo" && !b.odoo_invoice_number)
                          .every((b) => selectedBillingIds.includes(b.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const nonInvoicedIds = billing
                            .filter((b) => !b.odoo_invoice_id && b.status !== "Facturado Odoo" && !b.odoo_invoice_number)
                            .map((b) => b.id);
                          setSelectedBillingIds(nonInvoicedIds);
                        } else {
                          setSelectedBillingIds([]);
                        }
                      }}
                      className="accent-violet-600 h-4 w-4 rounded cursor-pointer"
                    />
                    <span>Seleccionar todos los cobros pendientes de factura</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">Los cobros ya facturados no se pueden volver a seleccionar</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {billing.map((b) => {
                    const monthDate = new Date(b.billing_month);
                    const monthLabel = monthDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
                    const isFacturado = !!b.odoo_invoice_id || b.status === "Facturado Odoo" || !!b.odoo_invoice_number;
                    const invoiceRef = b.odoo_invoice_number || (b.odoo_invoice_id ? `INV/#${b.odoo_invoice_id}` : null);
                    const isSelected = selectedBillingIds.includes(b.id);

                    return (
                      <div
                        key={b.id}
                        className={`px-5 py-3.5 flex items-center justify-between transition-colors ${
                          isSelected ? "bg-violet-50/50" : isFacturado ? "bg-slate-50/40" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={isFacturado}
                            checked={isSelected}
                            onChange={() => {
                              if (isFacturado) return;
                              setSelectedBillingIds((prev) =>
                                prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                              );
                            }}
                            className={`h-4 w-4 rounded accent-violet-600 ${
                              isFacturado ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                            }`}
                          />

                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-sm capitalize">{b.appointment_reason}</p>
                              {isFacturado ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-800 border border-violet-200">
                                  <Receipt className="h-3 w-3 text-violet-600" /> Facturada ({invoiceRef})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  Por Facturar
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mt-0.5">
                              {monthLabel} {b.payment_method && `· ${b.payment_method}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="font-black text-slate-900 text-sm">{b.custom_price.toFixed(2)} €</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(b.status)}`}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RECORDATORIOS */}
        {activeTab === "recordatorios" && (
          <div className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-50">
              <p className="text-xs text-slate-500 font-medium">Recordatorios por Email, WhatsApp y SMS</p>
              <Button
                size="sm"
                onClick={() => setNewReminderModalOpen(true)}
                className="h-8 gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Nuevo Recordatorio
              </Button>
            </div>
            {reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
                <Bell className="h-10 w-10 text-slate-200" />
                <div className="text-center">
                  <p className="font-bold text-slate-700 text-sm">Sin recordatorios programados</p>
                  <p className="text-xs text-slate-400 mt-0.5">Programa notificaciones por WhatsApp o Email para el paciente</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewReminderModalOpen(true)}
                  className="rounded-xl text-xs font-bold gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                >
                  <Plus className="h-3.5 w-3.5" /> Crear Primer Recordatorio
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {reminders.map((r) => {
                  const d = formatDate(r.scheduled_at);
                  const isWhatsapp = r.channel === "whatsapp";
                  const isEmail = r.channel === "email";
                  const isPending = r.status === "pendiente";

                  return (
                    <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isWhatsapp ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                          isEmail ? "bg-blue-50 border-blue-100 text-blue-600" :
                          "bg-purple-50 border-purple-100 text-purple-600"
                        }`}>
                          {isWhatsapp ? <MessageSquare className="h-5 w-5" /> : isEmail ? <Mail className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-sm">{r.subject || REMINDER_TYPE_LABELS[r.reminder_type]}</p>
                            <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                              isWhatsapp ? "bg-emerald-100 text-emerald-800" :
                              isEmail ? "bg-blue-100 text-blue-800" :
                              "bg-purple-100 text-purple-800"
                            }`}>
                              {r.channel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Programado para: {d.full}</p>
                          <p className="text-xs text-slate-600 mt-1 italic bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-lg">
                            &quot;{r.message}&quot;
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(r.status)}`}>
                          {r.status}
                        </span>

                        {isPending && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sendingReminderId === r.id}
                            onClick={async () => {
                              setSendingReminderId(r.id);
                              try {
                                const res = await fetch("/api/reminders/send-now", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ reminderId: r.id }),
                                });
                                const data = await res.json();
                                if (data.success) {
                                  alert(`Recordatorio enviado por ${r.channel}`);
                                  fetchAll();
                                } else {
                                  alert(`Error: ${data.error || "No se pudo enviar"}`);
                                }
                              } catch (e: any) {
                                alert(`Error: ${e.message}`);
                              } finally {
                                setSendingReminderId(null);
                              }
                            }}
                            className="h-8 px-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 rounded-xl gap-1"
                          >
                            {sendingReminderId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SendIcon className="h-3 w-3" />}
                            Enviar Ahora
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Reminder Modal */}
      {patient && (
        <NewReminderModal
          open={newReminderModalOpen}
          onOpenChange={setNewReminderModalOpen}
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
          patientPhone={patient.phone || ""}
          patientEmail={patient.email || ""}
          appointments={appointments}
          onSuccess={fetchAll}
        />
      )}

      {/* ── Documentos y Consentimientos (full width, bottom) ───── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-rose-500" />
            <h2 className="text-base font-bold text-slate-900">Documentos y Consentimientos</h2>
            {documents.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{documents.length}</span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <DocumentDropZone patientId={patient.id} onUpload={fetchAll} />

          {documents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map((doc) => {
                const d = formatDate(doc.created_at);
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all cursor-pointer group">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-600">{doc.file_name}</p>
                      <p className="text-[11px] text-slate-400">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type} · {d.full}</p>
                    </div>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-rose-500" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Payment Registration Modal */}
      {patient && (
        <PaymentRegistrationModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
          appointments={appointments.map((a) => ({
            id: a.id,
            reason: a.reason,
            appointment_date: a.appointment_date,
          }))}
          onSuccess={fetchAll}
        />
      )}
    </div>
  );
}
