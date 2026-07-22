"use client";

import React, { useState, useEffect } from "react";
import {
  User, Phone, Mail, FileText, Calendar as CalendarIcon, CreditCard,
  Activity, Upload, CheckCircle2, AlertCircle, ShieldAlert, Pill,
  Stethoscope, ArrowLeft, Clock, MapPin, Loader2, Building2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

type Patient = {
  id: string;
  historiaId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
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
};

type Appointment = {
  id: string;
  appointment_date: string;
  reason: string;
  status: string;
  notes: string | null;
  clinicName: string;
  professionalName: string;
  treatmentName: string;
};

type BillingRecord = {
  id: string;
  billing_month: string;
  custom_price: number;
  calculated_total: number;
  status: string;
  appointment_reason: string;
};

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

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Realizada: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Confirmada: "bg-blue-50 text-blue-700 border-blue-200",
    Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    Cancelada: "bg-red-50 text-red-700 border-red-200",
    Aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Pendiente_Pago: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export default function PatientProfilePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("historial");
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [billing, setBilling] = useState<BillingRecord[]>([]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        // 1. Fetch patient
        const { data: pData } = await supabase
          .from("patients")
          .select("*")
          .or(`id.eq.${params.id},historia_id.eq.${params.id}`)
          .limit(1);

        // Fallback: try to find PAC-1 if no match
        let p = pData?.[0];
        if (!p) {
          const { data: fallback } = await supabase
            .from("patients")
            .select("*")
            .eq("historia_id", "PAC-1")
            .limit(1);
          p = fallback?.[0];
        }

        if (!p) return;

        setPatient({
          id: p.id,
          historiaId: p.historia_id,
          firstName: p.first_name,
          lastName: p.last_name,
          phone: p.phone ?? null,
          email: p.email ?? null,
          dni: p.dni_nie ?? null,
          dob: p.dob ?? null,
          gender: p.gender ?? null,
          address: p.address ?? null,
          importantDiseases: p.important_diseases ?? null,
          previousOperations: p.previous_operations ?? null,
          allergies: p.allergies ?? null,
          currentMedication: p.current_medication ?? null,
          treatmentPlan: p.treatment_plan ?? null,
          inTreatment: p.in_treatment ?? false,
        });

        // 2. Fetch appointments with related data
        const { data: apptData } = await supabase
          .from("appointments")
          .select(`
            id,
            appointment_date,
            reason,
            status,
            notes,
            clinics ( name ),
            professionals ( first_name, last_name ),
            treatments ( service_name )
          `)
          .eq("patient_id", p.id)
          .order("appointment_date", { ascending: false });

        if (apptData) {
          setAppointments(apptData.map((a: any) => ({
            id: a.id,
            appointment_date: a.appointment_date,
            reason: a.reason ?? "Visita",
            status: a.status ?? "Pendiente",
            notes: a.notes,
            clinicName: a.clinics?.name ?? "—",
            professionalName: a.professionals
              ? `${a.professionals.first_name} ${a.professionals.last_name}`
              : "—",
            treatmentName: a.treatments?.service_name ?? "—",
          })));
        }

        // 3. Fetch billing
        const { data: billingData } = await supabase
          .from("billing_records")
          .select(`
            id,
            billing_month,
            custom_price,
            calculated_total,
            status,
            appointments ( reason )
          `)
          .in(
            "appointment_id",
            (apptData ?? []).map((a: any) => a.id)
          )
          .order("billing_month", { ascending: false });

        if (billingData) {
          setBilling(billingData.map((b: any) => ({
            id: b.id,
            billing_month: b.billing_month,
            custom_price: b.custom_price ?? 0,
            calculated_total: b.calculated_total ?? 0,
            status: b.status ?? "Pendiente",
            appointment_reason: b.appointments?.reason ?? "Tratamiento",
          })));
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [params.id]);

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
        <Link href="/patients">
          <Button variant="outline">Volver al directorio</Button>
        </Link>
      </div>
    );
  }

  const initials = `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`;
  const dobFormatted = patient.dob
    ? new Date(patient.dob).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Back button */}
      <div>
        <Link href="/patients" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver al directorio de pacientes
        </Link>
      </div>

      {/* Header Profile Card */}
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
                    <Badge
                      variant="outline"
                      className={`text-xs px-3 py-0.5 rounded-full font-bold border ${
                        patient.inTreatment
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {patient.inTreatment ? "En Tratamiento" : "Alta"}
                    </Badge>
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100">
                      {patient.historiaId}
                    </span>
                    {patient.gender && <span>Sexo: <strong>{patient.gender}</strong></span>}
                    {patient.dob && <span>Nacido: <strong>{dobFormatted}</strong></span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-9 gap-2 rounded-xl text-xs font-semibold">
                    <FileText className="h-4 w-4 text-slate-500" /> Editar Ficha
                  </Button>
                  <Button className="h-9 gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-500/20">
                    <CalendarIcon className="h-4 w-4" /> Agendar Cita
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            {/* Contact Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Phone className="h-4 w-4 text-rose-500" /> Información de Contacto
              </h3>
              <div className="text-xs text-slate-700 space-y-1.5 font-medium">
                {patient.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {patient.phone}
                  </p>
                )}
                {patient.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {patient.email}
                  </p>
                )}
                {patient.address && (
                  <p className="flex items-start gap-2 text-slate-500 pt-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    {patient.address}
                  </p>
                )}
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
                    <span><strong>Operaciones previas:</strong> {patient.previousOperations}</span>
                  </div>
                )}
                {patient.currentMedication && (
                  <div className="flex items-start gap-2 text-purple-800 bg-purple-50 p-2.5 rounded-xl border border-purple-100 font-medium">
                    <Pill className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
                    <span><strong>Medicación:</strong> {patient.currentMedication}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Treatment Plan */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-rose-500" /> Plan de Tratamiento
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                  {patient.treatmentPlan ?? "Sin plan registrado"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1.5 rounded-2xl w-full justify-start overflow-x-auto h-auto shadow-sm">
          <TabsTrigger
            value="historial"
            className="rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white font-semibold text-xs py-2.5 px-4"
          >
            Historial de Citas {appointments.length > 0 && `(${appointments.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="documentos"
            className="rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white font-semibold text-xs py-2.5 px-4"
          >
            Documentos y Consentimientos
          </TabsTrigger>
          <TabsTrigger
            value="pagos"
            className="rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white font-semibold text-xs py-2.5 px-4"
          >
            Facturación y Pagos {billing.length > 0 && `(${billing.length})`}
          </TabsTrigger>
        </TabsList>

        {/* HISTORIAL TAB */}
        <TabsContent value="historial" className="mt-4 space-y-4">
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900">Historial Clínico de Visitas</CardTitle>
              <Button className="h-8 gap-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm shadow-rose-500/20">
                <CalendarIcon className="h-3.5 w-3.5" /> Nueva Cita
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CalendarIcon className="h-10 w-10 mb-3 text-slate-200" />
                  <p className="font-semibold text-sm">Sin citas registradas</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {appointments.map((app) => {
                    const d = formatDate(app.appointment_date);
                    return (
                      <div
                        key={app.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-rose-50 flex flex-col items-center justify-center shrink-0 border border-rose-100">
                            <span className="text-sm font-black text-slate-800">{d.day}</span>
                            <span className="text-[10px] font-bold text-rose-600 uppercase">{d.month}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-rose-600 transition-colors">
                              {app.reason} — {app.treatmentName}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <User className="h-3 w-3" /> {app.professionalName}
                              <Building2 className="h-3 w-3 ml-1" /> {app.clinicName}
                              <Clock className="h-3 w-3 ml-1" /> {d.time}
                            </p>
                            {app.notes && (
                              <p className="text-[11px] text-slate-400 mt-1 italic truncate max-w-md">
                                {app.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${getStatusBadge(app.status)}`}
                        >
                          {app.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTOS TAB */}
        <TabsContent value="documentos" className="mt-4">
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Documentación Adjunta</CardTitle>
              <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1 text-xs font-semibold">
                <Upload className="h-3.5 w-3.5" /> Subir Documento
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <FileText className="h-10 w-10 mb-3 text-slate-200" />
                <p className="font-semibold text-sm">Sin documentos cargados</p>
                <p className="text-xs mt-1">Sube consentimientos, RX, fotografías o informes</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAGOS TAB */}
        <TabsContent value="pagos" className="mt-4">
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Historial Financiero y Entregas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {billing.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CreditCard className="h-10 w-10 mb-3 text-slate-200" />
                  <p className="font-semibold text-sm">Sin registros financieros</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {billing.map((b) => {
                    const monthDate = new Date(b.billing_month);
                    const monthLabel = monthDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
                    return (
                      <div key={b.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm capitalize">{b.appointment_reason}</p>
                          <p className="text-xs text-slate-500">{monthLabel}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 text-sm">
                            {b.custom_price.toFixed(2)} €
                          </p>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 justify-end w-fit ml-auto mt-1 ${getStatusBadge(b.status)}`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> {b.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
