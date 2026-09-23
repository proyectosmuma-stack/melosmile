"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, addDays, subDays, addWeeks, subWeeks, startOfMonth, addMonths, subMonths, addYears, subYears, isSameMonth, isSameDay, eachDayOfInterval, endOfWeek, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useDroppable, useDraggable, DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { Sparkles, Building2, User, Stethoscope, Calculator, CalendarCheck, ChevronLeft, ChevronRight, Clock, CalendarDays, Calendar as CalendarIcon, Sun, FileText, Settings2, Phone, Mail, Loader2, Users, Plus, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { AppointmentDetailDrawer } from "@/components/calendar/appointment-detail-drawer";
import { RescheduleConfirmModal } from "@/components/calendar/reschedule-confirm-modal";
import { triggerNewAppointmentModal } from "@/components/calendar/new-appointment-modal";
import { AttachmentBadges } from "@/components/calendar/attachment-badges";
import { AppointmentPopover } from "@/components/calendar/appointment-popover";
import { isImageDocument } from "@/lib/utils/document-utils";
import { getCleanNotesPreview } from "@/lib/appointments/notes-parser";

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
  hasPhotos: boolean;
  hasDocs: boolean;
  photoCount: number;
  docCount: number;
  hasNotes: boolean;
  status?: string;
  notes?: string;
  previousNotes?: string;
  previousDate?: string;
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

type ViewMode = "year" | "month" | "week" | "day";

// 15-minute grid slots from 09:30 to 20:30 — clinic opening hours
const TIME_SLOTS: string[] = [];
for (let totalMins = 9 * 60 + 30; totalMins <= 20 * 60 + 30; totalMins += 15) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  TIME_SLOTS.push(`${hh}:${mm}`);
}



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

function getDateRangeForView(currentDate: Date, viewMode: ViewMode): { start: Date; end: Date } {
  const center = currentDate || new Date();
  switch (viewMode) {
    case "day":
      return {
        start: new Date(center.getFullYear(), center.getMonth(), center.getDate()),
        end: new Date(center.getFullYear(), center.getMonth(), center.getDate(), 23, 59, 59, 999),
      };
    case "week":
      return {
        start: subDays(startOfWeek(center, { weekStartsOn: 1 }), 7),
        end: addDays(endOfWeek(center, { weekStartsOn: 1 }), 7),
      };
    case "month":
      return {
        start: subDays(startOfMonth(center), 7),
        end: addDays(endOfMonth(center), 7),
      };
    case "year":
    default:
      return {
        start: subDays(new Date(center.getFullYear(), center.getMonth(), 1), 45),
        end: addDays(new Date(center.getFullYear(), center.getMonth() + 1, 0), 45),
      };
  }
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
        "border-r border-b border-border/60 p-0.5 relative group cursor-pointer transition-colors min-h-[36px]",
        isToday ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/80",
        isOver && "bg-primary/15 ring-2 ring-primary ring-inset"
      )}
    >
      <div className="w-full h-full flex flex-col gap-1">{children}</div>
    </div>
  );
}

function getEventStatusMeta(rawStatus?: string) {
  const s = (rawStatus ?? "Pendiente").trim();
  const lower = s.toLowerCase();

  if (lower === "confirmada" || lower === "confirmed") {
    return {
      label: "Confirmada",
      shortLabel: "Conf.",
      icon: "✓",
      dotCls: "bg-emerald-300",
      badgeCls: "bg-emerald-950/40 text-emerald-200 border border-emerald-400/40",
    };
  }
  if (lower === "pendiente" || lower === "pending") {
    return {
      label: "Pendiente",
      shortLabel: "Pend.",
      icon: "⏳",
      dotCls: "bg-amber-300",
      badgeCls: "bg-amber-950/40 text-amber-200 border border-amber-300/40 font-semibold",
    };
  }
  if (lower === "cancelada" || lower === "cancelled" || lower === "canceled") {
    return {
      label: "Cancelada",
      shortLabel: "Canc.",
      icon: "✕",
      dotCls: "bg-rose-400",
      badgeCls: "bg-red-950/50 text-red-200 border border-red-400/50 font-semibold line-through decoration-red-300/60",
    };
  }
  if (lower === "realizada" || lower === "completada" || lower === "completed" || lower === "done") {
    return {
      label: "Realizada",
      shortLabel: "Realiz.",
      icon: "✓",
      dotCls: "bg-sky-300",
      badgeCls: "bg-blue-950/40 text-blue-200 border border-blue-400/40",
    };
  }
  if (lower === "en proceso" || lower === "in progress") {
    return {
      label: "En Proceso",
      shortLabel: "Proceso",
      icon: "⚡",
      dotCls: "bg-purple-300",
      badgeCls: "bg-purple-950/40 text-purple-200 border border-purple-400/40 font-semibold",
    };
  }
  if (lower === "no presentado" || lower === "no show") {
    return {
      label: "No Presentado",
      shortLabel: "No Asistió",
      icon: "—",
      dotCls: "bg-zinc-400",
      badgeCls: "bg-zinc-900/50 text-zinc-300 border border-zinc-500/40",
    };
  }

  return {
    label: s || "Pendiente",
    shortLabel: s ? s.slice(0, 5) : "Pend.",
    icon: "•",
    dotCls: "bg-white/70",
    badgeCls: "bg-white/20 text-white border border-white/30",
  };
}

// Draggable Event Box (Notion/Apple Chip Style)
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

  const hasAnyBadge = event.photoCount > 0 || event.docCount > 0 || event.hasNotes;
  const statusMeta = getEventStatusMeta(event.status);

  // Derived styles for chip
  const bgTranslucent = clinic.color.replace('bg-', 'bg-').replace('-600', '-600/15');
  const borderLeft = clinic.borderColor.replace('border-', 'border-l-');
  const textDark = clinic.color.replace('bg-', 'text-');

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={(e) => onClick(event, e)}
      onDoubleClick={() => onDoubleClick?.(event)}
      className={cn(
        "w-full rounded-[4px] px-2 py-1 flex flex-col justify-start transition-all cursor-grab active:cursor-grabbing text-left select-none overflow-hidden border-l-[3px]",
        borderLeft,
        bgTranslucent,
        "hover:brightness-95 dark:hover:brightness-110"
      )}
    >
      <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusMeta.dotCls)} title={`Estado: ${statusMeta.label}`} />
        <span className={cn("font-semibold text-[11px] leading-tight truncate flex-1", textDark)}>
          <span className="font-bold opacity-80">{event.startTime}</span> {event.patient}
        </span>
        {hasAnyBadge && (
           <div className="scale-75 origin-right">
             <AttachmentBadges
               photoCount={event.photoCount}
               docCount={event.docCount}
               hasNotes={event.hasNotes}
               size="xs"
             />
           </div>
        )}
      </div>
      {heightPx >= 40 && (
        <div className="flex items-center gap-1 mt-0.5 overflow-hidden shrink-0 text-muted-foreground">
          <span className="text-[10px] leading-none font-medium truncate">
            {statusMeta.icon} {statusMeta.label}
            {event.title && event.title !== "Consulta" && ` · ${event.title}`}
          </span>
        </div>
      )}
    </div>
  );
}

export function CalendarView({ 
  selectedClinicId = "all",
  stats,
  loadingStats
}: { 
  selectedClinicId?: string;
  stats?: { appointmentsToday: number; patientsThisMonth: number };
  loadingStats?: boolean;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>(DEFAULT_CLINICS);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date>(new Date());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
          patients ( id, first_name, last_name, historia_id, phone, email )
        `);

      if (!error && data) {
        // --- Adjuntos: una sola query extra para todas las citas ---
        const rawIds = (data as any[]).map((a: any) => a.id).filter(Boolean) as string[];
        const docCountMap = new Map<string, { photos: number; docs: number }>();
        if (rawIds.length > 0) {
          try {
            const { data: docsData, error: docsError } = await (supabase as any)
              .from("documents")
              .select("appointment_id, document_type, file_name, mime_type")
              .in("appointment_id", rawIds);
            if (!docsError && Array.isArray(docsData)) {
              for (const doc of docsData as any[]) {
                const apptId = doc.appointment_id as string | null;
                if (!apptId) continue;
                const cur = docCountMap.get(apptId) ?? { photos: 0, docs: 0 };
                const isImg = isImageDocument({
                  document_type: doc.document_type ?? null,
                  file_name: doc.file_name ?? null,
                  mime_type: doc.mime_type ?? null,
                });
                if (isImg) cur.photos += 1;
                else cur.docs += 1;
                docCountMap.set(apptId, cur);
              }
            } else if (docsError) {
              console.warn("No se pudieron cargar adjuntos del calendario:", docsError.message);
            }
          } catch (e: any) {
            console.warn("Error silencioso al contar adjuntos:", e?.message ?? e);
          }
        }

        const mapped: AppointmentEvent[] = (data as any[]).map((a: any) => {
          const d = new Date(a.appointment_date);
          const slotTime = roundToNearestSlot(d);
          const p = a.patients;
          const prof = a.professionals;
          const cl = a.clinics;
          const actualClinicId = cl?.id || a.clinic_id || (loadedClinics[0]?.id || "albacete");
          const rawNotes: string | null = a.notes ?? null;
          const hasNotes =
            !!rawNotes &&
            !rawNotes.includes("[Odontograma:") &&
            !rawNotes.includes("[DoctorInvitado:");
          const counts = docCountMap.get(a.id) ?? { photos: 0, docs: 0 };

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
              const guestMatch = rawNotes ? rawNotes.match(/\[DoctorInvitado:\s*(.*?)\]/i) : null;
              return guestMatch ? `${baseDoc} (+ ${guestMatch[1]})` : baseDoc;
            })(),
            price: 0,
            labCost: 0,
            hasPhotos: counts.photos > 0,
            hasDocs: counts.docs > 0,
            photoCount: counts.photos,
            docCount: counts.docs,
            hasNotes,
            status: a.status ?? undefined,
            notes: rawNotes ?? undefined,
          };
        });

        // Fetch previous appointments for each patient
        const uniquePatientIds = Array.from(new Set(mapped.map(event => event.patientId).filter(Boolean)));

        if (uniquePatientIds.length > 0) {
          const { data: prevData } = await (supabase as any)
            .from("appointments")
            .select("id, patient_id, appointment_date, notes")
            .in("patient_id", uniquePatientIds);

          if (prevData) {
            const groupedPrevData = prevData.reduce((acc: any, curr: any) => {
              if (!acc[curr.patient_id]) {
                acc[curr.patient_id] = [];
              }
              acc[curr.patient_id].push(curr);
              return acc;
            }, {});

            mapped.forEach(event => {
              if (event.patientId && groupedPrevData[event.patientId]) {
                const patientAppointments = groupedPrevData[event.patientId]
                  .filter((prevAppt: any) => new Date(prevAppt.appointment_date) < event.date)
                  .sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

                if (patientAppointments.length > 0) {
                  const previousAppt = patientAppointments[0];
                  const prevRawNotes: string | null = previousAppt.notes ?? null;
                  const prevHasNotes =
                    !!prevRawNotes &&
                    !prevRawNotes.includes("[Odontograma:") &&
                    !prevRawNotes.includes("[DoctorInvitado:");
                  
                  if (prevHasNotes) {
                    event.previousNotes = prevRawNotes;
                    event.previousDate = previousAppt.appointment_date;
                  }
                }
              }
            });
          }
        }
        setEvents(mapped);
      }
    } catch (err) {
      console.error("Error cargando citas de Supabase:", err);
    }
  }, []);

  const handleRescheduleConfirm = async (newTime: string) => {
    if (!rescheduleModal.evt || !rescheduleModal.targetDate) return;
    
    const { evt, targetDate } = rescheduleModal;
    setRescheduleModal({ isOpen: false, evt: null, targetDate: null });

    const newDate = new Date(targetDate);
    const [hh, mm] = newTime.split(":");
    newDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

    // Update state optimistically
    setEvents(prev => prev.map(e => {
      if (e.id === evt.id) {
        return { ...e, date: newDate, startTime: newTime };
      }
      return e;
    }));

    try {
      // Call Supabase API
      const tzOffset = newDate.getTimezoneOffset() * 60000;
      const localISOTime = new Date(newDate.getTime() - tzOffset).toISOString();
      const updatedDateOnly = localISOTime.split("T")[0];

      await fetch("/api/appointments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: evt.id,
          updates: {
            appointment_date: updatedDateOnly,
            appointment_time: newTime + ":00"
          }
        })
      });
    } catch (error) {
      console.error("Error updating appointment via DND:", error);
    }
  };

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
  const [popoverState, setPopoverState] = useState<{ event: AppointmentEvent, clinic: Clinic, x: number, y: number } | null>(null);

  // DND State for Rescheduling
  const [activeDragEvt, setActiveDragEvt] = useState<AppointmentEvent | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ isOpen: boolean, evt: AppointmentEvent | null, targetDate: Date | null }>({ isOpen: false, evt: null, targetDate: null });

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const handlePrev = () => {
    if (viewMode === "year") setCurrentDate(subYears(currentDate, 1));
    else if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === "year") setCurrentDate(addYears(currentDate, 1));
    else if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Now Line functionality
  const [nowTop, setNowTop] = useState<number>(-1);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateNowLine = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      
      const startMinutes = 9 * 60 + 30; // 09:30
      const endMinutes = 20 * 60 + 30;  // 20:30
      
      if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
        // Each 15 mins is 36px (from h-9 class). 36px / 15m = 2.4px per minute.
        const offsetMinutes = totalMinutes - startMinutes;
        const top = offsetMinutes * 2.4 + 56; // 56px is the height of the sticky header
        setNowTop(top);
      } else {
        setNowTop(-1); // Outside of calendar grid hours
      }
    };

    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);
    
    // Auto-scroll on mount if it's week/day view and now is within bounds
    setTimeout(() => {
      if (scrollRef.current && (viewMode === "week" || viewMode === "day")) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        const startMinutes = 9 * 60 + 30;
        
        if (totalMinutes >= startMinutes) {
          const offsetMinutes = totalMinutes - startMinutes;
          // scroll to center the red line
          scrollRef.current.scrollTo({
            top: offsetMinutes * 2.4 - 100,
            behavior: "smooth"
          });
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [viewMode]);

  // Listen for sidebar mini-calendar selection
  useEffect(() => {
    const handleSidebarSelect = (e: any) => {
      if (e.detail?.date) {
        setCurrentDate(e.detail.date);
        setViewMode("day");
      }
    };
    window.addEventListener("sidebar-date-select", handleSidebarSelect);
    return () => window.removeEventListener("sidebar-date-select", handleSidebarSelect);
  }, []);

  const getClinic = (id: string) => clinics.find((c) => c.id === id) || clinics[0];

  const handleCellClick = (date: Date, timeSlot: string) => {
    triggerNewAppointmentModal({
      date: format(date, "yyyy-MM-dd"),
      time: timeSlot,
    });
  };

  const handleEventClick = (e: AppointmentEvent, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isMobile || (typeof window !== "undefined" && window.innerWidth < 768)) {
      setSelectedEvent(e);
      setIsDetailOpen(true);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const cl = getClinic(e.clinicId);
    // Position popover at the bottom-center of the event chip
    setPopoverState({ 
      event: e, 
      clinic: cl,
      x: rect.left + rect.width / 2, 
      y: rect.bottom 
    });
  };

  const handleUpdateEvent = (updated: AppointmentEvent) => {
    setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
    setSelectedEvent(updated);
  };

  const handleDragStart = (eventDrag: DragStartEvent) => {
    const id = String(eventDrag.active.id);
    if (id.startsWith("agenda-evt-")) {
      const evtData = eventDrag.active.data.current?.evt as AppointmentEvent;
      setActiveDragEvt(evtData);
    }
  };

  const handleDragEnd = async (eventDrag: DragEndEvent) => {
    setActiveDragEvt(null);
    const { active, over } = eventDrag;
    console.log("=== DRAG END ===");
    console.log("Active ID:", active?.id);
    console.log("Over ID:", over?.id);

    if (!over) {
      console.log("Drag cancelled: no drop target (over is null)");
      return;
    }

    // Reschedule from Agenda to Month Grid
    if (String(active.id).startsWith("agenda-evt-") && String(over.id).startsWith("month-day-")) {
      const targetDateStr = String(over.id).replace("month-day-", "");
      const targetDate = new Date(targetDateStr);
      const evtData = active.data.current?.evt as AppointmentEvent;
      if (evtData) {
        setRescheduleModal({ isOpen: true, evt: evtData, targetDate });
      }
      return;
    }

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
    <div className="w-full h-full flex flex-col relative">
      {/* ---------------- MOBILE HEADER (Apple iOS Calendar Style) ---------------- */}
      <div className="flex md:hidden flex-col gap-1 px-3 pt-2 pb-2 sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/40">
        {/* Row 1: Top Navigation & View Switcher */}
        <div className="flex items-center justify-between">
          {/* Back button or Month Navigator */}
          {viewMode === "day" || viewMode === "week" ? (
            <button
              onClick={() => setViewMode("month")}
              className="flex items-center gap-1 text-xs font-bold text-primary active:scale-95 transition-transform cursor-pointer py-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="capitalize">{format(currentDate, "MMMM", { locale: es })}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted active:scale-90 transition-all cursor-pointer"
                title="Anterior"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={handleNext}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted active:scale-90 transition-all cursor-pointer"
                title="Siguiente"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <span className="text-xs font-bold text-foreground capitalize ml-1">
                {format(currentDate, "MMMM yyyy", { locale: es })}
              </span>
            </div>
          )}

          {/* Right Action Icons: View switcher & New appointment button */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40">
              <button
                onClick={() => setViewMode("year")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                  viewMode === "year" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Año
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                  viewMode === "month" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mes
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                  viewMode === "day" || viewMode === "week" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Día
              </button>
            </div>

            <button
              onClick={() => triggerNewAppointmentModal({})}
              className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
              title="Nueva Cita"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Week Strip (Apple Calendar iOS style) - Shown when in Day / Week mode */}
        {(viewMode === "day" || viewMode === "week") && (
          <div className="pt-2">
            <div className="grid grid-cols-7 text-center gap-1">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const dayEvents = displayEvents.filter((e) => isSameDay(e.date, day));
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode("day");
                    }}
                    className="flex flex-col items-center gap-0.5 py-1 rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      isToday ? "text-red-500 font-extrabold" : "text-muted-foreground"
                    )}>
                      {format(day, "EEEEE", { locale: es })}
                    </span>
                    <span className={cn(
                      "h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold transition-all",
                      isSelected 
                        ? "bg-red-500 text-white shadow-sm shadow-red-500/40" 
                        : isToday 
                          ? "text-red-500 font-bold border border-red-500/40" 
                          : "text-foreground hover:bg-muted/50"
                    )}>
                      {format(day, "d")}
                    </span>
                    <div className="h-1 flex items-center gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span key={idx} className={cn("h-1 w-1 rounded-full", getClinic(e.clinicId).color)} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Label */}
            <div className="text-center pt-1.5 pb-0.5 text-[11px] font-bold text-foreground/85 tracking-wide capitalize">
              {format(currentDate, "EEEE – d 'de' MMMM yyyy", { locale: es })}
            </div>
          </div>
        )}
      </div>

      {/* ---------------- DESKTOP TOOLBAR HEADER (Notion/Apple style: flat, integrated) ---------------- */}
      <div className="hidden md:flex flex-row items-center justify-between px-2 pt-3 sm:pt-4 pb-3 sm:pb-4 gap-4 sticky left-0 right-0 z-20 bg-background">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl">
            <button
              onClick={handlePrev}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-card hover:shadow-xs transition-all cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleNext}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-card hover:shadow-xs transition-all cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
          >
            Hoy
          </button>

          <h2 className="text-lg font-bold text-foreground ml-2 capitalize w-40">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* KPI Blocks from Dashboard */}
          {stats && (
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setViewMode("day");
                }}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-border/80 bg-card hover:bg-muted/50 transition-all shadow-sm cursor-pointer"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                <div className="text-left leading-tight">
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider">Citas (Hoy)</p>
                  <p className="text-xs font-bold text-foreground">
                    {loadingStats ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : stats.appointmentsToday}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-border/80 bg-card shadow-sm">
                <Users className="h-3.5 w-3.5 text-info" />
                <div className="text-left leading-tight">
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider">Pacientes (Mes)</p>
                  <p className="text-xs font-bold text-foreground">
                    {loadingStats ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : stats.patientsThisMonth}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl">
            <button
              onClick={() => setViewMode("year")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "year" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Año
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "day" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Día
            </button>
          </div>
          
          <button
            onClick={() => triggerNewAppointmentModal({})}
            className="ml-2 flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer"
          >
            <CalendarCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div 
          ref={scrollRef} 
          className={cn(
            "flex-1 w-full pb-20 md:pb-0",
            viewMode === "month" 
              ? "bg-transparent" 
              : "bg-card border border-border/80 shadow-xs sm:rounded-2xl overflow-y-auto overflow-x-auto"
          )}
        >
        {/* ---------------- VISTA MENSUAL (Desktop) ---------------- */}
        {viewMode === "month" && (
          <div className="hidden md:flex flex-row p-4 gap-4 h-full min-h-0">
            {/* Left: Month Grid */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-7 text-center font-semibold text-xs text-muted-foreground py-2 border-b border-border/60 shrink-0">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr gap-1 pt-2 flex-1 min-h-0">
              {eachDayOfInterval({
                start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
                end: addDays(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 34),
              }).map((day) => {
                const dayEvents = displayEvents.filter((e) => isSameDay(e.date, day));
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedMonthDay);
                return (
                  <DroppableMonthDayCell
                    key={day.toISOString()}
                    day={day}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    isSelected={isSelected}
                    dayEvents={dayEvents}
                    getClinic={getClinic}
                    getEventStatusMeta={getEventStatusMeta}
                    onClick={() => setSelectedMonthDay(day)}
                    onNewAppointment={() => {
                      triggerNewAppointmentModal({
                        date: format(day, "yyyy-MM-dd"),
                        time: "09:30"
                      });
                    }}
                  />
                );
              })}
              </div>
            </div>

            {/* Right: Agenda List for Selected Day */}
            <div className="w-80 shrink-0 flex flex-col bg-card/60 rounded-2xl border border-border/60 shadow-xs p-3 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-border/40 shrink-0">
                <h3 className="text-xs font-bold text-foreground capitalize">
                  {format(selectedMonthDay, "EEEE, d 'de' MMMM", { locale: es })}
                </h3>
                <button
                  onClick={() => {
                    setCurrentDate(selectedMonthDay);
                    setViewMode("day");
                  }}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Ver día completo →
                </button>
              </div>

              {(() => {
                const selectedDayEvents = displayEvents.filter((e) => isSameDay(e.date, selectedMonthDay));
                if (selectedDayEvents.length === 0) {
                  return (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No hay citas programadas para este día
                    </div>
                  );
                }
                return (
                  <div className="flex-1 overflow-y-auto mt-1 min-h-0 divide-y divide-border/30 pr-1">
                    {selectedDayEvents.map((evt) => {
                      const cl = getClinic(evt.clinicId);
                      const stMeta = getEventStatusMeta(evt.status);
                      return (
                        <DraggableAgendaItem
                          key={evt.id}
                          evt={evt}
                          onClick={() => {
                            setSelectedEvent(evt);
                            setIsDetailOpen(true);
                          }}
                          getClinic={getClinic}
                          getEventStatusMeta={getEventStatusMeta}
                        />
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ---------------- VISTA MENSUAL (Mobile Apple iOS Hybrid) ---------------- */}
        {viewMode === "month" && (
          <div className="block md:hidden p-3">
            {/* Month Grid Header */}
            <div className="grid grid-cols-7 text-center font-bold text-[11px] text-muted-foreground py-1.5 border-b border-border/40">
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Month Grid Days */}
            <div className="grid grid-cols-7 gap-1 pt-2">
              {eachDayOfInterval({
                start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
                end: addDays(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 34),
              }).map((day) => {
                const dayEvents = displayEvents.filter((e) => isSameDay(e.date, day));
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedMonthDay);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedMonthDay(day)}
                    className={cn(
                      "h-11 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer relative",
                      isSelected ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-muted/40",
                      !isCurrentMonth && "opacity-30"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-bold leading-tight",
                      isToday ? "text-red-500 font-extrabold" : (isSelected ? "text-primary" : "text-foreground")
                    )}>
                      {format(day, "d")}
                    </span>
                    <div className="flex gap-0.5 mt-1 h-1 items-center">
                      {dayEvents.slice(0, 3).map((evt, idx) => (
                        <span key={idx} className={cn("w-1 h-1 rounded-full", getClinic(evt.clinicId).color)} />
                      ))}
                      {dayEvents.length > 3 && <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Agenda List of Appointments for Selected Day (Apple iOS style) */}
            <div className="mt-4 p-3 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/60 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <h3 className="text-xs font-bold text-foreground capitalize">
                  {format(selectedMonthDay, "EEEE, d 'de' MMMM", { locale: es })}
                </h3>
                <button
                  onClick={() => {
                    setCurrentDate(selectedMonthDay);
                    setViewMode("day");
                  }}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Ver día completo →
                </button>
              </div>

              {(() => {
                const selectedDayEvents = displayEvents.filter((e) => isSameDay(e.date, selectedMonthDay));
                if (selectedDayEvents.length === 0) {
                  return (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No hay citas programadas para este día
                    </div>
                  );
                }
                return (
                  <div className="divide-y divide-border/30 mt-1">
                    {selectedDayEvents.map((evt) => {
                      const cl = getClinic(evt.clinicId);
                      const stMeta = getEventStatusMeta(evt.status);
                      return (
                        <DraggableAgendaItem
                          key={evt.id}
                          evt={evt}
                          onClick={() => {
                            setSelectedEvent(evt);
                            setIsDetailOpen(true);
                          }}
                          getClinic={getClinic}
                          getEventStatusMeta={getEventStatusMeta}
                        />
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ---------------- VISTA ANUAL ---------------- */}
        {viewMode === "year" && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10">
            {Array.from({ length: 12 }, (_, i) => {
              const monthDate = new Date(currentDate.getFullYear(), i, 1);
              const startDay = startOfWeek(monthDate, { weekStartsOn: 1 });
              const days = eachDayOfInterval({
                start: startDay,
                end: addDays(startDay, 41) // 6 weeks per grid
              });

              return (
                <div key={i} className="flex flex-col">
                  <button 
                    onClick={() => {
                      setCurrentDate(monthDate);
                      setViewMode("month");
                    }}
                    className="text-sm font-bold text-primary mb-3 text-left hover:underline capitalize"
                  >
                    {format(monthDate, "MMMM", { locale: es })}
                  </button>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground font-semibold mb-2">
                    {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                    {days.map((day, idx) => {
                      const isCurrentMonth = isSameMonth(day, monthDate);
                      const isToday = isSameDay(day, new Date());
                      const hasEvent = displayEvents.some(e => isSameDay(e.date, day));

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setCurrentDate(day);
                            setViewMode("day");
                          }}
                          className={cn(
                            "h-7 w-7 rounded-full flex flex-col items-center justify-center text-xs transition-all mx-auto",
                            isCurrentMonth ? "text-foreground hover:bg-muted" : "text-muted-foreground/30",
                            isToday && "bg-red-500 text-white font-bold shadow-sm shadow-red-500/40 hover:bg-red-600",
                            !isToday && hasEvent && isCurrentMonth && "font-bold text-primary"
                          )}
                        >
                          {format(day, "d")}
                          {!isToday && hasEvent && isCurrentMonth && (
                            <div className="w-1 h-1 rounded-full bg-primary mt-[1px]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- VISTA SEMANAL / DÍA GRID (15-MIN SLOTS 07:00-23:45) ---------------- */}
        {(viewMode === "week" || viewMode === "day") && (
          <div className="w-full">
            <div
              className="grid relative min-h-full"
              style={{
                gridTemplateColumns: isMobile 
                  ? "55px 1fr" 
                  : `70px repeat(${viewMode === "week" ? 7 : 1}, 1fr)`,
                minWidth: isMobile ? "100%" : (viewMode === "week" ? 800 : 350),
              }}
            >
              {/* NOW LINE (Apple Style) */}
              {nowTop > 0 && (
                <div 
                  className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                  style={{ top: `${nowTop}px` }}
                >
                  <div className={cn(isMobile ? "w-[55px]" : "w-[70px]", "flex justify-end pr-1")}>
                    <span className="bg-red-500 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums">
                      {format(new Date(), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex-1 h-0.5 bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                </div>
              )}

              {/* Desktop Sticky Header - Hidden on mobile because Week Bar is in the header */}
              <div className="hidden md:block sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border/60 h-14" />
              {(isMobile ? [currentDate] : (viewMode === "week" ? weekDays : [currentDate])).map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "hidden md:flex sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border/60 h-14 flex-col items-center justify-center gap-0.5"
                  )}
                >
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isSameDay(day, new Date()) ? "text-primary" : "text-muted-foreground")}>
                    {format(day, "EEEE", { locale: es })}
                  </span>
                  <span className={cn("text-base font-bold leading-none h-7 w-7 flex items-center justify-center rounded-full", isSameDay(day, new Date()) ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground")}>
                    {format(day, "d")}
                  </span>
                </div>
              ))}

              {TIME_SLOTS.map((slot) => (
                <React.Fragment key={slot}>
                  <div className="flex items-start justify-end pr-1.5 md:pr-2.5 pt-0.5 border-r border-border/60 h-9 bg-muted/30">
                    {slot.endsWith(":00") || slot.endsWith(":30") ? (
                      <span className="text-[9px] md:text-[10px] text-muted-foreground font-semibold tabular-nums">{slot}</span>
                    ) : null}
                  </div>

                  {(isMobile ? [currentDate] : (viewMode === "week" ? weekDays : [currentDate])).map((day, dayIndex) => {
                    const slotEvents = displayEvents.filter(
                      (e) => isSameDay(e.date, day) && e.startTime === slot
                    );
                    const isToday = isSameDay(day, new Date());
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
                              viewMode={isMobile ? "day" : viewMode}
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
        )}
        </div>

        <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
          {activeDragEvt ? (
            <div className="w-72 bg-card rounded-xl shadow-2xl border border-primary/50">
              <AgendaItemView evt={activeDragEvt} getClinic={getClinic} getEventStatusMeta={getEventStatusMeta} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ---------------- MOBILE FLOATING BOTTOM BAR (iOS Style) ---------------- */}
      <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none md:hidden">
        <button
          onClick={handleToday}
          className="pointer-events-auto bg-card/90 backdrop-blur-md border border-border/80 shadow-xl px-4 py-2 rounded-full text-xs font-bold text-foreground flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          Hoy
        </button>

        <div className="pointer-events-auto bg-card/90 backdrop-blur-md border border-border/80 shadow-xl p-1 rounded-full flex items-center gap-1">
          <button
            onClick={() => setViewMode("month")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
              viewMode === "month" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
            )}
          >
            Mes
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
              viewMode === "day" || viewMode === "week" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
            )}
          >
            Día
          </button>
          <button
            onClick={() => triggerNewAppointmentModal({})}
            className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer ml-1"
            title="Nueva Cita"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ---------------- APPOINTMENT POPOVER (Notion-style quick view) ---------------- */}
      {popoverState && (
        <AppointmentPopover
          event={popoverState.event}
          clinic={popoverState.clinic}
          x={popoverState.x}
          y={popoverState.y}
          onClose={() => setPopoverState(null)}
          onOpenDetails={(e) => {
            setSelectedEvent(e);
            setIsDetailOpen(true);
          }}
        />
      )}

      {/* ---------------- APPOINTMENT DETAIL DRAWER ---------------- */}
      <AppointmentDetailDrawer
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateEvent={handleUpdateEvent}
        clinics={clinics}
      />

      <RescheduleConfirmModal 
        isOpen={rescheduleModal.isOpen}
        onClose={() => setRescheduleModal({ isOpen: false, evt: null, targetDate: null })}
        onConfirm={handleRescheduleConfirm}
        targetDate={rescheduleModal.targetDate}
        originalTime={rescheduleModal.evt?.startTime || "09:00"}
        patientName={rescheduleModal.evt?.patient || ""}
      />
    </div>
  );
}

export function AgendaItemView({ evt, getClinic, getEventStatusMeta, isDragging, onClick }: any) {
  const cl = getClinic(evt.clinicId);
  const stMeta = getEventStatusMeta(evt.status);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "py-2.5 px-1.5 flex items-center justify-between gap-2.5 hover:bg-muted/40 rounded-xl transition-colors cursor-pointer touch-none",
        isDragging && "opacity-50 border-dashed border-2 border-primary bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-xs", cl.color)} />
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{evt.patient}</p>
          <p className="text-[11px] text-muted-foreground truncate">{evt.title}</p>
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <span className="text-xs font-bold tabular-nums text-foreground">{evt.startTime}</span>
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md text-center", stMeta.badgeCls)}>
          {stMeta.label}
        </span>
      </div>
    </div>
  );
}

export function DraggableAgendaItem({ evt, onClick, getClinic, getEventStatusMeta }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `agenda-evt-${evt.id}`,
    data: { evt }
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ touchAction: 'none' }}>
      <AgendaItemView 
        evt={evt} 
        getClinic={getClinic} 
        getEventStatusMeta={getEventStatusMeta} 
        isDragging={isDragging} 
        onClick={onClick} 
      />
    </div>
  );
}

export function DroppableMonthDayCell({ day, isCurrentMonth, isToday, isSelected, dayEvents, getClinic, getEventStatusMeta, onClick, onNewAppointment }: any) {
  const { isOver, setNodeRef } = useDroppable({
    id: `month-day-${format(day, 'yyyy-MM-dd')}`
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "group h-full min-h-[50px] p-2 border rounded-xl cursor-pointer transition-all hover:border-primary/40 relative overflow-hidden",
        isCurrentMonth ? "bg-card border-border/60 shadow-sm hover:shadow-md" : "bg-muted/40 border-transparent text-muted-foreground/60",
        isToday && "ring-2 ring-primary bg-primary/10",
        isSelected && "ring-2 ring-primary bg-primary/5",
        isOver && "ring-2 ring-primary bg-primary/20"
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
          isToday ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "text-foreground"
        )}>
          {format(day, "d")}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewAppointment();
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
            title="Nueva cita"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-1 mt-1.5 overflow-hidden pointer-events-none">
        {dayEvents.slice(0, 1).map((evt: any) => {
          const cl = getClinic(evt.clinicId);
          const stMeta = getEventStatusMeta(evt.status);
          const bgTranslucent = cl.color.replace('bg-', 'bg-').replace('-600', '-600/20');
          const borderLeft = cl.borderColor.replace('border-', 'border-l-');
          const textDark = cl.color.replace('bg-', 'text-');
          return (
            <div
              key={evt.id}
              className={cn("text-[10px] px-1.5 py-0.5 rounded-[3px] font-semibold flex items-center justify-between gap-1 overflow-hidden border-l-2", borderLeft, bgTranslucent, textDark)}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", stMeta.dotCls)} title={stMeta.label} />
                <span className="truncate">{evt.startTime} {evt.patient}</span>
              </div>
            </div>
          );
        })}
        {dayEvents.length > 1 && (
          <div className="text-[10px] text-muted-foreground font-medium text-center mt-0.5">
            + {dayEvents.length - 1} más
          </div>
        )}
      </div>
    </div>
  );
}
