import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RescheduleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newTime: string) => void;
  targetDate: Date | null;
  originalTime: string;
  patientName: string;
}

export function RescheduleConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  targetDate,
  originalTime,
  patientName
}: RescheduleConfirmModalProps) {
  const [selectedTime, setSelectedTime] = useState(originalTime);

  useEffect(() => {
    if (isOpen) {
      setSelectedTime(originalTime);
    }
  }, [isOpen, originalTime]);

  if (!isOpen || !targetDate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <h2 className="text-lg font-bold text-foreground">Reagendar Cita</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Paciente</p>
            <p className="font-semibold text-foreground">{patientName}</p>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Nueva Fecha</p>
            <div className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <p className="font-medium capitalize">{format(targetDate, "EEEE, d 'de' MMMM", { locale: es })}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">¿A qué hora quieres programarla?</p>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="time" 
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-10 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-muted/30 border-t border-border/60 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(selectedTime)} className="rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20">
            Confirmar Reagendamiento
          </Button>
        </div>
      </div>
    </div>
  );
}
