"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Building2, User, Stethoscope, Calculator, CalendarCheck, ChevronLeft, ChevronRight, Clock, CalendarDays, Calendar as CalendarIcon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, subDays, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export type Clinic = {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  labDiscount: number; // e.g. 50%
  baseCommission: number; // e.g. 60%
};

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
  durationMinutes: number; // 15, 30, 45, 60, 75, 90, 120...
  clinicId: string;
  patient: string;
  doctor: string;
  price: number;
  labCost: number;
};

const today = new Date();

const initialEvents: AppointmentEvent[] = [
  { id: "1", title: "Ortodoncia", date: today, startTime: "10:00", durationMinutes: 60, clinicId: "albacete", patient: "Juan Pérez", doctor: "Dra. Osly Melo", price: 60, labCost: 0 },
  { id: "2", title: "Estética Dental", date: today, startTime: "12:30", durationMinutes: 90, clinicId: "goya", patient: "María Gómez", doctor: "Dra. Norelys", price: 250, labCost: 40 },
  { id: "3", title: "Implante", date: addDays(today, 1), startTime: "11:15", durationMinutes: 120, clinicId: "rozas", patient: "Carlos Rodríguez", doctor: "Dra. Osly Melo", price: 800, labCost: 150 },
  { id: "4", title: "Revisión 15m", date: today, startTime: "09:15", durationMinutes: 15, clinicId: "goya", patient: "Laura Sánchez", doctor: "Dra. Asencio", price: 45, labCost: 0 },
];

// Generate 15-minute interval options (08:00 to 20:45)
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

// Duration options in 15-minute increments
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

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [events, setEvents] = useState<AppointmentEvent[]>(initialEvents);
  const [clinics, setClinics] = useState<Clinic[]>(DEFAULT_CLINICS);

  // New/Edit Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedStartTime, setSelectedStartTime] = useState<string>("09:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form states
  const [patientName, setPatientName] = useState("");
  const [treatment, setTreatment] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState<string>("albacete");
  const [doctor, setDoctor] = useState("Dra. Osly Melo");
  const [price, setPrice] = useState("60");
  const [labCost, setLabCost] = useState("0");
  const [naturalText, setNaturalText] = useState("");

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Navigation handlers
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

  const calcNeto = (p: number, l: number, clinicId: string) => {
    const cl = getClinic(clinicId);
    const commPct = cl.baseCommission / 100;
    const labPct = cl.labDiscount / 100;
    return Math.max(0, (p * commPct) - (l * labPct));
  };

  const handleCellClick = (date: Date, timeSlot: string) => {
    setSelectedDate(date);
    setSelectedStartTime(timeSlot);
    setDurationMinutes(30);
    setNaturalText("");
    setPatientName("");
    setTreatment("");
    setIsDialogOpen(true);
  };

  const handleEventClick = (e: AppointmentEvent, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedEvent(e);
    setIsDetailOpen(true);
  };

  const handleSave = () => {
    const newEvent: AppointmentEvent = {
      id: String(Date.now()),
      title: treatment || naturalText || "Consulta",
      date: selectedDate,
      startTime: selectedStartTime,
      durationMinutes,
      clinicId: selectedClinicId,
      patient: patientName || "Paciente",
      doctor,
      price: parseFloat(price) || 0,
      labCost: parseFloat(labCost) || 0,
    };
    setEvents([...events, newEvent]);
    setIsDialogOpen(false);
  };

  return (
    <Card className="border-0 shadow-xl rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-0">
        {/* Toolbar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            {/* Prev/Next */}
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

            {/* Quick Hoy Button */}
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

          {/* View Mode Selector (Mes, Semana, Día) */}
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
                const dayEvents = events.filter((e) => isSameDay(e.date, day));
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

        {/* ---------------- VISTA SEMANAL O DÍA (GRID CON INTERVALOS DE 15 MIN) ---------------- */}
        {(viewMode === "week" || viewMode === "day") && (
          <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 300px)", minHeight: 520 }}>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `70px repeat(${viewMode === "week" ? 7 : 1}, 1fr)`,
                minWidth: viewMode === "week" ? 800 : 350,
              }}
            >
              {/* Header Columns */}
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

              {/* 15-Min Slots Rows */}
              {TIME_SLOTS.map((slot) => (
                <React.Fragment key={slot}>
                  {/* Slot Time Label (show text every 30m or 1h) */}
                  <div className="flex items-start justify-end pr-2.5 pt-0.5 border-r border-slate-100 h-9 bg-slate-50/30">
                    {slot.endsWith(":00") || slot.endsWith(":30") ? (
                      <span className="text-[10px] text-slate-400 font-semibold">{slot}</span>
                    ) : null}
                  </div>

                  {/* Day Columns for this slot */}
                  {(viewMode === "week" ? weekDays : [currentDate]).map((day) => {
                    const slotEvents = events.filter(
                      (e) => isSameDay(e.date, day) && e.startTime === slot
                    );
                    const isToday = isSameDay(day, today);
                    return (
                      <div
                        key={`${day.toISOString()}-${slot}`}
                        onClick={() => handleCellClick(day, slot)}
                        className={cn(
                          "relative h-9 border-b border-r border-slate-100/60 cursor-pointer transition-colors hover:bg-slate-100/80 group",
                          slot.endsWith(":00") && "border-b-slate-200/80",
                          isToday && "bg-rose-50/20"
                        )}
                      >
                        {slotEvents.map((evt) => {
                          const cl = getClinic(evt.clinicId);
                          // Height based on 15m intervals (height = durationMinutes / 15 * 36px)
                          const heightPx = Math.max(32, (evt.durationMinutes / 15) * 36 - 4);
                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => handleEventClick(evt, e)}
                              className={cn(
                                "absolute inset-x-1 rounded-lg px-2 py-1 cursor-pointer shadow-sm hover:shadow-md transition-all border-l-4 z-10 overflow-hidden",
                                cl.color, cl.borderColor, "text-white"
                              )}
                              style={{ top: 2, height: `${heightPx}px` }}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold leading-tight truncate">{evt.patient}</p>
                                <span className="text-[9px] opacity-80 font-mono">{evt.startTime} ({evt.durationMinutes}m)</span>
                              </div>
                              <p className="text-[10px] opacity-90 truncate">{evt.title} · {cl.name}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

      </CardContent>

      {/* ---------------- MODAL NUEVA CITA (OPAQUE DIALOG) ---------------- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-white border border-slate-200 shadow-2xl opacity-100">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-rose-500" />
              Nueva Cita — {format(selectedDate, "dd MMM yyyy", { locale: es })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* AI Assistant */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                <Sparkles className="h-4 w-4 text-rose-500" />
                <span>Asistente IA (Dictado / Lenguaje Natural)</span>
              </div>
              <Input
                value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
                placeholder='Ej: "Vino Juan en Albacete, Ortodoncia 60€ duracion 45m"'
                className="bg-white border-rose-200 text-sm focus-visible:ring-rose-500 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Hora de Inicio (Intervalos 15m)</Label>
                <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                  <SelectTrigger className="text-sm rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}h</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Duración con Paciente</Label>
                <Select
                  value={String(durationMinutes)}
                  onValueChange={(val) => setDurationMinutes(parseInt(val))}
                >
                  <SelectTrigger className="text-sm rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Paciente</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nombre paciente" className="pl-9 text-sm rounded-lg" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tratamiento</Label>
                <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="Ej: Ortodoncia" className="text-sm rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Clínica / Sede</Label>
                <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                  <SelectTrigger className="text-sm rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Profesional</Label>
                <Select value={doctor} onValueChange={setDoctor}>
                  <SelectTrigger className="text-sm rounded-lg">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-slate-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dra. Osly Melo">Dra. Osly Melo</SelectItem>
                    <SelectItem value="Dra. Norelys">Dra. Norelys</SelectItem>
                    <SelectItem value="Dra. Asencio">Dra. Asencio</SelectItem>
                    <SelectItem value="Dra. Shirley">Dra. Shirley</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Precio Total (€)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="text-sm rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Gastos Lab (€)</Label>
                <Input type="number" value={labCost} onChange={(e) => setLabCost(e.target.value)} className="text-sm rounded-lg" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Calculator className="h-4 w-4 text-slate-400" />
                <span>Calculado Neto ({getClinic(selectedClinicId).name}):</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">
                {calcNeto(parseFloat(price) || 0, parseFloat(labCost) || 0, selectedClinicId).toFixed(2)} €
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20">Guardar Cita</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- MODAL DETALLE CITA ---------------- */}
      {selectedEvent && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-2xl opacity-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <span className={cn("h-3 w-3 rounded-full", getClinic(selectedEvent.clinicId).color)} />
                {selectedEvent.patient} — {selectedEvent.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Hora & Duración</p>
                  <p className="font-semibold text-slate-800">{selectedEvent.startTime}h ({selectedEvent.durationMinutes} min)</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Clínica</p>
                  <p className="font-semibold text-slate-800">{getClinic(selectedEvent.clinicId).name}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Precio Total</p>
                  <p className="font-bold text-slate-800">{selectedEvent.price.toFixed(2)} €</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Neto Calculado</p>
                  <p className="font-bold text-emerald-700">
                    {calcNeto(selectedEvent.price, selectedEvent.labCost, selectedEvent.clinicId).toFixed(2)} €
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="rounded-xl w-full">Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
