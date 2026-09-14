"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PatientSelect, Patient } from "@/components/patients/patient-select";
import { NewReminderModal } from "@/components/reminders/new-reminder-modal";
import { Loader2 } from "lucide-react";

interface GlobalNewReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GlobalNewReminderModal({ open, onOpenChange, onSuccess }: GlobalNewReminderModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  
  // Reset state when modal is opened/closed
  useEffect(() => {
    if (open) {
      setSelectedPatient(null);
      setAppointments([]);
      setFetching(false);
    }
  }, [open]);

  const handlePatientSelect = async (p: Patient) => {
    setSelectedPatient(p);
    setFetching(true);
    try {
      const res = await fetch(`/api/patients/${p.id}/appointments`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error("Error fetching appointments:", e);
    } finally {
      setFetching(false);
    }
  };

  if (!open) return null;

  // Si ya se ha seleccionado un paciente y no estamos cargando sus citas,
  // renderizamos directamente el modal existente (que es Fixed a pantalla completa).
  if (selectedPatient && !fetching) {
    return (
      <NewReminderModal
        open={true}
        onOpenChange={(v) => {
          if (!v) {
             onOpenChange(false);
          }
        }}
        patientId={selectedPatient.id}
        patientName={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
        patientPhone={selectedPatient.phone}
        patientEmail={selectedPatient.email}
        appointments={appointments}
        onSuccess={() => {
           onOpenChange(false);
           if (onSuccess) onSuccess();
        }}
      />
    );
  }

  // Paso 1: Seleccionar paciente
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-card border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Crear Nuevo Recordatorio</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Busca y selecciona un paciente para programar o enviar una notificación.
          </p>
          
          <PatientSelect onSelectPatient={handlePatientSelect} />
          
          {fetching && (
            <div className="flex items-center gap-2 mt-4 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando datos del paciente...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
