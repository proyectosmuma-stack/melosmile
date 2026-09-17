"use client";

import React, { useEffect, useRef } from "react";
import { AppointmentEvent, Clinic } from "./calendar-view";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock, User, Stethoscope, ChevronRight, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppointmentPopoverProps {
  event: AppointmentEvent;
  clinic: Clinic;
  x: number;
  y: number;
  onClose: () => void;
  onOpenDetails: (event: AppointmentEvent) => void;
}

export function AppointmentPopover({ event, clinic, x, y, onClose, onOpenDetails }: AppointmentPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Adjust positioning to avoid going off-screen
  let adjustedX = x;
  let adjustedY = y;
  
  // Basic constraints (assuming approx 320px width and 200px height for the popover)
  if (typeof window !== "undefined") {
    const popoverWidth = 320;
    const popoverHeight = 220;
    
    if (adjustedX + popoverWidth > window.innerWidth - 20) {
      adjustedX = window.innerWidth - popoverWidth - 20;
    }
    if (adjustedX < 20) adjustedX = 20;

    if (adjustedY + popoverHeight > window.innerHeight - 20) {
      adjustedY = adjustedY - popoverHeight - 10; // show above
    } else {
      adjustedY = adjustedY + 10; // show below
    }
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Invisible backdrop just to catch outside clicks if needed, though event listener handles it */}
      <div 
        ref={popoverRef}
        className="absolute pointer-events-auto bg-card border border-border/60 shadow-xl rounded-2xl w-[320px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        style={{ left: adjustedX, top: adjustedY }}
      >
        {/* Header Color Bar */}
        <div className={cn("h-1.5 w-full", clinic.color)} />

        <div className="p-4 relative">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <h3 className="font-bold text-lg text-foreground pr-8 leading-tight">
            {event.title || "Consulta"}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20")}>
              {event.status || "Pendiente"}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {clinic.name}
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground capitalize">
                {format(event.date, "EEEE, d 'de' MMMM", { locale: es })}
              </span>
            </div>
            
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground font-medium">
                {event.startTime} - {event.durationMinutes} min
              </span>
            </div>
            
            <div className="flex items-center gap-2.5 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground font-semibold">{event.patient}</span>
            </div>

            <div className="flex items-center gap-2.5 text-sm">
              <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{event.doctor}</span>
            </div>
          </div>

          {/* Historial y Notas de la cita */}
          {(event.previousNotes || event.notes) && (
             <div className="mt-4 flex flex-col gap-2">
                {event.previousNotes && (
                  <div className="p-2.5 bg-muted/40 rounded-xl border border-border/50 flex gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Notas Anteriores</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {event.previousNotes.replace(/\[.*?\]/g, '').trim()}
                      </p>
                    </div>
                  </div>
                )}
                
                {event.notes && (
                  <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/20 flex gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase mb-1">En esta cita</p>
                      <p className="text-xs text-foreground leading-relaxed font-medium">
                        {event.notes.replace(/\[.*?\]/g, '').trim() || "Notas clínicas disponibles..."}
                      </p>
                    </div>
                  </div>
                )}
             </div>
          )}

          <div className="mt-5 pt-3 border-t border-border/50 flex justify-end">
            <Button 
              onClick={() => {
                onClose();
                onOpenDetails(event);
              }}
              size="sm"
              className="w-full font-semibold rounded-xl"
            >
              Ver Ficha Completa
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
