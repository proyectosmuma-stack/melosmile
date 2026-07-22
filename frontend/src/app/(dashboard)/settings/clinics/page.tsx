"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Building2, Plus, Edit2, Trash2, Loader2, Save, Phone, Mail,
  MapPin, Percent, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Clinic = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  color_hex: string | null;
  base_commission_pct: number | null;
};

type Family = { id: string; name: string; color_hex: string; };

type CommissionRule = {
  id: string;
  clinic_id: string;
  family_id: string;
  commission_pct: number;
  lab_discount_pct: number;
  family?: Family;
};

const COLOR_OPTIONS = [
  { label: "Azul", value: "#3b82f6" },
  { label: "Esmeralda", value: "#10b981" },
  { label: "Púrpura", value: "#8b5cf6" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Ámbar", value: "#f59e0b" },
  { label: "Índigo", value: "#6366f1" },
];

export default function ClinicsSettingsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clinicToDelete, setClinicToDelete] = useState<Clinic | null>(null);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [fName, setFName] = useState("");
  const [fAddress, setFAddress] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fColor, setFColor] = useState("#3b82f6");
  const [fBaseCommission, setFBaseCommission] = useState("40");

  // Rules editing for expanded clinic
  const [editingRules, setEditingRules] = useState<Record<string, { commission_pct: string; lab_discount_pct: string }>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cData }, { data: fData }, { data: rData }] = await Promise.all([
        (supabase as any).from("clinics").select("id, name, address, phone, email, color_hex, base_commission_pct").order("name"),
        (supabase as any).from("treatment_families").select("id, name, color_hex").order("sort_order"),
        (supabase as any).from("clinic_commission_rules").select("id, clinic_id, family_id, commission_pct, lab_discount_pct"),
      ]);
      if (cData) setClinics(cData);
      if (fData) setFamilies(fData);
      if (rData) setRules(rData);
    } catch (e) {
      console.error("Error loading clinics:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditingClinic(null);
    setFName(""); setFAddress(""); setFPhone(""); setFEmail(""); setFColor("#3b82f6"); setFBaseCommission("40");
    setDialogOpen(true);
  };

  const openEdit = (c: Clinic) => {
    setEditingClinic(c);
    setFName(c.name); setFAddress(c.address || ""); setFPhone(c.phone || "");
    setFEmail(c.email || ""); setFColor(c.color_hex || "#3b82f6");
    setFBaseCommission(String(c.base_commission_pct || 40));
    setDialogOpen(true);
  };

  const handleSaveClinic = async () => {
    if (!fName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: fName,
        address: fAddress || null,
        phone: fPhone || null,
        email: fEmail || null,
        color_hex: fColor,
        base_commission_pct: parseFloat(fBaseCommission) || 40,
      };
      if (editingClinic) {
        await (supabase as any).from("clinics").update(payload).eq("id", editingClinic.id);
      } else {
        await (supabase as any).from("clinics").insert(payload);
      }
      setDialogOpen(false);
      await fetchData();
    } catch (e) {
      console.error("Error saving clinic:", e);
    } finally {
      setSaving(false);
    }
  };

  const promptDeleteClinic = (clinic: Clinic) => {
    setClinicToDelete(clinic);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteClinic = async () => {
    if (!clinicToDelete) return;
    setSaving(true);
    try {
      await (supabase as any).from("clinics").delete().eq("id", clinicToDelete.id);
      setDeleteConfirmOpen(false);
      setClinicToDelete(null);
      await fetchData();
    } catch (e) {
      console.error("Error deleting clinic:", e);
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (clinic: Clinic) => {
    if (expandedClinic === clinic.id) {
      setExpandedClinic(null);
      setEditingRules({});
    } else {
      setExpandedClinic(clinic.id);
      const baseComm = clinic.base_commission_pct || 40;
      const existing: Record<string, { commission_pct: string; lab_discount_pct: string }> = {};
      const clinicRules = rules.filter(r => r.clinic_id === clinic.id);
      families.forEach(fam => {
        const found = clinicRules.find(r => r.family_id === fam.id);
        existing[fam.id] = {
          commission_pct: found ? String(found.commission_pct) : String(baseComm),
          lab_discount_pct: found ? String(found.lab_discount_pct) : "0",
        };
      });
      setEditingRules(existing);
    }
  };

  const handleSaveRules = async (clinic: Clinic) => {
    setSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);
    try {
      const payloadBatch = families.map((fam) => {
        const vals = editingRules[fam.id] || {
          commission_pct: String(clinic.base_commission_pct || 40),
          lab_discount_pct: "0",
        };
        return {
          clinic_id: clinic.id,
          family_id: fam.id,
          commission_pct: parseFloat(vals.commission_pct) || (clinic.base_commission_pct || 40),
          lab_discount_pct: parseFloat(vals.lab_discount_pct) || 0,
        };
      });

      const { error } = await (supabase as any)
        .from("clinic_commission_rules")
        .upsert(payloadBatch, { onConflict: "clinic_id,family_id" });

      if (error) {
        setErrorMessage(`Error guardando reglas: ${error.message}`);
      } else {
        setSavedMessage(`✅ Reglas guardadas correctamente para ${clinic.name}`);
        setTimeout(() => setSavedMessage(null), 5000);
        await fetchData();
      }
    } catch (e: any) {
      console.error("Error saving rules:", e);
      setErrorMessage(`Error guardando reglas: ${e?.message || "Error desconocido"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span className="ml-3 text-slate-600">Cargando clínicas...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-500" /> Clínicas & Sedes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configura datos de contacto y reglas de comisión por familia de tratamiento.
          </p>
        </div>
        <Button onClick={openAdd} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-2 shadow-md shadow-rose-500/20">
          <Plus className="h-4 w-4" /> Nueva Clínica
        </Button>
      </div>

      {/* Clinics List */}
      <div className="space-y-4">
        {clinics.length === 0 && (
          <Card className="rounded-2xl border-dashed border-slate-200">
            <CardContent className="p-8 text-center text-slate-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay clínicas configuradas. Crea la primera.</p>
            </CardContent>
          </Card>
        )}

        {clinics.map((clinic) => {
          const isExpanded = expandedClinic === clinic.id;
          const clinicRules = rules.filter(r => r.clinic_id === clinic.id);

          return (
            <Card key={clinic.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: clinic.color_hex || "#3b82f6" }}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">{clinic.name}</CardTitle>
                    <div className="flex gap-4 text-xs text-slate-500 mt-0.5">
                      {clinic.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{clinic.phone}</span>}
                      {clinic.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{clinic.email}</span>}
                      {clinic.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{clinic.address}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                    <Percent className="h-3 w-3" /> Base: {clinic.base_commission_pct}%
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(clinic)} className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-900">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => promptDeleteClinic(clinic)} className="h-9 w-9 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleExpand(clinic)} className="text-xs gap-1 rounded-xl text-slate-600">
                    <Percent className="h-3.5 w-3.5 text-rose-500" />
                    Reglas
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardHeader>

              {/* Commission Rules Panel */}
              {isExpanded && (
                <CardContent className="pt-4 pb-5 bg-slate-50/50">
                  {savedMessage && (
                    <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm">
                      <span>{savedMessage}</span>
                    </div>
                  )}
                  {errorMessage && (
                    <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm">
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Reglas de Comisión por Familia de Tratamiento</h3>
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSaveRules(clinic);
                      }}
                      disabled={saving}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs gap-1.5 font-bold shadow-md shadow-emerald-500/20"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar Reglas
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
                      <span className="col-span-6">Familia</span>
                      <span className="col-span-3 text-center">% Comisión Dra.</span>
                      <span className="col-span-3 text-center">% Dto. Lab</span>
                    </div>

                    {families.map((fam) => {
                      const baseComm = String(clinic.base_commission_pct || 40);
                      const ruleVals = editingRules[fam.id] || { commission_pct: baseComm, lab_discount_pct: "0" };
                      const existingRule = clinicRules.find(r => r.family_id === fam.id);

                      return (
                        <div key={fam.id} className="grid grid-cols-12 items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2.5">
                          <div className="col-span-6 flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: fam.color_hex }}
                            />
                            <span className="text-xs font-semibold text-slate-700">{fam.name}</span>
                            {!existingRule && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                usa base
                              </span>
                            )}
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              value={ruleVals.commission_pct}
                              onChange={(e) => setEditingRules(prev => ({
                                ...prev,
                                [fam.id]: { ...ruleVals, commission_pct: e.target.value }
                              }))}
                              className="h-8 text-xs text-center rounded-lg"
                              min="0" max="100"
                              placeholder={String(clinic.base_commission_pct || 40)}
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              value={ruleVals.lab_discount_pct}
                              onChange={(e) => setEditingRules(prev => ({
                                ...prev,
                                [fam.id]: { ...ruleVals, lab_discount_pct: e.target.value }
                              }))}
                              className="h-8 text-xs text-center rounded-lg"
                              min="0" max="100"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              {editingClinic ? "Editar Clínica" : "Nueva Clínica"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nombre de la Sede</Label>
              <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ej: Clínica Goya" className="rounded-lg" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Dirección
              </Label>
              <Input value={fAddress} onChange={(e) => setFAddress(e.target.value)} placeholder="Ej: Calle de Goya 47, Madrid" className="rounded-lg" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> Teléfono
                </Label>
                <Input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="+34 91 000 0000" className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                </Label>
                <Input value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="goya@melosmile.com" className="rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-slate-400" /> % Comisión Base
                </Label>
                <Input type="number" value={fBaseCommission} onChange={(e) => setFBaseCommission(e.target.value)} placeholder="40" className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Color Identificador</Label>
                <div className="flex items-center gap-2 pt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFColor(c.value)}
                      className="h-7 w-7 rounded-full transition-all"
                      style={{
                        backgroundColor: c.value,
                        outline: fColor === c.value ? "2px solid #0f172a" : "none",
                        outlineOffset: "2px",
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveClinic} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Clínica
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
            ¿Estás seguro de que deseas eliminar la clínica <span className="font-bold text-slate-900">&quot;{clinicToDelete?.name}&quot;</span>?
            Se eliminarán también sus reglas de comisión configuradas.
          </p>
          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={confirmDeleteClinic} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-2 font-bold shadow-md shadow-rose-600/20">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Sí, Eliminar Clínica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
