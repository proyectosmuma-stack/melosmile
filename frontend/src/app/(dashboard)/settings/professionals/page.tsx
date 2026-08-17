"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Stethoscope, Plus, Edit2, Trash2, Loader2, AlertCircle, Phone, Mail, Building2,
  ExternalLink, LayoutGrid, List, MapPin, FileCheck, Search
} from "lucide-react";
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
};

type ProfessionalClinicMap = Record<string, { clinic_id: string; is_primary: boolean }[]>;

const ALL_SPECIALTIES = [
  "Odontología General", "Ortodoncia", "Endodoncia", "Periodoncia",
  "Implantología", "Estética Dental", "Prostodoncia", "Odontopediatría", "Cirugía Oral"
];

export default function ProfessionalsSettingsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [proClinicsMap, setProClinicsMap] = useState<ProfessionalClinicMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // View mode state (Cards vs List)
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [search, setSearch] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [proToDelete, setProToDelete] = useState<Professional | null>(null);
  const [editingPro, setEditingPro] = useState<Professional | null>(null);

  // Form states (Unified fields with Patient)
  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fDniNie, setFDniNie] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fAddress, setFAddress] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [primaryClinicId, setPrimaryClinicId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: pData }, { data: cData }, { data: pcData }] = await Promise.all([
        supabase.from("professionals").select("id, first_name, last_name, specialty, phone, email, dni_nie, address, clinic_id").order("first_name"),
        (supabase as any).from("clinics").select("id, name").order("name"),
        (supabase as any).from("professional_clinics").select("professional_id, clinic_id, is_primary"),
      ]);

      if (pData) setProfessionals(pData as any);
      if (cData) setClinics(cData);

      if (pcData) {
        const map: ProfessionalClinicMap = {};
        pcData.forEach((row: any) => {
          if (!map[row.professional_id]) map[row.professional_id] = [];
          map[row.professional_id].push({ clinic_id: row.clinic_id, is_primary: row.is_primary });
        });
        setProClinicsMap(map);
      }
    } catch (e) {
      console.error("Error loading professionals:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditingPro(null);
    setFFirstName(""); setFLastName(""); setFDniNie(""); setFPhone("");
    setFEmail(""); setFAddress(""); setSelectedSpecialties(["Odontología General"]);
    setSelectedClinicIds([]); setPrimaryClinicId(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Professional) => {
    setEditingPro(p);
    setFFirstName(p.first_name); setFLastName(p.last_name);
    setFDniNie(p.dni_nie || ""); setFPhone(p.phone || "");
    setFEmail(p.email || ""); setFAddress(p.address || "");

    // Multi-specialties
    if (p.specialty) {
      const parts = p.specialty.split(",").map(s => s.trim()).filter(Boolean);
      setSelectedSpecialties(parts);
    } else {
      setSelectedSpecialties([]);
    }

    // Multi-clinics
    const assigned = proClinicsMap[p.id] || [];
    if (assigned.length > 0) {
      setSelectedClinicIds(assigned.map(a => a.clinic_id));
      const prim = assigned.find(a => a.is_primary);
      setPrimaryClinicId(prim ? prim.clinic_id : assigned[0].clinic_id);
    } else if (p.clinic_id) {
      setSelectedClinicIds([p.clinic_id]);
      setPrimaryClinicId(p.clinic_id);
    } else {
      setSelectedClinicIds([]);
      setPrimaryClinicId(null);
    }

    setDialogOpen(true);
  };

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleSave = async () => {
    if (!fFirstName.trim() || !fLastName.trim()) return;
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

      let proId = editingPro?.id;

      if (editingPro) {
        await supabase.from("professionals").update(payload as any).eq("id", editingPro.id);
      } else {
        const { data: newPro, error: newErr } = await supabase
          .from("professionals")
          .insert(payload as any)
          .select("id")
          .single();
        if (newErr || !newPro) throw new Error(newErr?.message || "Error al crear profesional");
        proId = newPro.id;
      }

      if (proId) {
        await (supabase as any).from("professional_clinics").delete().eq("professional_id", proId);
        if (selectedClinicIds.length > 0) {
          const links = selectedClinicIds.map(cid => ({
            professional_id: proId,
            clinic_id: cid,
            is_primary: primaryClinicId === cid,
          }));
          await (supabase as any).from("professional_clinics").insert(links);
        }
      }

      setDialogOpen(false);
      await fetchData();
    } catch (e: any) {
      console.error("Error saving professional:", e);
    } finally {
      setSaving(false);
    }
  };

  const promptDelete = (p: Professional) => {
    setProToDelete(p);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!proToDelete) return;
    setSaving(true);
    try {
      await supabase.from("professionals").delete().eq("id", proToDelete.id);
      setDeleteConfirmOpen(false);
      setProToDelete(null);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const filteredProfessionals = professionals.filter(p => {
    const q = search.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const spec = (p.specialty || "").toLowerCase();
    return !q || fullName.includes(q) || spec.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando profesionales...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-success" /> Profesionales
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Doctoras y colaboradores del equipo Melosmile.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "cards" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista de Lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" /> Nuevo Profesional
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, apellido o especialidad..."
          className="pl-9 rounded-xl"
        />
      </div>

      {/* CARDS VIEW */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProfessionals.length === 0 && (
            <div className="col-span-2">
              <Card className="rounded-2xl border-dashed border-border">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No se encontraron profesionales.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {filteredProfessionals.map((p) => {
            const assignedLinks = proClinicsMap[p.id] || [];
            let assignedClinics = assignedLinks
              .map(link => {
                const c = clinics.find(cl => cl.id === link.clinic_id);
                return c ? { name: c.name, is_primary: link.is_primary } : null;
              })
              .filter(Boolean);

            if (assignedClinics.length === 0 && p.clinic_id) {
              const c = clinics.find(cl => cl.id === p.clinic_id);
              if (c) assignedClinics = [{ name: c.name, is_primary: true }];
            }

            const specialtiesList = (p.specialty || "").split(",").map(s => s.trim()).filter(Boolean);

            return (
              <Card key={p.id} className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                      {p.first_name[0]}{p.last_name[0]}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        Dra. {p.first_name} {p.last_name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {specialtiesList.length === 0 ? (
                          <span className="text-xs text-muted-foreground font-medium">Sin especialidad</span>
                        ) : (
                          specialtiesList.map((s, i) => (
                            <Badge key={i} className="bg-success/10 text-success border-success/30 text-[10px] font-semibold">
                              {s}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/settings/professionals/${p.id}`}>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-xl text-xs gap-1 font-semibold border-border text-foreground hover:bg-muted/40">
                        <span>Ficha</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => promptDelete(p)} className="h-8 w-8 rounded-xl text-primary/80 hover:text-primary hover:bg-primary/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-2 pb-4 border-t border-border/60 space-y-2.5">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Sedes Vinculadas:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedClinics.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Todas las sedes</span>
                      ) : (
                        assignedClinics.map((c: any, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                              c.is_primary
                                ? "bg-info/10 border-info/30 text-info"
                                : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {c.name}
                            {c.is_primary && <span className="text-[10px] text-info font-bold ml-0.5">✓</span>}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {(p.phone || p.email || p.dni_nie) && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                      {p.dni_nie && <span className="flex items-center gap-1 font-mono text-[11px]"><FileCheck className="h-3 w-3 text-muted-foreground" />{p.dni_nie}</span>}
                      {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{p.phone}</span>}
                      {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{p.email}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* LIST VIEW TABLE */}
      {viewMode === "list" && (
        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-4">Profesional</th>
                  <th className="py-3 px-4">Especialidades</th>
                  <th className="py-3 px-4">Sedes Vinculadas</th>
                  <th className="py-3 px-4">DNI / NIE</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium text-foreground">
                {filteredProfessionals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No se encontraron profesionales.
                    </td>
                  </tr>
                ) : (
                  filteredProfessionals.map((p) => {
                    const assignedLinks = proClinicsMap[p.id] || [];
                    let assignedClinics = assignedLinks
                      .map(link => {
                        const c = clinics.find(cl => cl.id === link.clinic_id);
                        return c ? { name: c.name, is_primary: link.is_primary } : null;
                      })
                      .filter(Boolean);

                    if (assignedClinics.length === 0 && p.clinic_id) {
                      const c = clinics.find(cl => cl.id === p.clinic_id);
                      if (c) assignedClinics = [{ name: c.name, is_primary: true }];
                    }

                    const specialtiesList = (p.specialty || "").split(",").map(s => s.trim()).filter(Boolean);

                    return (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {p.first_name[0]}{p.last_name[0]}
                            </div>
                            <span className="font-bold text-foreground text-sm">
                              Dra. {p.first_name} {p.last_name}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {specialtiesList.map((s, i) => (
                              <Badge key={i} className="bg-success/10 text-success border-success/30 text-[10px] font-semibold">
                                {s}
                              </Badge>
                            ))}
                            {specialtiesList.length === 0 && <span className="text-muted-foreground text-xs">-</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {assignedClinics.map((c: any, i) => (
                              <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                                c.is_primary ? "bg-info/10 border-info/30 text-info" : "bg-muted border-border text-muted-foreground"
                              }`}>
                                {c.name} {c.is_primary && "✓"}
                              </span>
                            ))}
                            {assignedClinics.length === 0 && <span className="text-muted-foreground text-xs">Todas</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {p.dni_nie || "-"}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {p.phone && <div className="flex items-center gap-1 text-foreground"><Phone className="h-3 w-3 text-muted-foreground" />{p.phone}</div>}
                            {p.email && <div className="flex items-center gap-1 text-muted-foreground">{p.email}</div>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/settings/professionals/${p.id}`}>
                              <Button variant="outline" size="sm" className="h-7 px-2 rounded-lg text-xs gap-1">
                                <span>Ficha</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-7 w-7 rounded-lg text-muted-foreground">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => promptDelete(p)} className="h-7 w-7 rounded-lg text-primary/80">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Dialog (Unified Parameters with Patient) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-card shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-success" />
              {editingPro ? "Editar Ficha de Profesional" : "Nuevo Profesional"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre & Apellidos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Nombre *</Label>
                <Input value={fFirstName} onChange={(e) => setFFirstName(e.target.value)} placeholder="Osly" className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Apellidos *</Label>
                <Input value={fLastName} onChange={(e) => setFLastName(e.target.value)} placeholder="Melo" className="rounded-lg" />
              </div>
            </div>

            {/* DNI / NIE & Teléfono */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">DNI / NIE / NIF</Label>
                <Input value={fDniNie} onChange={(e) => setFDniNie(e.target.value)} placeholder="12345678X" className="rounded-lg font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Teléfono</Label>
                <Input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="+34 600 000 000" className="rounded-lg" />
              </div>
            </div>

            {/* Email & Dirección */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label>
                <Input value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="dra@melosmile.com" className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Dirección</Label>
                <Input value={fAddress} onChange={(e) => setFAddress(e.target.value)} placeholder="Calle Velázquez 12, Madrid" className="rounded-lg" />
              </div>
            </div>

            {/* Multi-Specialty Chips Selection */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <Label className="text-xs font-semibold text-foreground block">Especialidades (Selección Múltiple)</Label>
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
                          ? "bg-success text-white border-success shadow-sm"
                          : "bg-muted/40 text-muted-foreground border-border hover:border-success"
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
              allClinics={clinics}
              selectedClinicIds={selectedClinicIds}
              primaryClinicId={primaryClinicId}
              onChangeSelected={setSelectedClinicIds}
              onChangePrimary={setPrimaryClinicId}
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 font-bold shadow-md shadow-primary/20">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Profesional
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-card shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ¿Estás seguro de que deseas eliminar al profesional <span className="font-bold text-foreground">&quot;Dra. {proToDelete?.first_name} {proToDelete?.last_name}&quot;</span>?
          </p>
          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={confirmDelete} disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 font-bold shadow-md shadow-primary/20">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}