"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, Plus, Edit2, Trash2, Loader2, AlertCircle, ChevronDown, ChevronRight, Search, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Family = {
  id: string;
  name: string;
  description: string | null;
  color_hex: string;
  sort_order: number;
};

type Clinic = {
  id: string;
  name: string;
  color_hex: string;
};

type TreatmentPrice = {
  clinic_id: string;
  price: number;
};

type Treatment = {
  id: string;
  service_name: string;
  abbreviation: string | null;
  service_type: string | null;
  default_price: number;
  lab_cost: number;
  typical_lab_cost: number;
  family_id: string | null;
  is_active: boolean;
  prices?: TreatmentPrice[];
};

export default function TreatmentsSettingsPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  // Treatment dialog
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [treatmentToDelete, setTreatmentToDelete] = useState<Treatment | null>(null);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [fName, setFName] = useState("");
  const [fAbbrev, setFAbbrev] = useState("");
  const [fType, setFType] = useState("");
  const [fPrice, setFPrice] = useState("0");
  const [fLabCost, setFLabCost] = useState("0");
  const [fTypicalLab, setFTypicalLab] = useState("0");
  const [fFamilyId, setFFamilyId] = useState("");
  const [fClinicPrices, setFClinicPrices] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: fData }, { data: tData }, { data: cData }, { data: pData }] = await Promise.all([
        (supabase as any).from("treatment_families").select("id, name, description, color_hex, sort_order").order("sort_order"),
        (supabase as any).from("treatments").select("id, service_name, abbreviation, service_type, default_price, lab_cost, typical_lab_cost, family_id, is_active").order("service_name"),
        (supabase as any).from("clinics").select("id, name, color_hex").order("name"),
        (supabase as any).from("treatment_clinic_prices").select("treatment_id, clinic_id, price")
      ]);
      
      if (cData) setClinics(cData);
      if (fData) {
        setFamilies(fData);
        setExpandedFamilies(new Set(fData.map((f: Family) => f.id)));
      }
      if (tData) {
        const enrichedTreatments = tData.map((t: any) => ({
          ...t,
          prices: pData?.filter((p: any) => p.treatment_id === t.id) || []
        }));
        setTreatments(enrichedTreatments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFamily = (id: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddTreatment = (familyId?: string) => {
    setEditingTreatment(null);
    setFName(""); setFAbbrev(""); setFType(""); setFPrice("0");
    setFLabCost("0"); setFTypicalLab("0"); setFFamilyId(familyId || "");
    setFClinicPrices({});
    setTreatmentDialogOpen(true);
  };

  const openEditTreatment = (t: Treatment) => {
    setEditingTreatment(t);
    setFName(t.service_name); setFAbbrev(t.abbreviation || "");
    setFType(t.service_type || ""); setFPrice(String(t.default_price));
    setFLabCost(String(t.lab_cost)); setFTypicalLab(String(t.typical_lab_cost));
    setFFamilyId(t.family_id || "");
    
    const pricesMap: Record<string, string> = {};
    t.prices?.forEach(p => {
      pricesMap[p.clinic_id] = String(p.price);
    });
    setFClinicPrices(pricesMap);
    setTreatmentDialogOpen(true);
  };

  const handleClinicPriceChange = (clinicId: string, value: string) => {
    setFClinicPrices(prev => ({
      ...prev,
      [clinicId]: value
    }));
  };

  const handleSaveTreatment = async () => {
    if (!fName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        service_name: fName,
        abbreviation: fAbbrev || null,
        service_type: fType || null,
        default_price: parseFloat(fPrice) || 0,
        lab_cost: parseFloat(fLabCost) || 0,
        typical_lab_cost: parseFloat(fTypicalLab) || 0,
        family_id: fFamilyId || null,
        is_active: true,
      };
      
      let treatmentId = editingTreatment?.id;
      
      const pricePayloads = Object.entries(fClinicPrices)
        .filter(([_, priceStr]) => priceStr.trim() !== "")
        .map(([clinicId, priceStr]) => ({
          clinic_id: clinicId,
          price: parseFloat(priceStr) || 0
        }));

      // Include odoo_product_tmpl_id in payload if editing and it exists
      if (editingTreatment && (editingTreatment as any).odoo_product_tmpl_id) {
        (payload as any).odoo_product_tmpl_id = (editingTreatment as any).odoo_product_tmpl_id;
      }
      
      const res = await fetch("/api/treatments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentId,
          payload,
          pricePayloads,
          isNew: !treatmentId,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Error syncing treatment to Odoo/DB");
      }
      
      setTreatmentDialogOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const promptDeleteTreatment = (t: Treatment) => {
    setTreatmentToDelete(t);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTreatment = async () => {
    if (!treatmentToDelete) return;
    setSaving(true);
    try {
      await (supabase as any).from("treatments").delete().eq("id", treatmentToDelete.id);
      setDeleteConfirmOpen(false);
      setTreatmentToDelete(null);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const SERVICE_TYPES = ["Consulta", "Restauración", "Cirugía", "Ortodoncia", "Endodoncia", "Periodoncia",
    "Implantología", "Estética", "Prostodoncia", "Aparatología", "Pediátrica", "Radiología", "Higiene", "Urgencias"];

  const filteredTreatments = treatments.filter(t =>
    !search ||
    t.service_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.abbreviation || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading && families.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span className="ml-3 text-slate-600">Cargando tratamientos...</span>
      </div>
    );
  }

  const totalActive = treatments.filter(t => t.is_active).length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-violet-500" /> Tratamientos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalActive} tratamientos activos en {families.length} familias.
          </p>
        </div>
        <Button onClick={() => openAddTreatment()} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-2 shadow-md shadow-rose-500/20">
          <Plus className="h-4 w-4" /> Nuevo Tratamiento
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tratamiento o abreviación..."
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Families with treatments */}
      <div className="space-y-3">
        {families.map((fam) => {
          const famTreatments = filteredTreatments.filter(t => t.family_id === fam.id);
          if (search && famTreatments.length === 0) return null;
          const isOpen = expandedFamilies.has(fam.id);

          return (
            <Card key={fam.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Family Header */}
              <div
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
                onClick={() => toggleFamily(fam.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: fam.color_hex }} />
                  <span className="text-sm font-bold text-slate-800">{fam.name}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {famTreatments.length} tratamientos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); openAddTreatment(fam.id); }}
                    className="text-xs rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-7 gap-1"
                  >
                    <Plus className="h-3 w-3" /> Añadir
                  </Button>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </div>

              {/* Treatments Table */}
              {isOpen && (
                <div className="divide-y divide-slate-100">
                  {famTreatments.length === 0 ? (
                    <div className="px-5 py-4 text-center text-xs text-slate-400">
                      No hay tratamientos en esta familia. Haz clic en "Añadir" para crear uno.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-2 bg-slate-50">
                        <span className="col-span-5">Tratamiento</span>
                        <span className="col-span-2 text-center">Abrev.</span>
                        <span className="col-span-2 text-center">Precio (€)</span>
                        <span className="col-span-2 text-center">Lab Típico (€)</span>
                        <span className="col-span-1" />
                      </div>
                      {famTreatments.map((t) => (
                        <div key={t.id} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-slate-50 transition-colors group">
                          <div className="col-span-5">
                            <span className="text-sm font-semibold text-slate-800">{t.service_name}</span>
                            {t.service_type && (
                              <span className="ml-2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{t.service_type}</span>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {t.abbreviation || "-"}
                            </span>
                          </div>
                          <div className="col-span-2 text-center flex flex-col items-center gap-0.5">
                            <span className="text-sm font-bold text-slate-800">{t.default_price.toFixed(2)}</span>
                            {t.prices && t.prices.length > 0 && (
                               <span className="text-[9px] text-indigo-500 font-medium">Precios esp.</span>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            <span className={`text-sm font-bold ${t.typical_lab_cost > 0 ? "text-amber-600" : "text-slate-400"}`}>
                              {t.typical_lab_cost > 0 ? t.typical_lab_cost.toFixed(2) : "-"}
                            </span>
                          </div>
                          <div className="col-span-1 flex justify-end items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => openEditTreatment(t)} className="h-7 w-7 rounded-lg text-slate-500">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => promptDeleteTreatment(t)} className="h-7 w-7 rounded-lg text-rose-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* Treatments without family */}
        {(() => {
          const noFamily = filteredTreatments.filter(t => !t.family_id);
          if (noFamily.length === 0) return null;
          return (
            <Card className="rounded-2xl border border-dashed border-slate-200 bg-white">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold text-slate-600">Sin familia asignada ({noFamily.length})</span>
              </div>
              {noFamily.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 group">
                  <span className="text-sm text-slate-700">{t.service_name}</span>
                  <Button variant="ghost" size="sm" onClick={() => openEditTreatment(t)} className="text-xs rounded-xl opacity-0 group-hover:opacity-100">
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                </div>
              ))}
            </Card>
          );
        })()}
      </div>

      {/* Treatment Dialog */}
      <Dialog open={treatmentDialogOpen} onOpenChange={setTreatmentDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-violet-500" />
              {editingTreatment ? "Editar Tratamiento" : "Nuevo Tratamiento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nombre Completo del Tratamiento</Label>
              <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ej: Ortodoncia Brackets Metálicos" className="rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Abreviación</Label>
                <Input value={fAbbrev} onChange={(e) => setFAbbrev(e.target.value.toUpperCase())} placeholder="ORTOD MET" className="rounded-lg font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo / Categoría</Label>
                <Select value={fType} onValueChange={(v) => setFType(v ?? "")}>
                  <SelectTrigger className="rounded-lg text-sm"><SelectValue placeholder="Tipo..." /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Familia</Label>
              <Select value={fFamilyId} onValueChange={(v) => setFFamilyId(v ?? "")}>
                <SelectTrigger className="rounded-lg text-sm">
                  {/* Default SelectValue to fFamilyId name using rendering prop for reliable name */}
                  <SelectValue placeholder="Seleccionar familia...">
                    {families.find(f => f.id === fFamilyId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin familia</SelectItem>
                  {families.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Precio Base (€)</Label>
                <Input type="number" value={fPrice} onChange={(e) => setFPrice(e.target.value)} className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Gasto Lab (€)</Label>
                <Input type="number" value={fLabCost} onChange={(e) => setFLabCost(e.target.value)} className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Lab Típico (€)</Label>
                <Input type="number" value={fTypicalLab} onChange={(e) => setFTypicalLab(e.target.value)} className="rounded-lg" />
              </div>
            </div>
            
            {/* Precios por Clínica */}
            {clinics.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Precios Específicos por Sede (Opcional)</Label>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                  {clinics.map(clinic => (
                    <div key={clinic.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: clinic.color_hex }} />
                        <span className="text-sm font-medium text-slate-700">{clinic.name}</span>
                      </div>
                      <div className="w-32 relative">
                        <Input 
                          type="number" 
                          placeholder={fPrice} 
                          value={fClinicPrices[clinic.id] || ""} 
                          onChange={(e) => handleClinicPriceChange(clinic.id, e.target.value)}
                          className="pl-6 rounded-lg text-sm h-8"
                        />
                        <span className="absolute left-2.5 top-1.5 text-slate-400 text-sm">€</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400 leading-tight">
                    * Si se deja en blanco, se usará el precio base ({fPrice} €) para esa sede.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2 gap-2 mt-2">
            <Button variant="outline" onClick={() => setTreatmentDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveTreatment} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
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
            ¿Estás seguro de que deseas eliminar el tratamiento <span className="font-bold text-slate-900">"{treatmentToDelete?.service_name}"</span>?
          </p>
          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={confirmDeleteTreatment} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-2 font-bold shadow-md shadow-rose-600/20">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Sí, Eliminar Tratamiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
