"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarCheck,
  Sparkles,
  Clock,
  Building2,
  Stethoscope,
  Settings2,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";
import { PatientSelect } from "@/components/patients/patient-select";
import { useRouter } from "next/navigation";

const TIME_SLOTS = [
  "09:00", "09:15", "09:30", "09:45",
  "10:00", "10:15", "10:30", "10:45",
  "11:00", "11:15", "11:30", "11:45",
  "12:00", "12:15", "12:30", "12:45",
  "13:00", "13:15", "13:30", "13:45",
  "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45",
  "16:00", "16:15", "16:30", "16:45",
  "17:00", "17:15", "17:30", "17:45",
  "18:00", "18:15", "18:30", "18:45",
  "19:00", "19:15", "19:30", "19:45",
  "20:00",
];

const DURATION_OPTIONS = [
  { value: 15, label: "15 min (Consulta rápida)" },
  { value: 30, label: "30 min (Estándar)" },
  { value: 45, label: "45 min (Extensa)" },
  { value: 60, label: "1 hora (Cirugía / Complejo)" },
  { value: 90, label: "1h 30m (Sesión doble)" },
];

export type OpenAppointmentModalDetail = {
  patientId?: string;
  patientName?: string;
  date?: string; // YYYY-MM-DD
  time?: string;
};

export function triggerNewAppointmentModal(detail?: OpenAppointmentModalDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("open-new-appointment-modal", { detail })
    );
  }
}

export function NewAppointmentModalGlobal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic DB catalog options
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [professionals, setProfessionals] = useState<{ id: string; name: string }[]>([]);

  // Form states
  const [appointmentDate, setAppointmentDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedStartTime, setSelectedStartTime] = useState<string>("10:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);

  const [patientId, setPatientId] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");

  const [treatment, setTreatment] = useState<string>("");
  const [naturalText, setNaturalText] = useState<string>("");

  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [guestDoctor, setGuestDoctor] = useState<string>("");

  const [price, setPrice] = useState<string>("50");
  const [labCost, setLabCost] = useState<string>("0");
  const [commissionPct, setCommissionPct] = useState<string>("40");

  const loadCatalogs = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      const [{ data: cData }, { data: pData }] = await Promise.all([
        supabase.from("clinics").select("id, name").order("name"),
        supabase.from("professionals").select("id, first_name, last_name").order("first_name"),
      ]);

      if (cData && cData.length > 0) {
        setClinics(cData);
        // Only set default if current selection is empty or not in the list
        setSelectedClinicId((prev) => {
          if (!prev || !cData.find((c) => c.id === prev)) return cData[0].id;
          return prev;
        });
      }

      if (pData && pData.length > 0) {
        const mapped = pData.map((p) => ({
          id: p.id,
          name: `Dra. ${p.first_name} ${p.last_name}`,
        }));
        setProfessionals(mapped);
        const oslyMatch = mapped.find((m) => m.name.toLowerCase().includes("osly"));
        const defaultProId = oslyMatch ? oslyMatch.id : mapped[0].id;

        setSelectedProfessionalId((prev) => {
          if (!prev || !mapped.find((m) => m.id === prev)) return defaultProId;
          return prev;
        });
      }
    } catch (err) {
      console.error("Error cargando catálogos para cita:", err);
    } finally {
      setCatalogsLoading(false);
    }
  }, []);

  // Reload catalogs each time modal opens
  useEffect(() => {
    if (isOpen) loadCatalogs();
  }, [isOpen, loadCatalogs]);

  // Global event listener
  useEffect(() => {
    function handleOpenEvent(e: Event) {
      const customEvent = e as CustomEvent<OpenAppointmentModalDetail>;
      const detail = customEvent.detail;

      if (detail?.patientName) setPatientName(detail.patientName);
      if (detail?.patientId) setPatientId(detail.patientId);
      if (detail?.date) setAppointmentDate(detail.date);
      if (detail?.time) setSelectedStartTime(detail.time);

      setIsOpen(true);
    }

    window.addEventListener("open-new-appointment-modal", handleOpenEvent);
    return () =>
      window.removeEventListener("open-new-appointment-modal", handleOpenEvent);
  }, []);

  // Save Appointment to Supabase
  const handleSave = async () => {
    if (!patientName.trim()) {
      alert("Por favor selecciona o introduce un paciente.");
      return;
    }

    setLoading(true);
    try {
      // 1. Find or create patient ID
      let targetPatientId = patientId;

      if (!targetPatientId) {
        // Search by name
        const nameParts = patientName.trim().split(" ");
        const firstName = nameParts[0] || "Paciente";
        const lastName = nameParts.slice(1).join(" ") || "Nuevo";

        const { data: existing } = await supabase
          .from("patients")
          .select("id")
          .ilike("first_name", firstName)
          .ilike("last_name", lastName)
          .maybeSingle();

        if (existing) {
          targetPatientId = existing.id;
        } else {
          // Insert new patient
          const { data: newP, error: pErr } = await supabase
            .from("patients")
            .insert({
              first_name: firstName,
              last_name: lastName,
              in_treatment: true,
            })
            .select("id")
            .single();

          if (pErr || !newP) {
            throw new Error(`Error creando paciente: ${pErr?.message}`);
          }
          targetPatientId = newP.id;
        }
      }

      // 2. Build appointment timestamp
      const fullDateStr = `${appointmentDate}T${selectedStartTime}:00`;

      // 3. Insert Appointment into Supabase
      const finalNotes = guestDoctor.trim()
        ? `${naturalText || ""}\n[DoctorInvitado: ${guestDoctor.trim()}]`.trim()
        : (naturalText || null);

      const { data: newAppt, error: apptErr } = await supabase
        .from("appointments")
          .insert({
            patient_id: targetPatientId,
            clinic_id: selectedClinicId || null,
            professional_id: selectedProfessionalId || null,
            appointment_date: fullDateStr,
            reason: treatment || "Consulta Odontológica",
            notes: finalNotes,
            ai_raw_input: naturalText || null,
            status: "Pendiente",
          } as any)
          .select("id")
          .single();

        if (apptErr || !newAppt) {
          throw new Error(`Error guardando cita: ${apptErr?.message}`);
        }

        // 4. Create Billing Record
        const numericPrice = parseFloat(price) || 0;
        const numericLabCost = parseFloat(labCost) || 0;

        await (supabase as any).from("billing_records").insert({
          appointment_id: newAppt.id,
          billing_month: appointmentDate.substring(0, 7),
          custom_price: numericPrice,
          calculated_total: numericPrice - numericLabCost,
          status: "Pendiente",
        });

        setIsOpen(false);
        // Reset form
        setTreatment("");
        setNaturalText("");
        setGuestDoctor("");
        setPatientName("");
        setPatientId("");

      // Refresh router and dispatch event so calendar updates instantly
      router.refresh();
      window.dispatchEvent(new CustomEvent("appointment-created"));
    } catch (err: any) {
      console.error("Error guardando cita:", err);
      alert(`No se pudo crear la cita: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-white border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-rose-500" />
            Nueva Cita — {appointmentDate}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* AI Prompt Input */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
              <Sparkles className="h-4 w-4 text-rose-500" />
              <span>Asistente IA (Dictado / Lenguaje Natural)</span>
            </div>
            <Input
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              placeholder='Ej: "Vino Juan en Albacete, le hice Ortodoncia por 60€ duracion 45m"'
              className="bg-white border-rose-200 text-sm focus-visible:ring-rose-500 rounded-lg"
            />
          </div>

          {/* Date & Time selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Fecha</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="text-xs rounded-lg pl-8"
                />
                <CalendarIcon className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Hora de Inicio</Label>
              <Select
                value={selectedStartTime}
                onValueChange={(val) => val && setSelectedStartTime(val)}
              >
                <SelectTrigger className="text-xs rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}h</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Duración</Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(val) => val && setDurationMinutes(parseInt(val))}
              >
                <SelectTrigger className="text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Patient Lookup with Autocomplete AJAX */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Paciente (Búsqueda o Nuevo)</Label>
            <PatientSelect
              value={patientName}
              onSelectPatient={(p) => {
                setPatientId(p.id);
                setPatientName(`${p.firstName} ${p.lastName}`);
              }}
            />
          </div>

          {/* Free Text Treatment / Session Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Tratamiento & Notas (Texto libre)</Label>
            <Input
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Ej: Ortodoncia brackets metal, cambio de arcos e higiene"
              className="text-sm rounded-lg"
            />
          </div>

          {/* Clinic & Doctor Select */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Clínica / Sede</Label>
              <Select
                value={selectedClinicId}
                onValueChange={(val) => val && setSelectedClinicId(val)}
                disabled={catalogsLoading}
              >
                <SelectTrigger className="text-xs rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {catalogsLoading
                      ? <span className="text-slate-400">Cargando...</span>
                      : <SelectValue placeholder="Seleccionar clínica" />
                    }
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {clinics.length === 0 && (
                    <SelectItem value="__none" disabled>Sin clínicas — ve a Configuración</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Profesional</Label>
              <Select
                value={selectedProfessionalId}
                onValueChange={(val) => val && setSelectedProfessionalId(val)}
                disabled={catalogsLoading}
              >
                <SelectTrigger className="text-xs rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {catalogsLoading
                      ? <span className="text-slate-400">Cargando...</span>
                      : <SelectValue placeholder="Seleccionar profesional" />
                    }
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {professionals.length === 0 && (
                    <SelectItem value="__none" disabled>Sin profesionales — ve a Configuración</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Dr. Invitado / Colaborador (Opcional)</Label>
            <Input
              value={guestDoctor}
              onChange={(e) => setGuestDoctor(e.target.value)}
              placeholder="Ej: Dr. Carlos Pérez (Cirujano invitado)"
              className="text-xs rounded-lg h-9 bg-white"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="rounded-xl text-xs font-semibold"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Confirmar y Agendar Cita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
