import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Building2, User, Stethoscope, Calculator, CalendarCheck, ChevronLeft, ChevronRight, Clock, CalendarDays, Calendar as CalendarIcon, Sun, FileText, Settings2, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, subDays, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, set } from "date-fns";
import { es } from "date-fns/locale";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { PatientSelect, Patient } from "@/components/patients/patient-select";
import { AppointmentDetailDrawer } from "@/components/calendar/appointment-detail-drawer";
import { triggerNewAppointmentModal } from "@/components/calendar/new-appointment-modal";

export type Clinic = {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  labDiscount: number; // e.g. 50%
  baseCommission: number; // e.g. 60%
};

const COLOR_PRESETS = [
  { bg: "bg-blue-500", border: "border-blue-600" },
  { bg: "bg-emerald-500", border: "border-emerald-600" },
  { bg: "bg-purple-500", border: "border-purple-600" },
  { bg: "bg-pink-500", border: "border-pink-600" },
  { bg: "bg-amber-500", border: "border-amber-600" },
  { bg: "bg-indigo-500", border: "border-indigo-600" },
];

export const DEFAULT_CLINICS: Clinic[] = [
  { id: "albacete", name: "Albacete", color: "bg-emerald-500", borderColor: "border-emerald-600", labDiscount: 50, baseCommission: 60 },
  { id: "goya", name: "Goya (Madrid)", color: "bg-blue-500", borderColor: "border-blue-600", labDiscount: 0, baseCommission: 60 },
  { id: "rozas", name: "Las Rozas", color: "bg-purple-500", borderColor: "border-purple-600", labDiscount: 0, baseCommission: 60 },
];

export type AppointmentEvent = {
  id: string;
  title: string;
  date: Date;
  startTime: string; // "09:15"
  durationMinutes: number;
  clinicId: string;
  patient: string;
  patientHistoriaId?: string;
  patientPhone?: string;
  patientEmail?: string;
  doctor: string;
  price: number;
  labCost: number;
  customCommissionRate?: number;
  customLabDiscountRate?: number;
};

const today = new Date();

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora (60 min)" },
  { value: 75, label: "1 hora 15 min" },
  { value: 90, label: "1 hora 30 min" },
  { value: 105, label: "1 hora 45 min" },
  { value: 120, label: "2 horas (120 min)" },
  { value: 150, label: "2.5 horas (150 min)" },
  { value: 180, label: "3 horas (180 min)" },
];

type ViewMode = "month" | "week" | "day";

function DroppableCell({ id, day, slot, isToday, onCellClick, children }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      onClick={() => onCellClick(day, slot)}
      className={cn(
        "relative h-9 border-b border-r border-slate-100/60 cursor-pointer transition-colors hover:bg-slate-100/80 group",
        slot.endsWith(":00") && "border-b-slate-200/80",
        isToday && "bg-rose-50/20",
        isOver && "bg-rose-100/50 ring-2 ring-inset ring-rose-300"
      )}
    >
      {children}
    </div>
  );
}

function DraggableEvent({ event, clinic, heightPx, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: event
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
    top: 2, 
    height: `${heightPx}px`,
    zIndex: isDragging ? 50 : 10,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick(event, e); }}
      className={cn(
        "absolute inset-x-1 rounded-lg px-2 py-1 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all border-l-4 overflow-visible group/event",
        clinic.color, clinic.borderColor, "text-white"
      )}
      style={style}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold leading-tight truncate">{event.patient}</p>
        <span className="text-[9px] opacity-80 font-mono">{event.startTime} ({event.durationMinutes}m)</span>
      </div>
      <p className="text-[10px] opacity-90 truncate">{event.title} · {clinic.name}</p>
      
      {/* Tooltip Quick Preview */}
      <div className="absolute top-0 right-full mr-2 hidden group-hover/event:block bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl w-52 z-[100] pointer-events-none">
        <p className="font-bold text-sm mb-1">{event.patient}</p>
        {event.patientHistoriaId && <p className="text-slate-300 text-[11px] flex items-center gap-1.5"><User className="h-3 w-3" /> {event.patientHistoriaId}</p>}
        {event.patientPhone && <p className="text-slate-300 text-[11px] flex items-center gap-1.5 mt-0.5"><Phone className="h-3 w-3" /> {event.patientPhone}</p>}
        {event.patientEmail && <p className="text-slate-300 text-[11px] flex items-center gap-1.5 mt-0.5"><Mail className="h-3 w-3" /> {event.patientEmail}</p>}
      </div>
    </div>
  );
}

export function CalendarView({ selectedClinicId = "all" }: { selectedClinicId?: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>(DEFAULT_CLINICS);

  const fetchAppointments = useCallback(async () => {
    try {
      // Fetch real clinics from database
      const { data: dbClinics } = await (supabase as any)
        .from("clinics")
        .select("id, name, color_hex, base_commission_pct")
        .order("name");

      let loadedClinics: Clinic[] = [];
      if (dbClinics && dbClinics.length > 0) {
        loadedClinics = dbClinics.map((c: any, index: number) => {
          const preset = COLOR_PRESETS[index % COLOR_PRESETS.length];
          return {
            id: c.id,
            name: c.name,
            color: preset.bg,
            borderColor: preset.border,
            labDiscount: 0,
            baseCommission: c.base_commission_pct || 40,
          };
        });
        setClinics(loadedClinics);
      } else {
        setClinics(DEFAULT_CLINICS);
      }

      // Fetch appointments
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, appointment_date, reason, status, notes, clinic_id,
          clinics ( id, name ),
          professionals ( first_name, last_name ),
          patients ( first_name, last_name, historia_id, phone, email )
        `);

      if (!error && data) {
        const mapped: AppointmentEvent[] = data.map((a: any) => {
          const d = new Date(a.appointment_date);
          const hours = String(d.getHours()).padStart(2, "0");
          const minutes = String(d.getMinutes()).padStart(2, "0");
          const p = a.patients;
          const prof = a.professionals;
          const cl = a.clinics;
          const actualClinicId = cl?.id || a.clinic_id || (loadedClinics[0]?.id || "albacete");

          return {
            id: a.id,
            title: a.reason || "Consulta",
            date: d,
            startTime: `${hours}:${minutes}`,
            durationMinutes: 45,
            clinicId: actualClinicId,
            patient: p ? `${p.first_name} ${p.last_name}` : "Paciente",
            patientHistoriaId: p?.historia_id ?? undefined,
            patientPhone: p?.phone ?? undefined,
            patientEmail: p?.email ?? undefined,
            doctor: (() => {
              const baseDoc = prof ? `${prof.first_name} ${prof.last_name}` : "Dra. Osly Melo";
              const guestMatch = a.notes ? a.notes.match(/\[DoctorInvitado:\s*(.*?)\]/i) : null;
              return guestMatch ? `${baseDoc} (+ ${guestMatch[1]})` : baseDoc;
            })(),
            price: 0,
            labCost: 0,
          };
        });
        setEvents(mapped);
      }
    } catch (err) {
      console.error("Error cargando citas de Supabase:", err);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();

    function handleSwitchToToday() {
      setCurrentDate(new Date());
      setViewMode("day");
    }

    function handleApptCreated() {
      fetchAppointments();
    }

    window.addEventListener("switch-to-today-day-view", handleSwitchToToday);
    window.addEventListener("appointment-created", handleApptCreated);
    return () => {
      window.removeEventListener("switch-to-today-day-view", handleSwitchToToday);
      window.removeEventListener("appointment-created", handleApptCreated);
    };
  }, [fetchAppointments]);

  // New/Edit Modal state
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const handlePrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getClinic = (id: string) => clinics.find((c) => c.id === id) || clinics[0];

  const handleCellClick = (date: Date, timeSlot: string) => {
    triggerNewAppointmentModal({
      date: format(date, "yyyy-MM-dd"),
      time: timeSlot,
    });
  };

  const handleEventClick = (e: AppointmentEvent, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedEvent(e);
    setIsDetailOpen(true);
  };

  const handleUpdateEvent = (updated: AppointmentEvent) => {
    setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
    setSelectedEvent(updated);
  };

  const handleDragEnd = async (eventDrag: DragEndEvent) => {
    const { active, over } = eventDrag;
    if (!over) return;

    const eventId = active.id as string;
    const dropData = over.id as string; // Format: "YYYY-MM-DD|HH:mm"
    const [dateStr, timeSlot] = dropData.split("|");
    const [hh, mm] = (timeSlot || "09:00").split(":");

    const newDate = new Date(dateStr);
    newDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

    setEvents(prev => prev.map(evt => {
      if (evt.id === eventId) {
        return {
          ...evt,
          date: newDate,
          startTime: timeSlot
        };
      }
      return evt;
    }));

    try {
      await supabase.from("appointments").update({
        appointment_date: newDate.toISOString(),
      }).eq("id", eventId);
    } catch (err) {
      console.error("Error actualizando fecha de cita en Supabase:", err);
    }
  };

  const displayEvents = events.filter((e) => {
    if (!selectedClinicId || selectedClinicId === "all") return true;
    return e.clinicId === selectedClinicId;
  });

  return (
    <Card className="border-0 shadow-xl rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-0">
        {/* Toolbar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <button
                onClick={handleNext}
                className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                title="Siguiente"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shadow-xs"
            >
              <Sun className="h-3.5 w-3.5" />
              Hoy
            </button>

            <h2 className="text-base font-bold text-slate-800 ml-2">
              {format(currentDate, "MMMM yyyy", { locale: es }).toUpperCase()}
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Mes
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Semana
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "day" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Día
            </button>
          </div>
        </div>

        {/* ---------------- VISTA MENSUAL ---------------- */}
        {viewMode === "month" && (
          <div className="p-4">
            <div className="grid grid-cols-7 text-center font-semibold text-xs text-slate-400 py-2 border-b border-slate-100">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr gap-1 pt-2">
              {eachDayOfInterval({
                start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
                end: addDays(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 34),
              }).map((day) => {
                const dayEvents = displayEvents.filter((e) => isSameDay(e.date, day));
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode("day");
                    }}
                    className={cn(
                      "min-h-[95px] p-2 border rounded-xl cursor-pointer transition-all hover:border-rose-300",
                      isCurrentMonth ? "bg-white border-slate-100" : "bg-slate-50/50 border-transparent text-slate-300",
                      isToday && "ring-2 ring-rose-500 bg-rose-50/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold", isToday ? "text-rose-600" : "text-slate-700")}>
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 mt-1.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => {
                        const cl = getClinic(evt.clinicId);
                        return (
                          <div
                            key={evt.id}
                            className={cn("text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white", cl.color)}
                          >
                            {evt.startTime} {evt.patient}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- VISTA SEMANAL / DÍA GRID (15-MIN SLOTS) ---------------- */}
        {(viewMode === "week" || viewMode === "day") && (
          <DndContext onDragEnd={handleDragEnd}>
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 300px)", minHeight: 520 }}>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `70px repeat(${viewMode === "week" ? 7 : 1}, 1fr)`,
                  minWidth: viewMode === "week" ? 800 : 350,
                }}
              >
                <div className="sticky top-0 z-10 bg-white border-b border-slate-100 h-14" />
                {(viewMode === "week" ? weekDays : [currentDate]).map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "sticky top-0 z-10 bg-white border-b border-slate-100 h-14 flex flex-col items-center justify-center gap-0.5",
                      isSameDay(day, today) && "bg-rose-50"
                    )}
                  >
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {format(day, "EEEE", { locale: es })}
                    </span>
                    <span className={cn("text-base font-bold leading-none", isSameDay(day, today) ? "text-rose-500" : "text-slate-800")}>
                      {format(day, "d MMM")}
                    </span>
                  </div>
                ))}

                {TIME_SLOTS.map((slot) => (
                  <React.Fragment key={slot}>
                    <div className="flex items-start justify-end pr-2.5 pt-0.5 border-r border-slate-100 h-9 bg-slate-50/30">
                      {slot.endsWith(":00") || slot.endsWith(":30") ? (
                        <span className="text-[10px] text-slate-400 font-semibold">{slot}</span>
                      ) : null}
                    </div>

                    {(viewMode === "week" ? weekDays : [currentDate]).map((day) => {
                      const slotEvents = displayEvents.filter(
                        (e) => isSameDay(e.date, day) && e.startTime === slot
                      );
                      const isToday = isSameDay(day, today);
                      const cellId = `${format(day, "yyyy-MM-dd")}|${slot}`;
                      return (
                        <DroppableCell
                          key={cellId}
                          id={cellId}
                          day={day}
                          slot={slot}
                          isToday={isToday}
                          onCellClick={handleCellClick}
                        >
                          {slotEvents.map((evt) => {
                            const cl = getClinic(evt.clinicId);
                            const heightPx = Math.max(32, (evt.durationMinutes / 15) * 36 - 4);
                            return (
                              <DraggableEvent
                                key={evt.id}
                                event={evt}
                                clinic={cl}
                                heightPx={heightPx}
                                onClick={handleEventClick}
                              />
                            );
                          })}
                        </DroppableCell>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </DndContext>
        )}

      </CardContent>

      {/* ---------------- APPOINTMENT DETAIL DRAWER ---------------- */}
      <AppointmentDetailDrawer
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateEvent={handleUpdateEvent}
      />
    </Card>
  );
}
