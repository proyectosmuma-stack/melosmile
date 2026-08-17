"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Plus, Search, Check, X, Loader2 } from "lucide-react";
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

type PatientSelectProps = {
  value?: string;
  onSelectPatient?: (patient: Patient) => void;
  placeholder?: string;
};

export function PatientSelect({ value = "", onSelectPatient, placeholder = "Buscar o escribir nombre paciente..." }: PatientSelectProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);

  // New patient modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDni, setNewDni] = useState("");

  // 1. Click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Escape key handler to close dropdown
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 3. Ajax search from Supabase API with 200ms debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.patients && Array.isArray(data.patients)) {
            const mapped: Patient[] = data.patients.map((p: any) => ({
              id: p.id,
              historiaId: p.historia_id || "PAC-000",
              firstName: p.first_name || "",
              lastName: p.last_name || "",
              phone: p.phone || "",
              email: p.email || "",
              dni: p.dni || "",
            }));
            setPatients(mapped);
          }
        }
      } catch (err) {
        console.error("Error searching patients:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (patient: Patient) => {
    setQuery(`${patient.firstName} ${patient.lastName}`);
    setIsOpen(false);

    if (onSelectPatient) {
      onSelectPatient(patient);
    } else {
      // If used as top navigation search bar, navigate to patient profile
      router.push(`/patients/${patient.id}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
  };

  const handleCreateNew = async () => {
    if (!newFirstName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/patients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: newFirstName.trim(),
          last_name: newLastName.trim() || "Sin Apellido",
          phone: newPhone.trim() || "+34 600 000 000",
          email: newEmail.trim() || `${newFirstName.toLowerCase()}@melosmile.local`,
          dni: newDni.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          const createdP = data.data;
          const newP: Patient = {
            id: createdP.id,
            historiaId: createdP.historia_id || "PAC-NEW",
            firstName: createdP.first_name,
            lastName: createdP.last_name,
            phone: createdP.phone,
            email: createdP.email,
            dni: createdP.dni || "",
          };
          setPatients((prev) => [newP, ...prev]);
          handleSelect(newP);
          setIsNewModalOpen(false);
          setNewFirstName("");
          setNewLastName("");
          setNewPhone("");
          setNewEmail("");
          setNewDni("");
        }
      }
    } catch (err) {
      console.error("Error creating patient:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <User className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-8 text-sm rounded-xl border-border focus:border-primary focus:ring-primary bg-card"
        />
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            title="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          loading && (
            <Loader2 className="absolute right-2.5 h-3.5 w-3.5 text-primary animate-spin pointer-events-none" />
          )
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-72 overflow-y-auto bg-card rounded-2xl border border-border shadow-2xl p-1.5 opacity-100 animate-in fade-in-50 slide-in-from-top-1">
          {loading && patients.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Buscando pacientes en Supabase...</span>
            </div>
          ) : patients.length > 0 ? (
            patients.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/10 cursor-pointer transition-colors group"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                    {p.firstName} {p.lastName}{" "}
                    <span className="text-xs text-muted-foreground font-normal ml-1">({p.historiaId})</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                    {p.dni && <span>DNI: {p.dni}</span>}
                    {p.phone && <span>{p.phone}</span>}
                  </p>
                </div>
                {query.toLowerCase() === `${p.firstName} ${p.lastName}`.toLowerCase() && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">
              No se encontró ningún paciente que coincida.
            </div>
          )}

          {/* "+ Crear Nuevo Paciente" option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsNewModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-xs border border-primary/30 mt-1 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>Crear nuevo paciente en Base de Datos</span>
          </button>
        </div>
      )}

      {/* New Patient Registration Modal */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-card border border-border shadow-2xl opacity-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Crear Ficha de Nuevo Paciente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Nombre *</Label>
                <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Ej: Juan" className="text-sm rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Apellidos</Label>
                <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Ej: Pérez" className="text-sm rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">DNI / NIE</Label>
                <Input value={newDni} onChange={(e) => setNewDni(e.target.value)} placeholder="12345678A" className="text-sm rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Teléfono</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+34 600 000 000" className="text-sm rounded-lg" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Correo Electrónico</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="correo@paciente.com" className="text-sm rounded-lg" />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setIsNewModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleCreateNew}
              disabled={creating || !newFirstName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar y Seleccionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}