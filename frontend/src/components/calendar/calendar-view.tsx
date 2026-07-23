"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, addDays, subDays, addWeeks, subWeeks, startOfMonth, addMonths, subMonths, isSameMonth, isSameDay, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useDroppable, useDraggable, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Sparkles, Building2, User, Stethoscope, Calculator, CalendarCheck, ChevronLeft, ChevronRight, Clock, CalendarDays, Calendar as CalendarIcon, Sun, FileText, Settings2, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { AppointmentDetailDrawer } from "@/components/calendar/appointment-detail-drawer";
import { triggerNewAppointmentModal } from "@/components/calendar/new-appointment-modal";

export interface Clinic {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  labDiscount: number;
  baseCommission: number;
}

export interface AppointmentEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string; // HH:mm
  durationMinutes: number;
  clinicId: string;
  patient: string;
  patientId?: string;
  patientHistoriaId?: string;
  patientPhone?: string;
  patientEmail?: string;
  doctor: string;
  price: number;
  labCost: number;
}

const COLOR_PRESETS = [
  { bg: "bg-blue-600", border: "border-blue-600" },
  { bg: "bg-emerald-600", border: "border-emerald-600" },
  { bg: "bg-violet-600", border: "border-violet-600" },
  { bg: "bg-amber-600", border: "border-amber-600" },
  { bg: "bg-rose-600", border: "border-rose-600" },
];

export const DEFAULT_CLINICS: Clinic[] = [
  {
    id: "goya",
    name: "Clínica Goya",
    color: "bg-blue-600",
    borderColor: "border-blue-600",
    labDiscount: 50,
    baseCommission: 60,
  },
  {
    id: "albacete",
    name: "Clínica Albacete",
    color: "bg-emerald-600",
    borderColor: "border-emerald-600",
    labDiscount: 50,
    baseCommission: 60,
  },
];

type ViewMode = "month" | "week" | "day";

// 15-minute grid slots from 07:00 to 23:45 so all morning, evening & night appointments fit
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 23; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    TIME_SLOTS.push(`${hh}:${mm}`);
  }
}

const today = new Date();

/**
 * Rounds any arbitrary minute/second time to the nearest 15-minute slot
 * so events always align with the grid in Day/Week view.
 */
function roundToNearestSlot(d: Date): string {
  const hours = d.getHours();
  const mins = d.getMinutes();
  const roundedMins = Math.round(mins / 15) * 15;

  let finalHours = hours;
  let finalMins = roundedMins;

  if (finalMins === 60) {
    finalHours = (hours + 1) % 24;
    finalMins = 0;
  }

  const hh = String(finalHours).padStart(2, "0");
  const mm = String(finalMins).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Droppable Cell for DnD
function DroppableCell({
  id,
  day,
  slot,
  isToday,
  onCellClick,
  children,
}: {
  id: string;
  day: Date;
  slot: string;
  isToday: boolean;
  onCellClick: (day: Date, slot: string) => void;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onCellClick(day, slot)}
      className={cn(
        "border-r border-b border-slate-100/70 p-0.5 relative group cursor-pointer transition-colors min-h-[36px]",
        isToday ? "bg-rose-50/10 hover:bg-rose-50/30" : "hover:bg-slate-50/80",
        isOver && "bg-rose-100/60 ring-2 ring-rose-400 ring-inset"
      )}
    >
      <div className="w-full h-full flex flex-col gap-1">{children}</div>
    </div>
  );
}

// Draggable Event Box
function DraggableEvent({
  event,
  clinic,
  heightPx,
  onClick,
  onDoubleClick,
  viewMode,
  dayIndex,
}: {
  event: AppointmentEvent;
  clinic: Clinic;
  heightPx: number;
  onClick: (e: AppointmentEvent, event: React.MouseEvent) => void;
  onDoubleClick?: (e: AppointmentEvent) => void;
  viewMode: ViewMode;
  dayIndex: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
  });

  const style: React.CSSProperties = {
    height: `${heightPx}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 50 : 10,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={(e) => onClick(event, e)}
      onDoubleClick={() => onDoubleClick?.(event)}
      className={cn(
        "w-full rounded-lg px-2 py-1 flex flex-col justify-between text-white transition-all shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing text-left select-none overflow-hidden",
        clinic.color
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold text-[11px] leading-tight truncate">{event.patient}</span>
        <span className="text-[9px] opacity-80 shrink-0 font-medium">{event.startTime}</span>
      </div>
      <p className="text-[10px] opacity-90 truncate pointer-events-none">{event.title} · {clinic.name}</p>
    </div>
  );
}

export function CalendarView({ selectedClinicId = "all" }: { selectedClinicId?: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>(DEFAULT_CLINICS);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 15,
      },
    })
  );

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
          const slotTime = roundToNearestSlot(d);
          const p = a.patients;
          const prof = a.professionals;
          const cl = a.clinics;
          const actualClinicId = cl?.id || a.clinic_id || (loadedClinics[0]?.id || "albacete");

          return {
            id: a.id,
            title: a.reason || "Consulta",
            date: d,
            startTime: slotTime,
            durationMinutes: 45,
            clinicId: actualClinicId,
            patient: p ? `${p.first_name} ${p.last_name}` : "Paciente",
            patientId: p?.id,
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

    const currentEvt = events.find(e => e.id === eventId);
    if (!currentEvt) return;

    const newDate = new Date(dateStr);
    newDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

    // GUARD: If date and time slot didn't change, DO NOTHING!
    if (isSameDay(currentEvt.date, newDate) && currentEvt.startTime === timeSlot) {
      return;
    }

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
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Toolbar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <button
              onClick={handleNext}
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shadow-xs cursor-pointer"
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
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              viewMode === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Mes
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Semana
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
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

      {/* ---------------- VISTA SEMANAL / DÍA GRID (15-MIN SLOTS 07:00-23:45) ---------------- */}
      {(viewMode === "week" || viewMode === "day") && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="w-full">
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

                  {(viewMode === "week" ? weekDays : [currentDate]).map((day, dayIndex) => {
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
                              onDoubleClick={(e: any) => window.location.href = `/appointments/${e.id}`}
                              viewMode={viewMode}
                              dayIndex={dayIndex}
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

      {/* ---------------- APPOINTMENT DETAIL DRAWER ---------------- */}
      <AppointmentDetailDrawer
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateEvent={handleUpdateEvent}
      />
    </div>
  );
}
