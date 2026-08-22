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
  Stethoscope,
  Tag as TagIcon,
  Building2,
  ArrowUpDown
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
import { TagItem, getTagStyle } from "@/components/patients/tag-input";
import { cn } from "@/lib/utils";

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
  tags?: TagItem[];
  clinicIds?: string[];
  clinicNames?: string[];
};

import { useClinic } from "@/context/clinic-context";

export default function PatientsPage() {
  const { selectedClinicId, setSelectedClinicId } = useClinic();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [clinicsCatalog, setClinicsCatalog] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const clinicFilter = selectedClinicId;
  const setClinicFilter = setSelectedClinicId;
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("historia-asc");

  const clinicFilterItems = [{ value: "all", label: "Todas las Clínicas" }, ...clinicsCatalog.map((c) => ({ value: c.id, label: c.name }))];
  const statusFilterItems = [
    { value: "all", label: "Todos los Estados" },
    { value: "active", label: "En Tratamiento" },
    { value: "inactive", label: "Alta / Inactivos" },
  ];
  const sortItems = [
    { value: "historia-asc", label: "Historia ID (Asc)" },
    { value: "historia-desc", label: "Historia ID (Desc)" },
    { value: "name-asc", label: "Nombre (A - Z)" },
    { value: "name-desc", label: "Nombre (Z - A)" },
    { value: "clinic-asc", label: "Clínica / Sede" },
    { value: "newest", label: "Más Recientes" },
  ];
  const genderItems = [
    { value: "Femenino", label: "Femenino" },
    { value: "Masculino", label: "Masculino" },
    { value: "Otro", label: "Otro" },
  ];

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

  // Cargar pacientes, clínicas y etiquetas desde Supabase
  useEffect(() => {
    async function loadPatients() {
      setLoading(true);
      try {
        // 1. Fetch All Tags for Filter Bar
        const { data: tagsData } = await (supabase as any).from("tags").select("*").order("name", { ascending: true });
        if (tagsData) setAllTags(tagsData as TagItem[]);

        // 2. Fetch Clinics Catalog
        const { data: clinicsData } = await (supabase as any).from("clinics").select("id, name").order("name", { ascending: true });
        if (clinicsData) setClinicsCatalog(clinicsData);

        // 3. Fetch Appointments to map patients to clinics
        const { data: apptsData } = await (supabase as any).from("appointments").select("patient_id, clinic_id, clinics(id, name)");
        const patientClinicsMap: Record<string, { ids: Set<string>; names: Set<string> }> = {};
        if (apptsData) {
          for (const appt of apptsData) {
            if (!appt.patient_id) continue;
            if (!patientClinicsMap[appt.patient_id]) {
              patientClinicsMap[appt.patient_id] = { ids: new Set(), names: new Set() };
            }
            if (appt.clinic_id) patientClinicsMap[appt.patient_id].ids.add(appt.clinic_id);
            if (appt.clinics?.name) patientClinicsMap[appt.patient_id].names.add(appt.clinics.name);
          }
        }

        // 4. Fetch Patients with patient_tags
        const { data, error } = await (supabase as any)
          .from("patients")
          .select(`*, patient_tags ( tags ( id, name, color ) )`)
          .order("created_at", { ascending: false });

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

        if (!error && data) {
          const mapped: PatientRecord[] = data.map((p: any) => {
            const cData = patientClinicsMap[p.id] || { ids: new Set(), names: new Set() };
            return {
              id: p.id,
              historiaId: p.historia_id || `PAC-${p.id.slice(0, 3)}`,
              firstName: toTitleCase(p.first_name),
              lastName: toTitleCase(p.last_name),
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
              createdAt: p.created_at || "",
              tags: p.patient_tags ? p.patient_tags.map((pt: any) => pt.tags).filter(Boolean) : [],
              clinicIds: Array.from(cData.ids),
              clinicNames: Array.from(cData.names),
            };
          });
          setPatients(mapped);
        }
      } catch (err) {
        console.error("Error cargando pacientes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  // Filtrado y Ordenación de pacientes
  const filteredPatients = patients
    .filter((p) => {
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

      const matchesTag =
        selectedTagFilter === "all" ||
        p.tags?.some((t) => t.id === selectedTagFilter || t.name === selectedTagFilter);

      const matchesClinic =
        clinicFilter === "all" ||
        (p.clinicIds && p.clinicIds.includes(clinicFilter));

      return matchesSearch && matchesStatus && matchesTag && matchesClinic;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      if (sortBy === "name-desc") {
        return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
      }
      if (sortBy === "historia-asc") {
        return a.historiaId.localeCompare(b.historiaId, undefined, { numeric: true });
      }
      if (sortBy === "historia-desc") {
        return b.historiaId.localeCompare(a.historiaId, undefined, { numeric: true });
      }
      if (sortBy === "clinic-asc") {
        const cA = a.clinicNames?.[0] || "ZZZ";
        const cB = b.clinicNames?.[0] || "ZZZ";
        return cA.localeCompare(cB);
      }
      if (sortBy === "newest") {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      }
      return 0;
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Fichas de Pacientes
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary">
              {filteredPatients.length} Registrados
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Directorio médico centralizado, historial clínico, antecedentes y planes de tratamiento.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-lg shadow-primary/20 gap-2 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Paciente</span>
        </Button>
      </div>

      {/* Controls Bar: Search, Clinic Filter, Status Filter, Sort & View Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex-wrap">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Nombre, DNI, Historia o Teléfono..."
              className="pl-10 h-10 bg-muted/40 border-border rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          {/* Clinic Filter */}
          <Select
            items={clinicFilterItems}
            value={clinicFilter}
            onValueChange={(val) => setClinicFilter(val || "all")}
          >
            <SelectTrigger className="h-10 w-[180px] bg-muted/40 border-border text-xs font-semibold rounded-xl">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Clínica / Sede" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Clínicas</SelectItem>
              {clinicsCatalog.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            items={statusFilterItems}
            value={statusFilter}
            onValueChange={(val) => setStatusFilter((val as any) || "all")}
          >
            <SelectTrigger className="h-10 w-[160px] bg-muted/40 border-border text-xs font-semibold rounded-xl">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Estado Paciente" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="active">En Tratamiento</SelectItem>
              <SelectItem value="inactive">Alta / Inactivos</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select
            items={sortItems}
            value={sortBy}
            onValueChange={(val) => setSortBy(val || "historia-asc")}
          >
            <SelectTrigger className="h-10 w-[165px] bg-muted/40 border-border text-xs font-semibold rounded-xl">
              <div className="flex items-center gap-2 truncate">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Ordenar Por" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="historia-asc">Historia ID (Asc)</SelectItem>
              <SelectItem value="historia-desc">Historia ID (Desc)</SelectItem>
              <SelectItem value="name-asc">Nombre (A - Z)</SelectItem>
              <SelectItem value="name-desc">Nombre (Z - A)</SelectItem>
              <SelectItem value="clinic-asc">Clínica / Sede</SelectItem>
              <SelectItem value="newest">Más Recientes</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle (Grid vs List) */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista en Listado"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Listado</span>
            </button>
          </div>
        </div>

        {/* Tag Filter Bar (WordPress Style AJAX Filter) */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2.5 border-t border-border/60 w-full text-xs">
            <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1 flex items-center gap-1">
              <TagIcon className="h-3 w-3 text-primary" /> Etiquetas:
            </span>
            <button
              onClick={() => setSelectedTagFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold border transition-all shrink-0 text-xs",
                selectedTagFilter === "all"
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              Todas ({patients.length})
            </button>
            {allTags.map((tag) => {
              const style = getTagStyle(tag.color);
              const isSelected = selectedTagFilter === tag.id;
              const count = patients.filter((p) => p.tags?.some((t) => t.id === tag.id)).length;
              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagFilter(isSelected ? "all" : tag.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold border transition-all flex items-center gap-1 shrink-0 text-xs",
                    isSelected ? "ring-2 ring-primary/60 font-extrabold shadow-sm" : "opacity-80 hover:opacity-100",
                    style.bg,
                    style.text,
                    style.border
                  )}
                >
                  <TagIcon className="h-3 w-3 opacity-70" />
                  {tag.name}
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- VISTA EN TARJETAS (GRID) ---------------- */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <Card
              key={patient.id}
              className="border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl bg-card overflow-hidden flex flex-col justify-between group"
            >
              <CardContent className="p-6 space-y-4">
                {/* Header Profile Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-primary/70 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-primary/20 shrink-0">
                      {patient.firstName[0]}
                      {patient.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-primary transition-colors">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                          {patient.historiaId}
                        </span>
                        <span className="text-xs text-muted-foreground">DNI: {patient.dniNie}</span>
                      </div>
                      {patient.clinicNames && patient.clinicNames.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {patient.clinicNames.map((cName) => (
                            <span key={cName} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-info/10 text-info border border-info/20">
                              <Building2 className="h-2.5 w-2.5 text-info shrink-0" />
                              {cName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      patient.inTreatment
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {patient.inTreatment ? "En Tratamiento" : "Alta"}
                  </Badge>
                </div>

                {/* Contact Data */}
                <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                </div>

                {/* Medical Alerts (Allergies & Antecedents) */}
                <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                  {patient.allergies && patient.allergies.toLowerCase() !== "ninguna" && (
                    <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 font-semibold">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Alergia: {patient.allergies}</span>
                    </div>
                  )}

                  {patient.importantDiseases && patient.importantDiseases.toLowerCase() !== "ninguna" && (
                    <div className="flex items-center gap-1.5 text-warning bg-warning/10 px-2.5 py-1 rounded-lg border border-warning/20 font-medium">
                      <Activity className="h-3.5 w-3.5 shrink-0 text-warning" />
                      <span className="truncate">{patient.importantDiseases}</span>
                    </div>
                  )}
                </div>

                {/* Patient Tags */}
                {patient.tags && patient.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
                    {patient.tags.map((t) => {
                      const style = getTagStyle(t.color);
                      return (
                        <span
                          key={t.id}
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            style.bg, style.text, style.border
                          )}
                        >
                          <TagIcon className="h-2.5 w-2.5 opacity-70" />
                          {t.name}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Treatment Plan snippet */}
                {patient.treatmentPlan && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                      <Stethoscope className="h-3 w-3 text-primary" /> Plan de Tratamiento
                    </span>
                    <p className="text-xs text-foreground font-medium line-clamp-2">
                      {patient.treatmentPlan}
                    </p>
                  </div>
                )}
              </CardContent>

              {/* Card Footer Action */}
              <div className="px-6 py-3 bg-muted/70 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-medium">Ficha Médica</span>
                <Link
                  href={`/patients/${patient.id}`}
                  className="text-xs font-bold text-primary hover:text-primary/90 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
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
        <Card className="border-0 shadow-xl rounded-2xl bg-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Historia ID</th>
                    <th className="py-3.5 px-4">Paciente</th>
                    <th className="py-3.5 px-4">Clínica / Sede</th>
                    <th className="py-3.5 px-4">DNI / NIE</th>
                    <th className="py-3.5 px-4">Teléfono & Email</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Alertas Médicas</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground font-medium">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-muted/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {patient.historiaId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground text-sm">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{patient.gender} · {patient.address}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                        {patient.dniNie}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {patient.clinicNames && patient.clinicNames.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {patient.clinicNames.map((cName) => (
                              <span key={cName} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-info/10 text-info border border-info/20">
                                <Building2 className="h-2.5 w-2.5 text-info shrink-0" />
                                {cName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">Sin sede</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Phone className="h-3 w-3 text-muted-foreground" /> {patient.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3 text-muted-foreground" /> {patient.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                            patient.inTreatment
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {patient.inTreatment ? "En Tratamiento" : "Alta"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        {patient.allergies && patient.allergies.toLowerCase() !== "ninguna" ? (
                          <span className="text-primary bg-primary/10 px-2 py-0.5 rounded font-semibold text-[11px] mr-1">
                            Alergia: {patient.allergies}
                          </span>
                        ) : null}
                        {patient.importantDiseases && patient.importantDiseases.toLowerCase() !== "ninguna" ? (
                          <span className="text-warning bg-warning/10 px-2 py-0.5 rounded font-medium text-[11px]">
                            {patient.importantDiseases}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Sin antecedentes</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/patients/${patient.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs font-semibold rounded-lg border-input gap-1 hover:border-primary/40 hover:text-primary">
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border border-border shadow-2xl opacity-100">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Crear Ficha Completa de Nuevo Paciente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Información Personal */}
            <div className="space-y-2">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] text-primary">
                1. Datos Personales & Contacto
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nombre *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ej. Ana Maria"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Apellidos *</Label>
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
                  <Label className="text-xs text-muted-foreground">DNI / NIE</Label>
                  <Input
                    value={formData.dniNie}
                    onChange={(e) => setFormData({ ...formData, dniNie: e.target.value })}
                    placeholder="12345678X"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha Nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Género</Label>
                  <Select
                    items={genderItems}
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
                  <Label className="text-xs text-muted-foreground">Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Correo Electrónico</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@paciente.com"
                    className="text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dirección</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle, Número, Ciudad"
                  className="text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Antecedentes Médicos / Anamnesis */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] text-primary">
                2. Anamnesis & Historial Médico (Alertas)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Alergias Conocidas
                  </Label>
                  <Input
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="Ej. Penicilina, Látex, Ninguna"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-warning" /> Enfermedades / Antecedentes
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
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Pill className="h-3.5 w-3.5 text-primary/80" /> Medicación Habitual
                  </Label>
                  <Input
                    value={formData.currentMedication}
                    onChange={(e) => setFormData({ ...formData, currentMedication: e.target.value })}
                    placeholder="Ej. Sintrom, Eutirox"
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cirugías / Operaciones Previas</Label>
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
            <div className="space-y-2 pt-2 border-t border-border/60">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] text-primary flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5 text-primary" /> 3. Plan de Tratamiento Inicial
              </h4>
              <Textarea
                value={formData.treatmentPlan}
                onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                placeholder="Describe el plan acordado con la Dra. (ej. Ortodoncia invisible, higienes previas, limpieza...)"
                className="text-xs rounded-lg h-20"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleSavePatient}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20"
            >
              Guardar Ficha en Base de Datos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}