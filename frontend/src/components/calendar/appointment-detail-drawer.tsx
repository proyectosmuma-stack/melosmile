"use client";

import React from "react";
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
  MoreVertical, 
  X, 
  Share2,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AppointmentEvent, DEFAULT_CLINICS } from "@/components/calendar/calendar-view";
import { format, addMinutes } from "date-fns";
import { es } from "date-fns/locale";

type AppointmentDetailDrawerProps = {
  event: AppointmentEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEvent: (updated: AppointmentEvent) => void;
};

export function AppointmentDetailDrawer({
  event,
  isOpen,
  onClose,
  onUpdateEvent,
}: AppointmentDetailDrawerProps) {
  if (!event) return null;

  const router = useRouter();

  const clinic = DEFAULT_CLINICS.find((c) => c.id === event.clinicId) || DEFAULT_CLINICS[0];

  // Calculate end time
  const endDate = addMinutes(event.date, event.durationMinutes || 45);
  const endTimeStr = format(endDate, "HH:mm");
  const formattedDateStr = format(event.date, "EEEE, d 'de' MMMM", { locale: es });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-[#f8fafc] border border-slate-200/90 shadow-2xl text-slate-800">
        {/* Top Header Action Buttons (Google Calendar Style) */}
        <div className="flex items-center justify-end gap-1 mb-2">
          <button
            onClick={() => {
              onClose();
              router.push(`/appointments/${event.id}`);
            }}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
            title="Editar cita"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            onClick={async () => {
              if (confirm(`¿Estás seguro de eliminar la cita de ${event.patient}?`)) {
                await supabase.from("appointments").delete().eq("id", event.id);
                window.dispatchEvent(new CustomEvent("appointment-created"));
                onClose();
              }
            }}
            className="p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
            title="Eliminar cita"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            onClick={() => alert(`Enviando recordatorio por correo para ${event.patient}`)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
            title="Enviar correo"
          >
            <Mail className="h-4 w-4" />
          </button>

          <button
            onClick={() => alert(`Opciones adicionales de ${event.patient}`)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
            title="Más opciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 ml-1 text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300/80 rounded-full transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Event Title & Subtitle */}
        <div className="flex items-start gap-3 mt-1">
          <span className={cn("w-3.5 h-3.5 mt-1.5 rounded-sm shrink-0 shadow-xs", clinic.color)} />
          <div>
            <h3 className="text-xl font-medium text-slate-900 leading-snug">{event.patient}</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-normal mt-0.5 capitalize">
              {formattedDateStr} · {event.startTime} – {endTimeStr}
            </p>
          </div>
        </div>

        {/* Invite Link / Share Pill Button */}
        <div className="pl-6.5 mt-3">
          <button
            onClick={() => {
              onClose();
              router.push(`/appointments/${event.id}`);
            }}
            className="border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-blue-600 rounded-full px-4 py-1.5 text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            Invitar mediante enlace / Ver Ficha Completa
          </button>
        </div>

        {/* Google Calendar Details List */}
        <div className="space-y-3.5 pt-4 mt-4 border-t border-slate-200/60 text-xs text-slate-700">
          {/* Notification Row */}
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-slate-500 shrink-0" />
            <div>
              <p className="font-medium text-slate-800">10 minutos antes, en un correo</p>
              <p className="text-slate-500 text-[11px]">Paciente avisado por WhatsApp</p>
            </div>
          </div>

          {/* Organizer / Patient Row */}
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4 text-slate-500 shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">{event.patient}</span>
              {event.patientId && (
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/patients/${event.patientId}`);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  (Ver Expediente)
                </button>
              )}
            </div>
          </div>

          {/* Clinic & Doctor Row */}
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
            <div>
              <p className="font-medium text-slate-800">{clinic.name}</p>
              <p className="text-slate-500 text-[11px]">Doctora: {event.doctor}</p>
            </div>
          </div>

          {/* Treatment / Reason Row */}
          <div className="flex items-center gap-3">
            <Stethoscope className="h-4 w-4 text-slate-500 shrink-0" />
            <div>
              <p className="font-medium text-slate-800">{event.title}</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Estado: Confirmada
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-3 border-t border-slate-200/60 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              if (event.patientId) router.push(`/patients/${event.patientId}`);
            }}
            className="text-xs rounded-xl border-slate-300 bg-white cursor-pointer"
          >
            <User className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Ver Paciente
          </Button>
          <Button
            onClick={() => {
              onClose();
              router.push(`/appointments/${event.id}`);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl px-5 shadow-sm cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar Cita Completa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
