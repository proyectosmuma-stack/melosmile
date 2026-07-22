"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Plus, Edit2, Trash2, Loader2, AlertCircle, Phone, Mail, Building2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Professional = {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  clinic_id: string | null;
};

type Clinic = { id: string; name: string; };

type ProfessionalClinicMap = Record<string, { clinic_id: string; is_primary: boolean }[]>;

export default function ProfessionalsSettingsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [proClinicsMap, setProClinicsMap] = useState<ProfessionalClinicMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [proToDelete, setProToDelete] = useState<Professional | null>(null);
  const [editingPro, setEditingPro] = useState<Professional | null>(null);

  // Form states
  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fSpecialty, setFSpecialty] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [primaryClinicId, setPrimaryClinicId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: pData }, { data: cData }, { data: pcData }] = await Promise.all([
        supabase.from("professionals").select("id, first_name, last_name, specialty, phone, email, clinic_id").order("first_name"),
        (supabase as any).from("clinics").select("id, name").order("name"),
        (supabase as any).from("professional_clinics").select("professional_id, clinic_id, is_primary"),
      ]);

      if (pData) setProfessionals(pData);
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
    setFFirstName(""); setFLastName(""); setFSpecialty(""); setFPhone("");
    setFEmail(""); setSelectedClinicIds([]); setPrimaryClinicId(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Professional) => {
    setEditingPro(p);
    setFFirstName(p.first_name); setFLastName(p.last_name);
    setFSpecialty(p.specialty || ""); setFPhone(p.phone || "");
    setFEmail(p.email || "");

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

  const toggleClinic = (id: string) => {
    setSelectedClinicIds(prev => {
      if (prev.includes(id)) {
        if (primaryClinicId === id) setPrimaryClinicId(null);
        return prev.filter(c => c !== id);
      } else {
        if (!primaryClinicId) setPrimaryClinicId(id);
        return [...prev, id];
      }
    });
  };

  const handleSave = async () => {
    if (!fFirstName.trim() || !fLastName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        first_name: fFirstName,
        last_name: fLastName,
        specialty: fSpecialty || null,
        phone: fPhone || null,
        email: fEmail || null,
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
        // Clear old clinic links
        await (supabase as any).from("professional_clinics").delete().eq("professional_id", proId);

        // Insert multi-clinic links
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

  const SPECIALTIES = [
    "Odontología General", "Ortodoncia", "Endodoncia", "Periodoncia",
    "Implantología", "Estética Dental", "Prostodoncia", "Odontopediatría", "Cirugía Oral"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span className="ml-3 text-slate-600">Cargando profesionales...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-emerald-500" /> Profesionales
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Doctoras y colaboradores del equipo Melosmile (asociados por sede).
          </p>
        </div>
        <Button onClick={openAdd} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-2 shadow-md shadow-rose-500/20">
          <Plus className="h-4 w-4" /> Nuevo Profesional
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {professionals.length === 0 && (
          <div className="col-span-2">
            <Card className="rounded-2xl border-dashed border-slate-200">
              <CardContent className="p-8 text-center text-slate-400">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay profesionales registrados.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {professionals.map((p) => {
          const assignedLinks = proClinicsMap[p.id] || [];
          const assignedClinics = assignedLinks
            .map(link => {
              const c = clinics.find(cl => cl.id === link.clinic_id);
              return c ? { ...c, is_primary: link.is_primary } : null;
            })
            .filter(Boolean);

          return (
            <Card key={p.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      Dra. {p.first_name} {p.last_name}
                    </CardTitle>
                    <p className="text-xs text-slate-500 font-medium">{p.specialty || "Sin especialidad"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/settings/professionals/${p.id}`}>
                    <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-xl text-xs gap-1 font-semibold border-slate-200 text-slate-700 hover:bg-slate-50">
                      <span>Ficha</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => promptDelete(p)} className="h-8 w-8 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-2 pb-4 border-t border-slate-100 space-y-2.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sedes Vinculadas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedClinics.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Todas las sedes</span>
                    ) : (
                      assignedClinics.map((c: any) => (
                        <span
                          key={c.id}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                            c.is_primary
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                              : "bg-slate-100 border-slate-200 text-slate-600"
                          }`}
                        >
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {c.name}
                          {c.is_primary && <span className="text-[10px] text-emerald-600 font-bold ml-0.5">★</span>}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {(p.phone || p.email) && (
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                    {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" />{p.email}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-500" />
              {editingPro ? "Editar Profesional" : "Nuevo Profesional"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nombre</Label>
                <Input value={fFirstName} onChange={(e) => setFFirstName(e.target.value)} placeholder="Osly" className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Apellido</Label>
                <Input value={fLastName} onChange={(e) => setFLastName(e.target.value)} placeholder="Melo" className="rounded-lg" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Especialidad Principal</Label>
              <Select value={fSpecialty} onValueChange={(v) => setFSpecialty(v ?? "")}>
                <SelectTrigger className="rounded-lg text-sm"><SelectValue placeholder="Seleccionar especialidad..." /></SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Phone className="h-3 w-3" />Teléfono</Label>
                <Input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="+34 600 000 000" className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label>
                <Input value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="dra@melosmile.com" className="rounded-lg" />
              </div>
            </div>

            {/* Multi-Clinic Selection Checkboxes */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Sedes / Clínicas Asignadas (Selección Múltiple)</span>
              </Label>
              <p className="text-[11px] text-slate-400">Selecciona las sedes donde ejerce la doctora. Marca la principal.</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {clinics.map((clinic) => {
                  const isSelected = selectedClinicIds.includes(clinic.id);
                  const isPrimary = primaryClinicId === clinic.id;

                  return (
                    <div
                      key={clinic.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-emerald-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleClinic(clinic.id)}
                        className="accent-emerald-500 cursor-pointer"
                      />
                      <span onClick={() => toggleClinic(clinic.id)}>{clinic.name}</span>
                      {isSelected && (
                        <button
                          type="button"
                          onClick={() => setPrimaryClinicId(isPrimary ? null : clinic.id)}
                          className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-lg font-bold border transition-all ${
                            isPrimary
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          {isPrimary ? "Principal ★" : "Principal"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Profesional
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            ¿Estás seguro de que deseas eliminar al profesional <span className="font-bold text-slate-900">&quot;Dra. {proToDelete?.first_name} {proToDelete?.last_name}&quot;</span>?
          </p>
          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={confirmDelete} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-2 font-bold shadow-md shadow-rose-600/20">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
