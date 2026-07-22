"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Stethoscope, Phone, Mail, Building2, Calendar as CalendarIcon, Clock,
  ArrowLeft, Edit3, Loader2, AlertCircle, User, FileText, Activity,
  ChevronRight, MapPin, FileCheck
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";
import { ClinicMultiSelect, ClinicOption } from "@/components/common/clinic-multi-select";

type Professional = {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  dni_nie: string | null;
  address: string | null;
  clinic_id: string | null;
  created_at: string;
};

type AppointmentItem = {
  id: string;
  appointment_date: string;
  reason: string;
  status: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_historia_id: string;
  clinic_name: string;
};

const ALL_SPECIALTIES = [
  "Odontología General", "Ortodoncia", "Endodoncia", "Periodoncia",
  "Implantología", "Estética Dental", "Prostodoncia", "Odontopediatría", "Cirugía Oral"
];

export default function ProfessionalDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = React.use(params as any) as { id: string };
  const targetId = resolvedParams?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [assignedClinics, setAssignedClinics] = useState<{ id: string; name: string; is_primary: boolean }[]>([]);
  const [allClinics, setAllClinics] = useState<ClinicOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [notes, setNotes] = useState<string>("");

  // Edit dialog state (Unified with Patient)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fDniNie, setFDniNie] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fAddress, setFAddress] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [primaryClinicId, setPrimaryClinicId] = useState<string | null>(null);

  const fetchProfessionalData = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      // 1. Fetch professional details
      const { data: pData } = await supabase
        .from("professionals")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();

      if (pData) {
        const p = pData as any;
        setProfessional(p);
        setFFirstName(p.first_name);
        setFLastName(p.last_name);
        setFDniNie(p.dni_nie || "");
        setFPhone(p.phone || "");
        setFEmail(p.email || "");
        setFAddress(p.address || "");

        if (p.specialty) {
          setSelectedSpecialties(p.specialty.split(",").map((s: string) => s.trim()).filter(Boolean));
        } else {
          setSelectedSpecialties([]);
        }

        // 2. Fetch associated clinics from professional_clinics join table
        const { data: pcData } = await (supabase as any)
          .from("professional_clinics")
          .select("clinic_id, is_primary, clinics ( id, name, address, phone )")
          .eq("professional_id", targetId);

        if (pcData && pcData.length > 0) {
          const list = pcData.map((row: any) => ({
            id: row.clinics?.id || row.clinic_id,
            name: row.clinics?.name || "Clínica",
            is_primary: row.is_primary ?? false,
          }));
          setAssignedClinics(list);
          setSelectedClinicIds(list.map((c: any) => c.id));
          const prim = list.find((c: any) => c.is_primary);
          setPrimaryClinicId(prim ? prim.id : list[0].id);
        } else if (p.clinic_id) {
          const { data: cData } = await (supabase as any)
            .from("clinics")
            .select("id, name, address, phone")
            .eq("id", p.clinic_id)
            .maybeSingle();
          if (cData) {
            setAssignedClinics([{ id: cData.id, name: cData.name, is_primary: true }]);
            setSelectedClinicIds([cData.id]);
            setPrimaryClinicId(cData.id);
          }
        }

        // 3. Fetch all clinics for dropdown / multi-select
        const { data: clinicsData } = await (supabase as any)
          .from("clinics")
          .select("id, name")
          .order("name");
        if (clinicsData) setAllClinics(clinicsData);

        // 4. Fetch appointments for this professional
        const { data: apptData } = await supabase
          .from("appointments")
          .select(`
            id, appointment_date, reason, status, patient_id,
            clinics ( name ),
            patients ( first_name, last_name, historia_id )
          `)
          .eq("professional_id", targetId)
          .order("appointment_date", { ascending: false })
          .limit(30);

        if (apptData) {
          const mapped: AppointmentItem[] = apptData.map((a: any) => ({
            id: a.id,
            appointment_date: a.appointment_date,
            reason: a.reason || "Consulta",
            status: a.status || "Confirmada",
            patient_id: a.patient_id,
            patient_first_name: a.patients?.first_name || "Paciente",
            patient_last_name: a.patients?.last_name || "",
            patient_historia_id: a.patients?.historia_id || "PAC-",
            clinic_name: a.clinics?.name || "Clínica",
          }));
          setAppointments(mapped);
        }
      }
    } catch (e) {
      console.error("Error fetching professional:", e);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    fetchProfessionalData();
  }, [fetchProfessionalData]);

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleSaveEdit = async () => {
    if (!professional) return;
    setSaving(true);
    try {
      const payload = {
        first_name: fFirstName,
        last_name: fLastName,
        specialty: selectedSpecialties.join(", ") || null,
        phone: fPhone || null,
        email: fEmail || null,
        dni_nie: fDniNie || null,
        address: fAddress || null,
        clinic_id: primaryClinicId || (selectedClinicIds[0] || null),
      };

      await supabase.from("professionals").update(payload as any).eq("id", professional.id);

      // Save professional_clinics
      await (supabase as any).from("professional_clinics").delete().eq("professional_id", professional.id);
      if (selectedClinicIds.length > 0) {
        const links = selectedClinicIds.map(cid => ({
          professional_id: professional.id,
          clinic_id: cid,
          is_primary: primaryClinicId === cid,
        }));
        await (supabase as any).from("professional_clinics").insert(links);
      }

      setEditDialogOpen(false);
      await fetchProfessionalData();
    } catch (e) {
      console.error("Error updating professional:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span className="ml-3 text-slate-600 font-medium">Cargando ficha del profesional...</span>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-slate-300" />
        <p className="text-slate-600 font-semibold">Profesional no encontrado en la base de datos</p>
        <Link href="/settings/professionals">
          <Button variant="outline">Volver a Profesionales</Button>
        </Link>
      </div>
    );
  }

  const initials = `${professional.first_name[0] || ""}${professional.last_name[0] || ""}`;
  const totalAppointments = appointments.length;

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const thisMonthAppointments = appointments.filter(a => a.appointment_date.startsWith(currentMonthStr)).length;
  const uniquePatientsCount = new Set(appointments.map(a => a.patient_id)).size;

  const specialtiesList = (professional.specialty || "").split(",").map(s => s.trim()).filter(Boolean);

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/settings/professionals"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Profesionales
        </Link>
      </div>

      {/* Hero Header Card (Notion-style) */}
      <Card className="border-0 shadow-lg rounded-3xl bg-white overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-emerald-600 via-teal-600 to-rose-500 relative" />
        <CardContent className="px-8 pb-8 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-12">
            <div className="flex items-end gap-5">
              <div className="h-24 w-24 rounded-3xl bg-slate-900 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 shrink-0">
                {initials}
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    Dra. {professional.first_name} {professional.last_name}
                  </h1>
                  {specialtiesList.map((s, i) => (
                    <Badge key={i} className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold px-3 py-1 text-xs rounded-full">
                      {s}
                    </Badge>
                  ))}
                  {specialtiesList.length === 0 && (
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold px-3 py-1 text-xs rounded-full">
                      Sin especialidad
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-medium flex-wrap">
                  {professional.dni_nie && (
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                      {professional.dni_nie}
                    </span>
                  )}
                  {professional.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {professional.phone}
                    </span>
                  )}
                  {professional.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {professional.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {assignedClinics.length > 0
                      ? (assignedClinics.find(c => c.is_primary)?.name || assignedClinics[0].name)
                      : "Todas las sedes"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
                className="rounded-xl border-slate-200 hover:bg-slate-50 gap-2 font-semibold text-xs h-10 px-4"
              >
                <Edit3 className="h-4 w-4 text-slate-500" />
                <span>Editar Ficha</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-0 shadow-sm bg-white p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Citas Atendidas</span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{totalAppointments}</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CalendarIcon className="h-5 w-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-white p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Citas Este Mes</span>
            <span className="text-2xl font-black text-rose-600 mt-0.5 block">{thisMonthAppointments}</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
            <Activity className="h-5 w-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-white p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pacientes Distintos</span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{uniquePatientsCount}</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <User className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info & Notes */}
        <div className="space-y-6">
          {/* General Info Card */}
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-500" />
                Información del Profesional
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Completo</Label>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  Dra. {professional.first_name} {professional.last_name}
                </p>
              </div>

              {professional.dni_nie && (
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">DNI / NIE / NIF</Label>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 font-mono">{professional.dni_nie}</p>
                </div>
              )}

              <div>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Especialidades</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {specialtiesList.map((s, i) => (
                    <Badge key={i} className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                      {s}
                    </Badge>
                  ))}
                  {specialtiesList.length === 0 && <span className="text-sm text-slate-500">Sin especialidad</span>}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sedes Vinculadas</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {assignedClinics.length === 0 ? (
                    <span className="text-sm font-semibold text-slate-800">Todas las sedes</span>
                  ) : (
                    assignedClinics.map((c) => (
                      <span key={c.id} className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 ${
                        c.is_primary ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-100 border-slate-200 text-slate-700"
                      }`}>
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {c.name}
                        {c.is_primary && <span className="text-[10px] text-blue-600 font-bold ml-0.5">✓</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                {professional.phone && (
                  <div>
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono de Contacto</Label>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{professional.phone}</p>
                  </div>
                )}

                {professional.email && (
                  <div>
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Corporativo</Label>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{professional.email}</p>
                  </div>
                )}

                {professional.address && (
                  <div>
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dirección</Label>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{professional.address}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Notes (Notion-style) */}
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                Notas & Observaciones (Notion-style)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anota acuerdos de horario, disponibilidad por sedes u observaciones internas..."
                className="min-h-[140px] bg-slate-50/50 border-slate-200 resize-y text-sm rounded-xl"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                Estas notas sirven como guía interna y contexto para la gestión de la agenda.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Appointments History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-rose-500" />
                Historial de Citas Atendidas ({appointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {appointments.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No se registran citas previas para este profesional.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {appointments.map((a) => {
                    const dateObj = new Date(a.appointment_date);
                    return (
                      <div key={a.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                            {dateObj.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                          </div>
                          <div>
                            <Link href={`/patients/${a.patient_id}`} className="font-bold text-sm text-slate-900 hover:text-rose-600 transition-colors flex items-center gap-1.5">
                              {a.patient_first_name} {a.patient_last_name}
                              <span className="text-xs text-rose-600 font-bold">({a.patient_historia_id})</span>
                            </Link>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-medium">
                              <span>{a.reason}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-slate-400" />
                                {a.clinic_name}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge className={
                            a.status === "Realizada" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            a.status === "Confirmada" ? "bg-blue-100 text-blue-800 border-blue-200" :
                            a.status === "Cancelada" ? "bg-rose-100 text-rose-800 border-rose-200" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          }>
                            {a.status}
                          </Badge>

                          <Link href={`/appointments/${a.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Professional Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-500" />
              Editar Ficha del Profesional
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nombre *</Label>
                <Input value={fFirstName} onChange={(e) => setFFirstName(e.target.value)} className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Apellidos *</Label>
                <Input value={fLastName} onChange={(e) => setFLastName(e.target.value)} className="rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">DNI / NIE / NIF</Label>
                <Input value={fDniNie} onChange={(e) => setFDniNie(e.target.value)} className="rounded-lg font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Phone className="h-3 w-3" />Teléfono</Label>
                <Input value={fPhone} onChange={(e) => setFPhone(e.target.value)} className="rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label>
                <Input value={fEmail} onChange={(e) => setFEmail(e.target.value)} className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><MapPin className="h-3 w-3" />Dirección</Label>
                <Input value={fAddress} onChange={(e) => setFAddress(e.target.value)} className="rounded-lg" />
              </div>
            </div>

            {/* Multi-Specialty Chips Selection */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700 block">Especialidades (Selección Múltiple)</Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ALL_SPECIALTIES.map((spec) => {
                  const active = selectedSpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialty(spec)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-semibold border transition-all ${
                        active
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      {active ? "✓ " : "+ "}{spec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unified Multi-Clinic Selection Component */}
            <ClinicMultiSelect
              allClinics={allClinics}
              selectedClinicIds={selectedClinicIds}
              primaryClinicId={primaryClinicId}
              onChangeSelected={setSelectedClinicIds}
              onChangePrimary={setPrimaryClinicId}
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-2 font-bold shadow-md shadow-rose-500/20">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
