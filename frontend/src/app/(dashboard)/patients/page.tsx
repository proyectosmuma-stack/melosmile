"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  Phone, 
  Mail, 
  FileText, 
  AlertCircle, 
  Activity, 
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  Pill,
  Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";

export type PatientRecord = {
  id: string;
  historiaId: string;
  firstName: string;
  lastName: string;
  dniNie: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  inTreatment: boolean;
  importantDiseases: string;
  previousOperations: string;
  allergies: string;
  currentMedication: string;
  treatmentPlan: string;
  createdAt?: string;
};

const INITIAL_MOCK_PATIENTS: PatientRecord[] = [
  {
    id: "p1",
    historiaId: "PAC-001",
    firstName: "Juan",
    lastName: "Pérez",
    dniNie: "12345678A",
    dob: "1985-04-12",
    gender: "Masculino",
    phone: "+34 612 345 678",
    email: "juan.perez@email.com",
    address: "Calle Mayor 12, Madrid",
    inTreatment: true,
    importantDiseases: "Hipertensión arterial",
    previousOperations: "Ninguna",
    allergies: "Penicilina",
    currentMedication: "Enalapril 10mg",
    treatmentPlan: "Ortodoncia brackets metálicos + Higiene previa",
  },
  {
    id: "p2",
    historiaId: "PAC-002",
    firstName: "María",
    lastName: "Gómez",
    dniNie: "87654321B",
    dob: "1992-09-24",
    gender: "Femenino",
    phone: "+34 622 987 654",
    email: "maria.gomez@email.com",
    address: "Av. de Portugal 45, Albacete",
    inTreatment: true,
    importantDiseases: "Ninguna",
    previousOperations: "Apendicectomía 2018",
    allergies: "Látex",
    currentMedication: "Ninguna",
    treatmentPlan: "Estética Dental - Carillas de porcelana",
  },
  {
    id: "p3",
    historiaId: "PAC-003",
    firstName: "Carlos",
    lastName: "Rodríguez",
    dniNie: "45678912C",
    dob: "1978-11-03",
    gender: "Masculino",
    phone: "+34 633 456 789",
    email: "carlos.rodriguez@email.com",
    address: "Calle de la Princesa 8, Madrid",
    inTreatment: false,
    importantDiseases: "Diabetes tipo 2",
    previousOperations: "Cirugía de rodilla",
    allergies: "Aspirina / AINES",
    currentMedication: "Metformina 850mg",
    treatmentPlan: "Rehabilitación sobre implantes",
  },
  {
    id: "p4",
    historiaId: "PAC-004",
    firstName: "Laura",
    lastName: "Sánchez",
    dniNie: "33221144D",
    dob: "1995-02-18",
    gender: "Femenino",
    phone: "+34 644 112 233",
    email: "laura.sanchez@email.com",
    address: "Calle Rozas 100, Las Rozas",
    inTreatment: true,
    importantDiseases: "Ninguna",
    previousOperations: "Ninguna",
    allergies: "Ninguna",
    currentMedication: "Ninguna",
    treatmentPlan: "Alineadores Invisalign - Mantenimiento",
  },
  {
    id: "p5",
    historiaId: "PAC-005",
    firstName: "Munir",
    lastName: "Callaos",
    dniNie: "77889900X",
    dob: "1990-06-15",
    gender: "Masculino",
    phone: "+34 655 889 900",
    email: "munir@melosmile.com",
    address: "Paseo de la Castellana 200, Madrid",
    inTreatment: true,
    importantDiseases: "Ninguna",
    previousOperations: "Ninguna",
    allergies: "Polen",
    currentMedication: "Antihistamínicos",
    treatmentPlan: "Limpieza ultrasónica y Blanqueamiento led",
  },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_MOCK_PATIENTS);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal para Crear Nuevo Paciente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dniNie: "",
    dob: "",
    gender: "Femenino",
    phone: "",
    email: "",
    address: "",
    inTreatment: true,
    importantDiseases: "",
    previousOperations: "",
    allergies: "",
    currentMedication: "",
    treatmentPlan: "",
  });

  // Intentar cargar pacientes de Supabase
  useEffect(() => {
    async function loadPatients() {
      try {
        const { data, error } = await supabase.from("patients").select("*");
        if (!error && data && data.length > 0) {
          const mapped: PatientRecord[] = data.map((p: any) => ({
            id: p.id,
            historiaId: p.historia_id || `PAC-${p.id.slice(0, 3)}`,
            firstName: p.first_name,
            lastName: p.last_name,
            dniNie: p.dni_nie || "",
            dob: p.dob || "",
            gender: p.gender || "No especificado",
            phone: p.phone || "",
            email: p.email || "",
            address: p.address || "",
            inTreatment: p.in_treatment ?? true,
            importantDiseases: p.important_diseases || "",
            previousOperations: p.previous_operations || "",
            allergies: p.allergies || "",
            currentMedication: p.current_medication || "",
            treatmentPlan: p.treatment_plan || "",
          }));
          setPatients(mapped);
        }
      } catch (err) {
        console.log("Usando datos locales de pacientes.");
      }
    }
    loadPatients();
  }, []);

  // Filtrado de pacientes
  const filteredPatients = patients.filter((p) => {
    const search = searchQuery.toLowerCase();
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(search) ||
      p.dniNie.toLowerCase().includes(search) ||
      p.historiaId.toLowerCase().includes(search) ||
      p.phone.includes(search);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.inTreatment) ||
      (statusFilter === "inactive" && !p.inTreatment);

    return matchesSearch && matchesStatus;
  });

  const handleSavePatient = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;

    const newHistoriaId = `PAC-${String(patients.length + 1).padStart(3, "0")}`;

    const newRecord: PatientRecord = {
      id: `p_${Date.now()}`,
      historiaId: newHistoriaId,
      ...formData,
    };

    // Guardar en Supabase si está disponible
    try {
      await supabase.from("patients").insert([
        {
          historia_id: newHistoriaId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          dni_nie: formData.dniNie,
          dob: formData.dob || null,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          in_treatment: formData.inTreatment,
          important_diseases: formData.importantDiseases,
          previous_operations: formData.previousOperations,
          allergies: formData.allergies,
          current_medication: formData.currentMedication,
          treatment_plan: formData.treatmentPlan,
        },
      ]);
    } catch (e) {
      console.log("Guardado local.");
    }

    setPatients([newRecord, ...patients]);
    setIsModalOpen(false);
    // Reset form
    setFormData({
      firstName: "",
      lastName: "",
      dniNie: "",
      dob: "",
      gender: "Femenino",
      phone: "",
      email: "",
      address: "",
      inTreatment: true,
      importantDiseases: "",
      previousOperations: "",
      allergies: "",
      currentMedication: "",
      treatmentPlan: "",
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Fichas de Pacientes
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-700">
              {filteredPatients.length} Registrados
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Directorio médico centralizado, historial clínico, antecedentes y planes de tratamiento.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-11 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-lg shadow-rose-500/20 gap-2 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Paciente</span>
        </Button>
      </div>

      {/* Controls Bar: Search, Status Filter & View Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Nombre, DNI, Historia o Teléfono..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter((val as any) || "all")}
          >
            <SelectTrigger className="h-10 w-[170px] bg-slate-50 border-slate-200 text-xs font-semibold rounded-xl">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <SelectValue placeholder="Estado Paciente" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Pacientes</SelectItem>
              <SelectItem value="active">En Tratamiento</SelectItem>
              <SelectItem value="inactive">Alta / Inactivos</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle (Grid vs List) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Vista en Tarjetas"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Vista en Listado"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Listado</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- VISTA EN TARJETAS (GRID) ---------------- */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <Card
              key={patient.id}
              className="border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl bg-white overflow-hidden flex flex-col justify-between group"
            >
              <CardContent className="p-6 space-y-4">
                {/* Header Profile Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-rose-500/20 shrink-0">
                      {patient.firstName[0]}
                      {patient.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-rose-600 transition-colors">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {patient.historiaId}
                        </span>
                        <span className="text-xs text-slate-500">DNI: {patient.dniNie}</span>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      patient.inTreatment
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {patient.inTreatment ? "En Tratamiento" : "Alta"}
                  </Badge>
                </div>

                {/* Contact Data */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                </div>

                {/* Medical Alerts (Allergies & Antecedents) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  {patient.allergies && patient.allergies.toLowerCase() !== "ninguna" && (
                    <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 font-semibold">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Alergia: {patient.allergies}</span>
                    </div>
                  )}

                  {patient.importantDiseases && patient.importantDiseases.toLowerCase() !== "ninguna" && (
                    <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 font-medium">
                      <Activity className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span className="truncate">{patient.importantDiseases}</span>
                    </div>
                  )}
                </div>

                {/* Treatment Plan snippet */}
                {patient.treatmentPlan && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Stethoscope className="h-3 w-3 text-rose-500" /> Plan de Tratamiento
                    </span>
                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      {patient.treatmentPlan}
                    </p>
                  </div>
                )}
              </CardContent>

              {/* Card Footer Action */}
              <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Ficha Médica</span>
                <Link
                  href={`/patients/${patient.id}`}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                >
                  <span>Ver Ficha Completa</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---------------- VISTA EN LISTADO (TABLE) ---------------- */}
      {viewMode === "list" && (
        <Card className="border-0 shadow-xl rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Historia ID</th>
                    <th className="py-3.5 px-4">Paciente</th>
                    <th className="py-3.5 px-4">DNI / NIE</th>
                    <th className="py-3.5 px-4">Teléfono & Email</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Alertas Médicas</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                          {patient.historiaId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <span className="text-[10px] text-slate-400">{patient.gender} · {patient.address}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {patient.dniNie}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Phone className="h-3 w-3 text-slate-400" /> {patient.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Mail className="h-3 w-3 text-slate-400" /> {patient.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                            patient.inTreatment
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {patient.inTreatment ? "En Tratamiento" : "Alta"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        {patient.allergies && patient.allergies.toLowerCase() !== "ninguna" ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-semibold text-[11px] mr-1">
                            Alergia: {patient.allergies}
                          </span>
                        ) : null}
                        {patient.importantDiseases && patient.importantDiseases.toLowerCase() !== "ninguna" ? (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium text-[11px]">
                            {patient.importantDiseases}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sin antecedentes</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/patients/${patient.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs font-semibold rounded-lg border-slate-300 gap-1 hover:border-rose-300 hover:text-rose-600">
                            Ver Ficha <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------- MODAL NUEVO PACIENTE ---------------- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white border border-slate-200 shadow-2xl opacity-100">
          <DialogHeader className="pb-2 border-b border-slate-100">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-rose-500" />
              Crear Ficha Completa de Nuevo Paciente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Información Personal */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-rose-600">
                1. Datos Personales & Contacto
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Nombre *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ej. Ana Maria"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Apellidos *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ej. Martínez Fernández"
                    className="text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">DNI / NIE</Label>
                  <Input
                    value={formData.dniNie}
                    onChange={(e) => setFormData({ ...formData, dniNie: e.target.value })}
                    placeholder="12345678X"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Fecha Nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Género</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val) => val && setFormData({ ...formData, gender: val })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Correo Electrónico</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@paciente.com"
                    className="text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700">Dirección</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle, Número, Ciudad"
                  className="text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Antecedentes Médicos / Anamnesis */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-rose-600">
                2. Anamnesis & Historial Médico (Alertas)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> Alergias Conocidas
                  </Label>
                  <Input
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="Ej. Penicilina, Látex, Ninguna"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-amber-500" /> Enfermedades / Antecedentes
                  </Label>
                  <Input
                    value={formData.importantDiseases}
                    onChange={(e) => setFormData({ ...formData, importantDiseases: e.target.value })}
                    placeholder="Ej. Hipertensión, Diabetes, Ninguna"
                    className="text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 flex items-center gap-1">
                    <Pill className="h-3.5 w-3.5 text-purple-500" /> Medicación Habitual
                  </Label>
                  <Input
                    value={formData.currentMedication}
                    onChange={(e) => setFormData({ ...formData, currentMedication: e.target.value })}
                    placeholder="Ej. Sintrom, Eutirox"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Cirugías / Operaciones Previas</Label>
                  <Input
                    value={formData.previousOperations}
                    onChange={(e) => setFormData({ ...formData, previousOperations: e.target.value })}
                    placeholder="Ej. Apendicectomía 2020"
                    className="text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Plan de Tratamiento Inicial */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-rose-600 flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5 text-rose-500" /> 3. Plan de Tratamiento Inicial
              </h4>
              <Textarea
                value={formData.treatmentPlan}
                onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                placeholder="Describe el plan acordado con la Dra. (ej. Ortodoncia invisible, higienes previas, limpieza...)"
                className="text-xs rounded-lg h-20"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleSavePatient}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20"
            >
              Guardar Ficha en Base de Datos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
