"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Phone, Mail, FileText, Calendar as CalendarIcon, CreditCard,
  Activity, Upload, CheckCircle2, AlertCircle, ShieldAlert, Pill,
  Stethoscope, ArrowLeft, Clock, MapPin, Loader2, Building2, Edit3,
  Bell, Plus, Receipt, ChevronRight, X, UserCheck, Baby,
  BadgeCheck, Sparkles, ExternalLink, Tag as TagIcon, Save, Smile, MessageSquare,
  Trash2, CheckSquare, Square, Image as ImageIcon, Camera
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
import { addSystemNotification } from "@/components/layout/notification-center";
import { Send as SendIcon } from "lucide-react";
import { PhotoGallery } from "@/components/patients/photo-gallery";
import { isImageDocument } from "@/lib/utils/document-utils";

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
  file_path?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  appointment_id?: string | null;
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
    Realizada: "bg-success/10 text-success border-success/30",
    Confirmada: "bg-info/10 text-info border-info/30",
    Pendiente: "bg-warning/10 text-warning border-warning/30",
    Cancelada: "bg-destructive/10 text-destructive border-destructive/30",
    Aprobado: "bg-success/10 text-success border-success/30",
    "Facturado Odoo": "bg-purple-50 text-purple-700 border-purple-200",
    pendiente: "bg-warning/10 text-warning border-warning/30",
    enviado: "bg-info/10 text-info border-info/30",
    leido: "bg-success/10 text-success border-success/30",
    error: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground border-border";
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
        dragging ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/40 hover:bg-primary/10"
      }`}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {uploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : (
        <Upload className={`h-8 w-8 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
      )}
      <div className="text-center">
        <p className="font-semibold text-sm text-foreground">Arrastra archivos aquí o haz clic para seleccionar</p>
        <p className="text-xs text-muted-foreground mt-1">Consentimientos, RX, fotografías, informes · PDF, JPG, PNG</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ActiveTab = "historial" | "recordatorios" | "facturacion" | "galeria";

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
  const [editingBillingRecord, setEditingBillingRecord] = useState<BillingRecord | null>(null);
  const [isEditingPaymentModalOpen, setIsEditingPaymentModalOpen] = useState(false);
  const [selectedBillingIds, setSelectedBillingIds] = useState<string[]>([]);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [sendingInvoiceEmailId, setSendingInvoiceEmailId] = useState<string | null>(null);
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
    const selectedAppts = appointments.filter(a => selectedAppointmentIds.includes(a.id));
    const hasRealizada = selectedAppts.some(a => a.status === "Realizada" || a.status === "realizada");
    if (hasRealizada) {
      alert("No se pueden eliminar citas con estado 'Realizada'. Por favor deselecciona las citas realizadas antes de borrar.");
      return;
    }
    if (!confirm(`¿Eliminar ${selectedAppointmentIds.length} cita(s) seleccionada(s)? Esta acción no se puede deshacer.`)) return;
    setBulkActionLoading(true);
    try {
      await (supabase as any).from("billing_records").delete().in("appointment_id", selectedAppointmentIds);
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

  // Treatment Plan & Monthly Fee State (supports multiple active/inactive plans)
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [editingPlanModalOpen, setEditingPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    monthly_fee: "60",
    total_installments: "18",
    total_cost: "1080",
    initial_payment: "0",
    final_payment: "0",
    treatment_type: "Ortodoncia",
    paid_installments_count: "0",
    already_paid_amount: "0",
    status: "activo"
  });

  const activePlans = treatmentPlans.filter(p => p.status === "activo");

  const getPlanProgress = useCallback((plan: any) => {
    const planType = (plan?.treatment_type || "Ortodoncia").toLowerCase();
    const completedControlsCount = appointments.filter((a) => {
      const isNotCancelled = a.status !== "Cancelada" && a.status !== "cancelada";
      const isControl = /control|mensualidad/i.test(a.reason || "");
      if (!isNotCancelled || !isControl) return false;

      const reasonLower = (a.reason || "").toLowerCase();
      if (activePlans.length > 1) {
        if (planType === "ortodoncia") {
          return reasonLower.includes("ortodoncia") || (!reasonLower.includes("miofuncional") && !reasonLower.includes("otro"));
        } else {
          return reasonLower.includes(planType);
        }
      }
      return true;
    }).length;

    const manuallyPaid = plan?.paid_installments_count || 0;
    const totalCompleted = completedControlsCount + manuallyPaid;
    const totalInst = plan?.total_installments || 0;
    const remaining = Math.max(0, totalInst - totalCompleted);
    const isNearOrFinished = Boolean(plan && totalInst > 0 && remaining <= 1);
    const typeName = plan?.treatment_type || "Ortodoncia";

    return { completedControlsCount, totalCompleted, totalInst, remaining, isNearOrFinished, typeName };
  }, [appointments, activePlans.length]);

  // Trigger system notification bell when any plan reaches total installments
  useEffect(() => {
    if (!patient) return;
    activePlans.forEach((plan) => {
      const { totalCompleted, totalInst, remaining, isNearOrFinished, typeName } = getPlanProgress(plan);
      if (isNearOrFinished) {
        addSystemNotification({
          title: `⚠️ Revisión de Plan de ${typeName}`,
          message: `El paciente ${patient.firstName} ${patient.lastName} lleva ${totalCompleted} de ${totalInst} mensualidades (${remaining === 0 ? "Plan finalizado" : "Queda 1 mensualidad pendiente"}). Revisar plan.`,
          type: "warning"
        });
      }
    });
  }, [activePlans, patient, getPlanProgress]);

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

function toTitleCase(text: string): string {
  if (!text) return "";
  const lowercaseWords = new Set(["de", "del", "la", "las", "los", "y", "e", "o"]);
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx) => {
      if (!word) return "";
      if (word.startsWith("(") && word.length > 1) {
        return "(" + word.charAt(1).toUpperCase() + word.slice(2);
      }
      if (idx > 0 && lowercaseWords.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

      setPatient({
        id: p.id as string, historiaId: p.historia_id as string,
        firstName: toTitleCase(p.first_name), lastName: toTitleCase(p.last_name),
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

        // 2.5 Active Treatment Plans (Mensualidad Pautada)
        try {
          const planRes = await fetch(`/api/treatment-plans?patient_id=${p.id}`);
          if (planRes.ok) {
            const planJson = await planRes.json();
            setTreatmentPlans(planJson.data || []);
          }
        } catch (planErr) {
          console.warn("Notice fetching treatment plans:", planErr);
        }

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

      // 6. Documents (incluye campos para galeria: appointment_id, file_path, size, mime)
      const { data: docsData } = await (supabase as any)
        .from("documents")
        .select("id, file_name, document_type, created_at, description, file_url, file_path, file_size_bytes, mime_type, appointment_id")
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground font-medium">Cargando ficha del paciente...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground font-semibold">Paciente no encontrado</p>
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
  const photoCount = documents.filter((d) => isImageDocument({ file_name: d.file_name, document_type: d.document_type, mime_type: d.mime_type ?? null })).length;

  // Clinics this patient visited but isn't linked to
  const linkedClinicIds = new Set(patientClinics.map(c => c.clinic_id));
  const visitedOtherClinics = appointments
    .filter(a => !linkedClinicIds.has(a.clinicId))
    .reduce((acc, a) => { acc.set(a.clinicId, a.clinicName); return acc; }, new Map<string, string>());

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Back */}
      <div>
        <Link href="/patients" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver al directorio de pacientes
        </Link>
      </div>

      {/* ── Header Profile Card ─────────────────────────────────── */}
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-card">
        <div className="bg-gradient-to-r from-primary via-primary to-primary/70 h-28" />
        <CardContent className="px-6 sm:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-12 mb-6">
            <div className="h-24 w-24 rounded-2xl bg-card p-2 shadow-xl flex-shrink-0 flex items-center justify-center border border-border/60">
              <div className="h-full w-full rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl">
                {initials}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex flex-wrap items-center gap-3">
                    {patient.firstName} {patient.lastName}
                    <Badge variant="outline" className={`text-xs px-3 py-0.5 rounded-full font-bold border ${patient.inTreatment ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"}`}>
                      {patient.inTreatment ? "En Tratamiento" : "Alta"}
                    </Badge>
                    {ageInfo?.isMinor && (
                      <Badge variant="outline" className="text-xs px-3 py-0.5 rounded-full font-bold border bg-warning/10 text-warning border-warning/30 flex items-center gap-1">
                        <Baby className="h-3 w-3" /> Menor de edad
                      </Badge>
                    )}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">{patient.historiaId}</span>
                    {patient.gender && <span>Sexo: <strong>{patient.gender}</strong></span>}
                    {dobFormatted && <span>Nacido: <strong>{dobFormatted}</strong></span>}
                    {ageInfo && (
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <UserCheck className="h-3.5 w-3.5 text-muted-foreground" /> {ageInfo.label}
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
                        <span key={id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border">
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
                      <Edit3 className="h-4 w-4 text-muted-foreground" /> Editar Ficha
                    </Button>
                  </Link>
                  <Button
                    onClick={() =>
                      triggerNewAppointmentModal({
                        patientId: patient.id,
                        patientName: `${patient.firstName} ${patient.lastName}`,
                      })
                    }
                    className="h-9 gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-md shadow-primary/20 cursor-pointer"
                  >
                    <CalendarIcon className="h-4 w-4" /> Agendar Cita
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border/60">
            {/* Contact */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> Información de Contacto
              </h3>
              <div className="text-xs text-foreground space-y-1.5 font-medium">
                {patient.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {patient.phone}</p>}
                {patient.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {patient.email}</p>}
                {patient.address && <p className="flex items-start gap-2 text-muted-foreground pt-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />{patient.address}</p>}
                {patient.dni && <p className="flex items-center gap-2 text-muted-foreground"><FileText className="h-3.5 w-3.5" /> DNI/NIE: {patient.dni}</p>}
              </div>
            </div>

            {/* Medical Alerts */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" /> Alertas Médicas & Anamnesis
              </h3>
              <div className="text-xs space-y-2">
                {patient.allergies && (
                  <div className="flex items-start gap-2 text-primary bg-primary/10 p-2.5 rounded-xl border border-primary/20 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Alergias:</strong> {patient.allergies}</span>
                  </div>
                )}
                {patient.importantDiseases && (
                  <div className="flex items-start gap-2 text-warning bg-warning/10 p-2.5 rounded-xl border border-warning/20 font-medium">
                    <Activity className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                    <span><strong>Antecedentes:</strong> {patient.importantDiseases}</span>
                  </div>
                )}
                {patient.previousOperations && (
                  <div className="flex items-start gap-2 text-info bg-info/10 p-2.5 rounded-xl border border-info/20 font-medium">
                    <Stethoscope className="h-4 w-4 shrink-0 text-info mt-0.5" />
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
                  <p className="text-muted-foreground text-xs italic">Sin alertas médicas registradas</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2-Column Clinical Intelligence Grid: AI Summary (Left) + Odontogram (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: AI Clinical Summary & Treatment Plan */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
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
              <div className="p-6 rounded-xl bg-muted/40 border border-dashed border-border text-center space-y-2">
                <Sparkles className="h-7 w-7 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">Sin informe de IA generado aún</p>
                <p className="text-[11px] text-muted-foreground">Haz clic en &quot;Generar Informe IA&quot; para sintetizar todas las notas clínicas del paciente.</p>
              </div>
            )}

            {/* Treatment Plan Section */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-primary" /> Plan de Tratamiento Registrado
              </span>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-xs text-foreground font-semibold leading-relaxed">
                  {patient.treatmentPlan ? patient.treatmentPlan.replace(/\[OdontogramaBase:\s*[\s\S]*?\]/gi, '').trim() || "Sin plan registrado" : "Sin plan registrado"}
                </p>
              </div>
            </div>

            {/* Active Treatment Plans Section (Ortodoncia / Miofuncional / Ambos) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-success" /> Planes de Tratamiento Pautados
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPlanId(null);
                      setPlanForm({
                        monthly_fee: "60",
                        total_installments: "18",
                        total_cost: "1080",
                        initial_payment: "0",
                        final_payment: "0",
                        treatment_type: "Ortodoncia",
                        paid_installments_count: "0",
                        already_paid_amount: "0",
                        status: "activo"
                      });
                      setEditingPlanModalOpen(true);
                    }}
                    className="h-7 px-2 text-[11px] font-bold text-success bg-success/10 hover:bg-success/20 border-success/30 rounded-lg cursor-pointer"
                  >
                    + Plan Ortodoncia
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPlanId(null);
                      setPlanForm({
                        monthly_fee: "60",
                        total_installments: "18",
                        total_cost: "1080",
                        initial_payment: "0",
                        final_payment: "0",
                        treatment_type: "Miofuncional",
                        paid_installments_count: "0",
                        already_paid_amount: "0",
                        status: "activo"
                      });
                      setEditingPlanModalOpen(true);
                    }}
                    className="h-7 px-2 text-[11px] font-bold text-info bg-info/10 hover:bg-info/20 border-info/30 rounded-lg cursor-pointer"
                  >
                    + Plan Miofuncional
                  </Button>
                </div>
              </div>

              {activePlans.length > 0 ? (
                activePlans.map((plan) => {
                  const { totalCompleted, totalInst, remaining, isNearOrFinished, typeName } = getPlanProgress(plan);

                  return (
                    <div key={plan.id} className="p-4 rounded-xl bg-success/10 border border-success/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-success" />
                          <span className="text-xs font-bold text-success uppercase tracking-wider">
                            Plan de {typeName} Pautado
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPlanId(plan.id);
                              setPlanForm({
                                monthly_fee: String(plan.monthly_fee ?? 60),
                                total_installments: String(plan.total_installments ?? 18),
                                total_cost: String(plan.total_cost ?? 1080),
                                initial_payment: String(plan.initial_payment ?? 0),
                                final_payment: String(plan.final_payment ?? 0),
                                treatment_type: plan.treatment_type || "Ortodoncia",
                                paid_installments_count: String(plan.paid_installments_count ?? 0),
                                already_paid_amount: String(plan.already_paid_amount ?? 0),
                                status: plan.status || "activo"
                              });
                              setEditingPlanModalOpen(true);
                            }}
                            className="h-7 px-2.5 text-[11px] font-bold text-success bg-success/15 hover:bg-success/20 border-success/40 rounded-lg gap-1 cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" /> Editar Plan
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (!confirm(`¿Estás seguro de eliminar el plan de ${typeName}?`)) return;
                              try {
                                const res = await fetch(`/api/treatment-plans?id=${plan.id}`, { method: "DELETE" });
                                if (!res.ok) throw new Error("No se pudo eliminar el plan");
                                await fetchAll();
                              } catch (err: any) {
                                alert(`Error al eliminar plan: ${err.message}`);
                              }
                            }}
                            className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/15 hover:text-primary rounded-lg gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" /> Eliminar
                          </Button>
                        </div>
                      </div>

                      {/* Warning Alert Banner when remaining installments <= 1 */}
                      {isNearOrFinished && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/15 border border-warning/40 text-warning text-xs font-bold shadow-xs">
                          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <div>
                            <p>⚠️ Atención ({typeName}): El paciente ha completado {totalCompleted} de las {totalInst} mensualidades estipuladas.</p>
                            <p className="text-[11px] text-warning font-medium mt-0.5">
                              {remaining === 0 ? "¡Plan alcanzado al 100%! Revisa el plan por si requiere prórroga o modificación." : "Queda solo 1 mensualidad pendiente antes de finalizar las cuotas pautadas."}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                          <div className="bg-card/80 p-2.5 rounded-lg border border-success/20 text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Mensualidad Control</span>
                            <span className="text-sm font-black text-success">{plan.monthly_fee} €</span>
                          </div>
                          <div className="bg-card/80 p-2.5 rounded-lg border border-success/20 text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Controles Realizados</span>
                            <span className="text-xs font-black text-foreground">
                              {totalCompleted} de {totalInst}
                              <span className="block text-[10px] text-success font-bold">({remaining} pendientes)</span>
                            </span>
                          </div>
                          <div className="bg-card/80 p-2.5 rounded-lg border border-success/20 text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pago Inicial / Entrada</span>
                            <span className="text-sm font-black text-foreground">{plan.initial_payment ? `${plan.initial_payment} €` : '0 €'}</span>
                          </div>
                          <div className="bg-card/80 p-2.5 rounded-lg border border-success/20 text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pago / Cuota Final</span>
                            <span className="text-sm font-black text-foreground">{plan.final_payment ? `${plan.final_payment} €` : '0 €'}</span>
                          </div>
                          <div className="bg-card/80 p-2.5 rounded-lg border border-success/20 text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Costo Total Plan</span>
                            <span className="text-sm font-black text-foreground">{plan.total_cost ? `${plan.total_cost} €` : '—'}</span>
                          </div>
                          <div className="bg-card/80 p-2.5 rounded-lg border border-success/20 text-center flex flex-col justify-center items-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Estado</span>
                            <Badge className="mt-0.5 bg-success/15 text-success font-extrabold border-success/30 capitalize">
                              {plan.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground italic">
                  Sin cuota de mensualidad específica asignada. Las citas usarán el precio por defecto del catálogo. Haz clic en los botones superiores para activar un plan de Ortodoncia o Miofuncional.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Odontogram General (Visión de Boca) */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Smile className="h-5 w-5 text-primary" /> Odontograma General (Visión de Boca)
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
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
                  className="h-8 text-xs font-bold gap-1.5 rounded-xl border-border text-foreground hover:bg-muted cursor-pointer"
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
                    className="h-8 text-xs font-bold rounded-xl text-muted-foreground border-border"
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
                    className="h-8 text-xs font-bold gap-1.5 rounded-xl bg-success hover:bg-success/90 text-white cursor-pointer"
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
          { label: "Visitas totales", value: appointments.length, icon: CalendarIcon, color: "text-info bg-info/10 border-info/20" },
          { label: "Recordatorios", value: reminders.length, icon: Bell, color: "text-warning bg-warning/10 border-warning/20" },
          { label: "Total cobrado", value: `${totalPaid.toFixed(0)} €`, icon: CheckCircle2, color: "text-success bg-success/10 border-success/20" },
          { label: "Pendiente cobro", value: `${totalPending.toFixed(0)} €`, icon: CreditCard, color: "text-primary bg-primary/10 border-primary/20" },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-border/60 overflow-x-auto">
          {([
            { id: "historial", label: `Historial de Citas${appointments.length > 0 ? ` (${appointments.length})` : ""}`, icon: CalendarIcon },
            { id: "galeria", label: `Fotografías${photoCount > 0 ? ` (${photoCount})` : ""}`, icon: ImageIcon },
            { id: "facturacion", label: `Facturación y Pagos${billing.length > 0 ? ` (${billing.length})` : ""}`, icon: Receipt },
            { id: "recordatorios", label: `Recordatorios${reminders.length > 0 ? ` (${reminders.length})` : ""}`, icon: Bell },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/10"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
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
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                {/* Select all toggle */}
                {appointments.length > 0 && (
                  <button
                    onClick={toggleSelectAllAppointments}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    {selectedAppointmentIds.length === appointments.length ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedAppointmentIds.length === appointments.length ? "Deseleccionar todo" : "Seleccionar todo"}
                  </button>
                )}
                <p className="text-xs text-muted-foreground font-medium">Historial completo de visitas</p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  triggerNewAppointmentModal({
                    patientId: patient.id,
                    patientName: `${patient.firstName} ${patient.lastName}`,
                  })
                }
                className="h-7 gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-[11px] font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Nueva Cita
              </Button>
            </div>

            {/* Bulk action bar — shown when items are selected */}
            {selectedAppointmentIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-primary/10 border-b border-primary/20">
                <span className="text-xs font-bold text-primary">
                  {selectedAppointmentIds.length} cita(s) seleccionada(s)
                </span>
                <div className="flex flex-wrap items-center gap-2 ml-2">
                  <select
                    disabled={bulkActionLoading}
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) handleBulkStatusChange(e.target.value); }}
                    className="text-xs font-semibold border border-border rounded-lg px-2 py-1.5 bg-card text-foreground cursor-pointer focus:ring-2 focus:ring-primary/60 focus:outline-none"
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
                    className="h-7 gap-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-[11px] font-bold cursor-pointer"
                  >
                    {bulkActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Eliminar seleccionadas
                  </Button>
                  <button
                    onClick={() => setSelectedAppointmentIds([])}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarIcon className="h-10 w-10 mb-3 text-muted-foreground" />
                <p className="font-semibold text-sm">Sin citas registradas</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {appointments.map((app) => {
                  const d = formatDate(app.appointment_date);
                  const isSelected = selectedAppointmentIds.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      className={`px-5 py-4 flex items-center gap-3 transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleAppointmentSelection(app.id)}
                        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>

                      {/* Row content — click navigates to detail */}
                      <Link href={`/appointments/${app.id}`} className="flex items-center justify-between flex-1 group cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0 border border-primary/20">
                            <span className="text-sm font-black text-foreground">{d.day}</span>
                            <span className="text-[10px] font-bold text-primary uppercase">{d.month}</span>
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {app.reason} — {app.treatmentName}
                            </p>
                            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {app.professionalName}
                                {app.guestDoctor && <span className="font-bold text-primary ml-0.5">(+ {app.guestDoctor})</span>}
                              </span>
                              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{app.clinicName}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{d.time}</span>
                            </p>
                            {app.notes && <p className="text-[11px] text-muted-foreground mt-1 italic truncate max-w-md">{app.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs font-semibold ${getStatusBadge(app.status)}`}>{app.status}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary/80 transition-colors" />
                        </div>
                      </Link>

                      {/* Individual Delete Button */}
                      <button
                        type="button"
                        title={app.status === "Realizada" || app.status === "realizada" ? "No se puede eliminar una cita Realizada" : "Eliminar cita accidental"}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (app.status === "Realizada" || app.status === "realizada") {
                            alert("No se puede eliminar una cita que ya ha sido 'Realizada'.");
                            return;
                          }
                          if (!confirm(`¿Eliminar la cita "${app.reason}" del ${d.full}?`)) return;
                          try {
                            await (supabase as any).from("billing_records").delete().eq("appointment_id", app.id);
                            const { error } = await (supabase as any).from("appointments").delete().eq("id", app.id);
                            if (error) throw error;
                            await fetchAll();
                          } catch (err: any) {
                            alert(`Error al eliminar cita: ${err.message}`);
                          }
                        }}
                        disabled={app.status === "Realizada" || app.status === "realizada"}
                        className={`p-1.5 rounded-lg border transition-all ${
                          app.status === "Realizada" || app.status === "realizada"
                            ? "opacity-30 cursor-not-allowed border-transparent text-muted-foreground"
                            : "border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer"
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
            <div className="px-5 py-3.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-muted/40">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Total cobrado</p>
                  <p className="text-base font-black text-success">{totalPaid.toFixed(2)} €</p>
                </div>
                {totalPending > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Pendiente cobro</p>
                    <p className="text-base font-black text-warning">{totalPending.toFixed(2)} €</p>
                  </div>
                )}
                {selectedBillingIds.length > 0 && (
                  <div className="pl-4 border-l border-border">
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
                  className="h-9 px-3.5 gap-1.5 rounded-xl bg-success hover:bg-success/90 text-white text-xs font-bold shadow-sm cursor-pointer"
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
                      : "bg-muted text-muted-foreground border-border cursor-not-allowed"
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
              <div className="px-5 py-3 bg-muted/40 border-b border-border/60">
                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Datos de facturación</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-foreground">
                  {patient.billingName && <div><span className="text-muted-foreground">Nombre/Razón social:</span><br/><strong>{patient.billingName}</strong></div>}
                  {patient.nifCif && <div><span className="text-muted-foreground">NIF/CIF:</span><br/><strong>{patient.nifCif}</strong></div>}
                  {patient.billingAddress && <div><span className="text-muted-foreground">Dirección:</span><br/><strong>{patient.billingAddress}</strong></div>}
                  {patient.billingCity && <div><span className="text-muted-foreground">Ciudad/CP:</span><br/><strong>{patient.billingCity} {patient.billingPostalCode}</strong></div>}
                  {patient.odooPartnerId && (
                    <div>
                      <span className="text-muted-foreground">Odoo Partner:</span><br/>
                      <a href={`${process.env.NEXT_PUBLIC_ODOO_URL}/web#id=${patient.odooPartnerId}&model=res.partner`} target="_blank" rel="noopener noreferrer" className="text-violet-600 font-bold flex items-center gap-1 hover:underline">
                        #{patient.odooPartnerId} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {billing.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CreditCard className="h-10 w-10 mb-3 text-muted-foreground" />
                <p className="font-semibold text-sm">Sin registros financieros</p>
                <p className="text-xs text-muted-foreground mt-1">Usa el botón &quot;Crear Pago&quot; para añadir el primer cobro</p>
              </div>
            ) : (
              <div>
                {/* Select All Checkbox Header */}
                <div className="px-5 py-2.5 bg-muted/70 border-b border-border flex items-center justify-between text-xs font-semibold text-muted-foreground">
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
                  <span className="text-[11px] text-muted-foreground font-normal">Los cobros ya facturados no se pueden volver a seleccionar</span>
                </div>

                <div className="divide-y divide-border">
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
                          isSelected ? "bg-violet-50/50" : isFacturado ? "bg-muted/40" : "hover:bg-muted"
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
                              <p className="font-bold text-foreground text-sm capitalize">{b.appointment_reason}</p>
                              {isFacturado ? (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-800 border border-violet-200">
                                    <Receipt className="h-3 w-3 text-violet-600" /> Facturada ({invoiceRef})
                                  </span>
                                  {b.odoo_invoice_id && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          setSendingInvoiceEmailId(b.id);
                                          const res = await fetch('/api/odoo/invoice/email', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ invoiceId: b.odoo_invoice_id })
                                          });
                                          const json = await res.json();
                                          if (json.success) {
                                            alert("Email programado para enviarse al paciente desde Odoo");
                                          } else {
                                            throw new Error(json.error || "Error al enviar email");
                                          }
                                        } catch (e: any) {
                                          alert(`Error: ${e.message}`);
                                        } finally {
                                          setSendingInvoiceEmailId(null);
                                        }
                                      }}
                                      disabled={sendingInvoiceEmailId === b.id}
                                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors disabled:opacity-50"
                                    >
                                      {sendingInvoiceEmailId === b.id ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> : <Mail className="h-3 w-3 text-blue-600" />} Email
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-warning/10 text-warning border border-warning/30">
                                  Por Facturar
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-0.5">
                              {monthLabel} {b.payment_method && `· ${b.payment_method}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="font-black text-foreground text-sm">{b.custom_price.toFixed(2)} €</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(b.status)}`}>
                              {b.status}
                            </span>
                            {!isFacturado && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingBillingRecord(b);
                                  setIsEditingPaymentModalOpen(true);
                                }}
                                className="h-7 px-2 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200 rounded-lg gap-1 cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" /> Modificar
                              </Button>
                            )}
                          </div>
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
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <p className="text-xs text-muted-foreground font-medium">Recordatorios por Email, WhatsApp y SMS</p>
              <Button
                size="sm"
                onClick={() => setNewReminderModalOpen(true)}
                className="h-8 gap-1.5 rounded-xl bg-success hover:bg-success/90 text-white text-xs font-bold shadow-md shadow-success/20 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Nuevo Recordatorio
              </Button>
            </div>
            {reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                <Bell className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-bold text-foreground text-sm">Sin recordatorios programados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Programa notificaciones por WhatsApp o Email para el paciente</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewReminderModalOpen(true)}
                  className="rounded-xl text-xs font-bold gap-1.5 text-success border-success/30 bg-success/10 hover:bg-success/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Crear Primer Recordatorio
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reminders.map((r) => {
                  const d = formatDate(r.scheduled_at);
                  const isWhatsapp = r.channel === "whatsapp";
                  const isEmail = r.channel === "email";
                  const isPending = r.status === "pendiente";

                  return (
                    <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-muted transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isWhatsapp ? "bg-success/10 border-success/20 text-success" :
                          isEmail ? "bg-info/10 border-info/20 text-info" :
                          "bg-purple-50 border-purple-100 text-purple-600"
                        }`}>
                          {isWhatsapp ? <MessageSquare className="h-5 w-5" /> : isEmail ? <Mail className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground text-sm">{r.subject || REMINDER_TYPE_LABELS[r.reminder_type]}</p>
                            <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                              isWhatsapp ? "bg-success/15 text-success" :
                              isEmail ? "bg-info/15 text-info" :
                              "bg-purple-100 text-purple-800"
                            }`}>
                              {r.channel}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Programado para: {d.full}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic bg-muted/40 p-2 rounded-lg border border-border/60 max-w-lg">
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
                            className="h-8 px-2.5 text-[11px] font-bold text-success bg-success/10 border-success/30 hover:bg-success/20 rounded-xl gap-1"
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

        {/* GALERIA */}
        {activeTab === "galeria" && (
          <div className="p-0">
            <PhotoGallery patientId={patient.id} />
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
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Documentos y Consentimientos</h2>
            {(() => {
              const nonImg = documents.filter((d) => !isImageDocument({ file_name: d.file_name, document_type: d.document_type, mime_type: d.mime_type ?? null }));
              return nonImg.length > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{nonImg.length}</span>
              ) : null;
            })()}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <DocumentDropZone patientId={patient.id} onUpload={fetchAll} />

          {(() => {
            const nonImageDocs = documents.filter((d) => !isImageDocument({ file_name: d.file_name, document_type: d.document_type, mime_type: d.mime_type ?? null }));
            return nonImageDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nonImageDocs.map((doc) => {
                const d = formatDate(doc.created_at);
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/10 transition-all cursor-pointer group">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary">{doc.file_name}</p>
                      <p className="text-[11px] text-muted-foreground">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type} · {d.full}</p>
                    </div>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            ) : null;
          })()}
        </div>
      </div>
      {/* Payment Registration Modal */}
      {patient && (
        <PaymentRegistrationModal
          open={paymentModalOpen || isEditingPaymentModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setPaymentModalOpen(false);
              setIsEditingPaymentModalOpen(false);
              setEditingBillingRecord(null);
            } else {
              setPaymentModalOpen(true);
            }
          }}
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
          appointments={appointments.map((a) => ({
            id: a.id,
            reason: a.reason,
            appointment_date: a.appointment_date,
          }))}
          editingRecord={(editingBillingRecord as any) || undefined}
          onSuccess={fetchAll}
          patientDetails={{
            id: patient.historiaId, // historiaId for Odoo reference
            first_name: patient.firstName,
            last_name: patient.lastName,
            email: patient.email,
            phone: patient.phone,
            street: patient.billingAddress || patient.address, // billing address preferred
            city: patient.billingCity,
            zip_code: patient.billingPostalCode,
            vat: patient.nifCif, // NIF/CIF for Odoo
            billing_name: patient.billingName || undefined, // Separate billing name if different from contact
          }}
        />
      )}

      {/* Edit Treatment Plan Modal */}
      {editingPlanModalOpen && (
        <div className="fixed inset-0 bg-sidebar-accent/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-border/60">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-success" /> {editingPlanId ? "Editar Plan de Tratamiento" : "Nuevo Plan de Tratamiento"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingPlanModalOpen(false)} className="h-7 w-7 p-0 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Tipo de Tratamiento*</label>
                  <select
                    value={planForm.treatment_type}
                    onChange={(e) => setPlanForm({ ...planForm, treatment_type: e.target.value })}
                    className="w-full h-9 px-3 border border-border rounded-xl text-sm font-medium bg-card"
                  >
                    <option value="Ortodoncia">Ortodoncia</option>
                    <option value="Miofuncional">Miofuncional</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Precio Mensualidad Control (€)*</label>
                  <input
                    type="number"
                    value={planForm.monthly_fee}
                    onChange={(e) => setPlanForm({ ...planForm, monthly_fee: e.target.value })}
                    className="w-full h-9 px-3 border border-border rounded-xl text-sm font-bold text-success focus:outline-none focus:ring-2 focus:ring-success/60"
                    placeholder="Ej. 60"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Este precio se aplicará prioritariamente a todas sus citas de tipo &quot;Control&quot;.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Pago Inicial / Entrada (€)</label>
                  <input
                    type="number"
                    value={planForm.initial_payment}
                    onChange={(e) => setPlanForm({ ...planForm, initial_payment: e.target.value })}
                    className="w-full h-9 px-3 border border-border rounded-xl text-sm font-medium"
                    placeholder="Ej. 300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Pago / Cuota Final (€)</label>
                  <input
                    type="number"
                    value={planForm.final_payment}
                    onChange={(e) => setPlanForm({ ...planForm, final_payment: e.target.value })}
                    className="w-full h-9 px-3 border border-border rounded-xl text-sm font-medium"
                    placeholder="Ej. 150"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Número de Mensualidades</label>
                  <input
                    type="number"
                    value={planForm.total_installments}
                    onChange={(e) => setPlanForm({ ...planForm, total_installments: e.target.value })}
                    className="w-full h-9 px-3 border border-border rounded-xl text-sm font-medium"
                    placeholder="Ej. 18"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Costo Total Plan (€)</label>
                  <input
                    type="number"
                    value={planForm.total_cost}
                    onChange={(e) => setPlanForm({ ...planForm, total_cost: e.target.value })}
                    className="w-full h-9 px-3 border border-border rounded-xl text-sm font-medium"
                    placeholder="Ej. 1080"
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Datos Históricos (Volcado)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Mensualidades Ya Pagadas</label>
                    <input
                      type="number"
                      value={planForm.paid_installments_count}
                      onChange={(e) => setPlanForm({ ...planForm, paid_installments_count: e.target.value })}
                      className="w-full h-9 px-3 border border-border rounded-xl text-sm font-medium"
                      placeholder="Ej. 5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Monto Ya Pagado (€)</label>
                    <input
                      type="number"
                      value={planForm.already_paid_amount}
                      onChange={(e) => setPlanForm({ ...planForm, already_paid_amount: e.target.value })}
                      className="w-full h-9 px-3 border border-border rounded-xl text-sm font-medium"
                      placeholder="Ej. 300"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Estado del Plan</label>
                <select
                  value={planForm.status}
                  onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                  className="w-full h-9 px-3 border border-border rounded-xl text-sm font-medium bg-card"
                >
                  <option value="activo">Activo</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              {editingPlanId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("¿Estás seguro de eliminar este plan de tratamiento?")) return;
                    try {
                      const res = await fetch(`/api/treatment-plans?id=${editingPlanId}`, { method: "DELETE" });
                      if (!res.ok) throw new Error("No se pudo eliminar el plan");
                      setEditingPlanModalOpen(false);
                      await fetchAll();
                    } catch (err: any) {
                      alert(`Error: ${err.message}`);
                    }
                  }}
                  className="text-primary hover:bg-primary/10 hover:text-primary text-xs font-bold rounded-xl gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar Plan
                </Button>
              ) : <div />}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingPlanModalOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!patient?.id) return;
                  try {
                    const payload: any = {
                      patient_id: patient.id,
                      monthly_fee: parseFloat(planForm.monthly_fee) || 0,
                      total_installments: parseInt(planForm.total_installments, 10) || 0,
                      total_cost: parseFloat(planForm.total_cost) || 0,
                      initial_payment: parseFloat(planForm.initial_payment) || 0,
                      final_payment: parseFloat(planForm.final_payment) || 0,
                      treatment_type: planForm.treatment_type,
                      paid_installments_count: parseInt(planForm.paid_installments_count, 10) || 0,
                      already_paid_amount: parseFloat(planForm.already_paid_amount) || 0,
                      status: planForm.status,
                    };
                    if (editingPlanId) payload.id = editingPlanId;

                    const res = await fetch("/api/treatment-plans", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload)
                    });
                    if (!res.ok) {
                      const errJson = await res.json();
                      throw new Error(errJson.error || "Error guardando el plan");
                    }

                    setEditingPlanModalOpen(false);
                    await fetchAll();
                  } catch (err: any) {
                    alert(`Error guardando el plan: ${err.message}`);
                  }
                }}
                className="bg-success hover:bg-success/90 text-white font-bold rounded-xl"
              >
                <Save className="h-4 w-4 mr-1" /> Guardar Plan
              </Button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
