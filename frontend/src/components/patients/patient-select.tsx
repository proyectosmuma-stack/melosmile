"use client";

import React, { useState } from "react";
import { User, Plus, Search, Check, Phone, Mail, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type Patient = {
  id: string;
  historiaId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dni: string;
};

export const MOCK_PATIENTS: Patient[] = [
  { id: "p1", historiaId: "PAC-001", firstName: "Juan", lastName: "Pérez", phone: "+34 612 345 678", email: "juan.perez@email.com", dni: "12345678A" },
  { id: "p2", historiaId: "PAC-002", firstName: "María", lastName: "Gómez", phone: "+34 622 987 654", email: "maria.gomez@email.com", dni: "87654321B" },
  { id: "p3", historiaId: "PAC-003", firstName: "Carlos", lastName: "Rodríguez", phone: "+34 633 456 789", email: "carlos.rodriguez@email.com", dni: "45678912C" },
  { id: "p4", historiaId: "PAC-004", firstName: "Laura", lastName: "Sánchez", phone: "+34 644 112 233", email: "laura.sanchez@email.com", dni: "33221144D" },
  { id: "p5", historiaId: "PAC-005", firstName: "Munir", lastName: "Callaos", phone: "+34 655 889 900", email: "munir@melosmile.com", dni: "77889900X" },
];

type PatientSelectProps = {
  value?: string;
  onSelectPatient?: (patient: Patient) => void;
  placeholder?: string;
};

export function PatientSelect({ value = "", onSelectPatient, placeholder = "Buscar o seleccionar paciente..." }: PatientSelectProps) {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);

  // New patient modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDni, setNewDni] = useState("");

  const filtered = patients.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const search = query.toLowerCase();
    return (
      fullName.includes(search) ||
      p.dni.toLowerCase().includes(search) ||
      p.historiaId.toLowerCase().includes(search)
    );
  });

  const handleSelect = (patient: Patient) => {
    setQuery(`${patient.firstName} ${patient.lastName}`);
    onSelectPatient?.(patient);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (!newFirstName.trim()) return;
    const newP: Patient = {
      id: `p${Date.now()}`,
      historiaId: `PAC-${String(patients.length + 1).padStart(3, "0")}`,
      firstName: newFirstName,
      lastName: newLastName,
      phone: newPhone || "+34 600 000 000",
      email: newEmail || "paciente@email.com",
      dni: newDni || "00000000X",
    };
    setPatients([newP, ...patients]);
    handleSelect(newP);
    setIsNewModalOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar o escribir nombre paciente..."
          className="pl-9 text-sm rounded-lg"
        />
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xl p-1 opacity-100">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {p.firstName} {p.lastName}{" "}
                    <span className="text-xs text-slate-400 font-normal">({p.historiaId})</span>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-3">
                    <span>DNI: {p.dni}</span>
                    <span>{p.phone}</span>
                  </p>
                </div>
                {query.toLowerCase() === `${p.firstName} ${p.lastName}`.toLowerCase() && (
                  <Check className="h-4 w-4 text-rose-500 shrink-0" />
                )}
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-500">
              No se encontró ningún paciente con ese nombre.
            </div>
          )}

          {/* "+ Crear Nuevo Paciente" option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsNewModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs border border-rose-200 mt-1 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Crear nuevo paciente en Base de Datos</span>
          </button>
        </div>
      )}

      {/* New Patient Registration Modal (Opaque) */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-2xl opacity-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-rose-500" />
              Crear Ficha de Nuevo Paciente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nombre</Label>
                <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Juan" className="text-sm rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Apellidos</Label>
                <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Pérez" className="text-sm rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">DNI / NIE</Label>
                <Input value={newDni} onChange={(e) => setNewDni(e.target.value)} placeholder="12345678A" className="text-sm rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Teléfono</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+34 600 000 000" className="text-sm rounded-lg" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Correo Electrónico</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="correo@paciente.com" className="text-sm rounded-lg" />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setIsNewModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleCreateNew} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20">
              Guardar y Seleccionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
