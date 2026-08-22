"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Stethoscope, 
  Bell, 
  Calendar as CalendarIcon, 
  Pencil, 
  Trash2, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AppointmentEvent, Clinic, DEFAULT_CLINICS } from "@/components/calendar/calendar-view";
import { format, addMinutes } from "date-fns";
import { es } from "date-fns/locale";

type AppointmentDetailDrawerProps = {
  event: AppointmentEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEvent: (updated: AppointmentEvent) => void;
  clinics?: Clinic[];
};

export function AppointmentDetailDrawer({
  event,
  isOpen,
  onClose,
  onUpdateEvent,
  clinics,
}: AppointmentDetailDrawerProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!event) return null;

  const resolvedClinics = clinics && clinics.length > 0 ? clinics : DEFAULT_CLINICS;
  const clinic = resolvedClinics.find((c) => c.id === event.clinicId) || resolvedClinics[0] || DEFAULT_CLINICS[0];

  // Calculate end time
  const endDate = addMinutes(event.date, event.durationMinutes || 45);
  const endTimeStr = format(endDate, "HH:mm");
  const formattedDateStr = format(event.date, "EEEE, d 'de' MMMM", { locale: es });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      onClose();
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase.from("appointments").delete().eq("id", event.id);
      if (error) throw error;

      window.dispatchEvent(new CustomEvent("appointment-created"));
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      console.error("Error eliminando cita:", err);
      alert(err.message || "Error al eliminar la cita.");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-background border border-border/90 shadow-2xl text-foreground">
        {/* Top Header Action Buttons (Google Calendar Style - Single Pencil, Trash, Mail) */}
        <div className="flex items-center justify-end gap-1 pr-6 mb-2">
          <button
            onClick={() => {
              onClose();
              router.push(`/appointments/${event.id}`);
            }}
            className="p-2 text-muted-foreground hover:text-info hover:bg-info/10 rounded-full transition-colors cursor-pointer"
            title="Modificar Cita"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer"
            title="Eliminar cita"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            onClick={() => alert(`Enviando recordatorio por correo para ${event.patient}`)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
            title="Enviar correo"
          >
            <Mail className="h-4 w-4" />
          </button>
        </div>

        {/* Delete Confirmation Alert Banner (Inline) */}
        {showDeleteConfirm && (
          <div className="mb-4 p-3.5 bg-destructive/10 border border-destructive/30 rounded-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 text-destructive text-xs font-bold">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span>¿Eliminar la cita de {event.patient}?</span>
            </div>
            <p className="text-[11px] text-destructive/80">Esta acción es permanente y eliminará la cita de la agenda.</p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3.5 py-1 text-xs font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirmar y Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Event Title & Subtitle */}
        <div className="flex items-start gap-3 mt-1">
          <span className={cn("w-3.5 h-3.5 mt-1.5 rounded-sm shrink-0 shadow-xs", clinic.color)} />
          <div>
            <h3 className="text-xl font-medium text-foreground leading-snug">{event.patient}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-0.5 capitalize">
              {formattedDateStr} · {event.startTime} – {endTimeStr}
            </p>
          </div>
        </div>

        {/* Google Calendar Details List */}
        <div className="space-y-3.5 pt-4 mt-4 border-t border-border/60 text-xs text-muted-foreground">
          {/* Notification Row */}
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium text-foreground">10 minutos antes, en un correo</p>
              <p className="text-muted-foreground text-[11px]">Paciente avisado por WhatsApp</p>
            </div>
          </div>

          {/* Organizer / Patient Row */}
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{event.patient}</span>
              {(event.patientHistoriaId || event.patientId) && (
                <button
                  onClick={() => {
                    onClose();
                    const ref = event.patientHistoriaId || event.patientId;
                    router.push(`/patients/${ref}`);
                  }}
                  className="text-[11px] font-bold text-info hover:underline cursor-pointer"
                >
                  (Ver Expediente)
                </button>
              )}
            </div>
          </div>

          {/* Clinic & Doctor Row */}
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium text-foreground">{clinic.name}</p>
              <p className="text-muted-foreground text-[11px]">Doctora: {event.doctor}</p>
            </div>
          </div>

          {/* Treatment / Reason Row */}
          <div className="flex items-center gap-3">
            <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium text-foreground">{event.title}</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success">
                Estado: Confirmada
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions - Single Clean Action */}
        <div className="mt-6 pt-3 border-t border-border/60 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              const ref = event.patientHistoriaId || event.patientId;
              if (ref) {
                router.push(`/patients/${ref}`);
              } else {
                alert("No se encontró la ficha del paciente para esta cita.");
              }
            }}
            className="text-xs rounded-xl border-border bg-card cursor-pointer"
          >
            <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            Ver Paciente
          </Button>

          <Button
            onClick={() => {
              onClose();
              router.push(`/appointments/${event.id}`);
            }}
            className="bg-info hover:bg-info/90 text-info-foreground text-xs font-semibold rounded-xl px-4 shadow-sm cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Modificar Cita
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}