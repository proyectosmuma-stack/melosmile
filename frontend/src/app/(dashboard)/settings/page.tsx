"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Edit2, Trash2, ShieldCheck, Check, Sparkles } from "lucide-react";
import { DEFAULT_CLINICS, Clinic } from "@/components/calendar/calendar-view";

export default function SettingsPage() {
  const [clinics, setClinics] = useState<Clinic[]>(DEFAULT_CLINICS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [baseCommission, setBaseCommission] = useState("60");
  const [labDiscount, setLabDiscount] = useState("0");
  const [color, setColor] = useState("bg-emerald-500");

  const colorOptions = [
    { label: "Esmeralda", value: "bg-emerald-500", border: "border-emerald-600" },
    { label: "Azul", value: "bg-blue-500", border: "border-blue-600" },
    { label: "Púrpura", value: "bg-purple-500", border: "border-purple-600" },
    { label: "Rosa", value: "bg-rose-500", border: "border-rose-600" },
    { label: "Ámbar", value: "bg-amber-500", border: "border-amber-600" },
    { label: "Indigo", value: "bg-indigo-500", border: "border-indigo-600" },
  ];

  const handleOpenAdd = () => {
    setEditingClinic(null);
    setName("");
    setBaseCommission("60");
    setLabDiscount("0");
    setColor("bg-emerald-500");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setName(clinic.name);
    setBaseCommission(String(clinic.baseCommission));
    setLabDiscount(String(clinic.labDiscount));
    setColor(clinic.color);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta clínica?")) {
      setClinics(clinics.filter((c) => c.id !== id));
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const selectedColorObj = colorOptions.find((c) => c.value === color) || colorOptions[0];

    if (editingClinic) {
      // Edit existing
      setClinics(
        clinics.map((c) =>
          c.id === editingClinic.id
            ? {
                ...c,
                name,
                baseCommission: parseFloat(baseCommission) || 60,
                labDiscount: parseFloat(labDiscount) || 0,
                color: selectedColorObj.value,
                borderColor: selectedColorObj.border,
              }
            : c
        )
      );
    } else {
      // Add new
      const newClinic: Clinic = {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        baseCommission: parseFloat(baseCommission) || 60,
        labDiscount: parseFloat(labDiscount) || 0,
        color: selectedColorObj.value,
        borderColor: selectedColorObj.border,
      };
      setClinics([...clinics, newClinic]);
    }

    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Gestión de Clínicas & Reglas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Crea, edita o elimina las sedes de Melosmile y configura sus comisiones y reparto de laboratorio.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-11 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-md shadow-rose-500/20 gap-2"
        >
          <Plus className="h-4 w-4" />
          Añadir Nueva Clínica
        </Button>
      </div>

      {/* Clinics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clinics.map((clinic) => (
          <Card key={clinic.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${clinic.color} flex items-center justify-center text-white font-bold shadow-sm`}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{clinic.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-400">ID: {clinic.id}</CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(clinic)}
                  className="rounded-xl h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(clinic.id)}
                  className="rounded-xl h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Comisión Base</span>
                  <span className="text-base font-bold text-slate-800">{clinic.baseCommission}%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Deducción Lab</span>
                  <span className="text-base font-bold text-slate-800">{clinic.labDiscount}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / Edit Dialog (Completely Opaque) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-2xl opacity-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-rose-500" />
              {editingClinic ? "Editar Clínica" : "Nueva Clínica"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nombre de la Clínica / Sede</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Clínica Valencia"
                className="text-sm rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Comisión Base (%)</Label>
                <Input
                  type="number"
                  value={baseCommission}
                  onChange={(e) => setBaseCommission(e.target.value)}
                  placeholder="60"
                  className="text-sm rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Descuento Lab (%)</Label>
                <Input
                  type="number"
                  value={labDiscount}
                  onChange={(e) => setLabDiscount(e.target.value)}
                  placeholder="50"
                  className="text-sm rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Color Distintivo</Label>
              <div className="flex items-center gap-2 pt-1">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`h-8 w-8 rounded-full ${c.value} flex items-center justify-center transition-transform ${
                      color === c.value ? "ring-2 ring-slate-900 scale-110" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {color === c.value && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20">
              Guardar Clínica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
