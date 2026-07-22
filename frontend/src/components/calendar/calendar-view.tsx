"use client";

import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Building2, User, Stethoscope, Calculator, CalendarCheck, CheckCircle2 } from "lucide-react";

// Mock events with clinic tags
const initialEvents = [
  {
    id: "1",
    title: "Ortodoncia - Juan Pérez",
    start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
    backgroundColor: "#10b981", // Emerald (Albacete)
    borderColor: "#059669",
    extendedProps: {
      patient: "Juan Pérez",
      clinic: "Albacete",
      doctor: "Dra. Osly Melo",
      treatment: "Revision Ortodoncia",
      price: 60,
      labCost: 0,
      calculated: 36, // (60 * 60%)
    },
  },
  {
    id: "2",
    title: "Limpieza y Carillas - María Gómez",
    start: new Date(new Date().setHours(12, 30, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    backgroundColor: "#3b82f6", // Blue (Goya)
    borderColor: "#2563eb",
    extendedProps: {
      patient: "María Gómez",
      clinic: "Goya",
      doctor: "Dra. Norelys",
      treatment: "Estética Dental",
      price: 250,
      labCost: 40,
      calculated: 150,
    },
  },
  {
    id: "3",
    title: "Implante - Carlos Rodríguez",
    start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    end: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    backgroundColor: "#a855f7", // Purple (Las Rozas)
    borderColor: "#9333ea",
    extendedProps: {
      patient: "Carlos Rodríguez",
      clinic: "Las Rozas",
      doctor: "Dra. Osly Melo",
      treatment: "Implante Dental",
      price: 800,
      labCost: 150,
      calculated: 480,
    },
  },
];

export function CalendarView() {
  const [events, setEvents] = useState(initialEvents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form states
  const [patientName, setPatientName] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("Albacete");
  const [selectedDoctor, setSelectedDoctor] = useState("Dra. Osly Melo");
  const [naturalText, setNaturalText] = useState("");
  const [price, setPrice] = useState("60");
  const [labCost, setLabCost] = useState("0");

  const handleDateSelect = (selectInfo: any) => {
    setSelectedDate(selectInfo.start);
    setPatientName("");
    setNaturalText("");
    setIsDialogOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const props = clickInfo.event.extendedProps;
    alert(
      `📌 Cita: ${clickInfo.event.title}\n🏥 Clínica: ${props.clinic}\n👩‍⚕️ Doctora: ${props.doctor}\n💶 Precio: ${props.price}€ | Calculado Neto: ${props.calculated || 'N/A'}€`
    );
  };

  const handleAddEvent = () => {
    if (selectedDate) {
      let bg = "#10b981";
      if (selectedClinic === "Goya") bg = "#3b82f6";
      if (selectedClinic === "Las Rozas") bg = "#a855f7";

      const titleText = patientName 
        ? `${patientName} (${selectedClinic})` 
        : naturalText || "Nueva Cita";

      const p = parseFloat(price) || 0;
      const l = parseFloat(labCost) || 0;
      
      // Albacete rule formula demo: (Price * 60%) - (Lab * 50%)
      const calc = selectedClinic === "Albacete"
        ? (p * 0.60) - (l * 0.50)
        : p * 0.60;

      const newEvent = {
        id: String(Date.now()),
        title: titleText,
        start: selectedDate.toISOString(),
        end: new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString(),
        backgroundColor: bg,
        borderColor: bg,
        extendedProps: {
          patient: patientName || "Paciente General",
          clinic: selectedClinic,
          doctor: selectedDoctor,
          price: p,
          labCost: l,
          calculated: Math.max(0, calc),
        },
      };

      setEvents([...events, newEvent]);
      setIsDialogOpen(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-6 h-[calc(100vh-280px)] min-h-[600px]">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          initialView="timeGridWeek"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="100%"
          slotMinTime="08:30:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          buttonText={{
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
          }}
          locale="es"
        />

        {/* Modal Dialog for New Appointment */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-rose-500" />
                Registrar Nueva Cita / Tratamiento
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Natural Language Prompt Assistant */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                  <Sparkles className="h-4 w-4 text-rose-500" />
                  <span>Asistente IA n8n (Dictado o Lenguaje Natural)</span>
                </div>
                <Input
                  value={naturalText}
                  onChange={(e) => setNaturalText(e.target.value)}
                  placeholder="Ej: Vino Juan Pérez en Albacete, le hice Ortodoncia por 60€"
                  className="bg-white border-rose-200 text-sm focus-visible:ring-rose-500 rounded-lg"
                />
                <p className="text-[11px] text-rose-600/80">
                  El sistema autodetectará el paciente, el tratamiento y la clínica elegida.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Paciente</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Nombre del Paciente"
                      className="pl-9 text-sm rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Clínica</Label>
                  <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                    <SelectTrigger className="text-sm rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Albacete">Albacete</SelectItem>
                      <SelectItem value="Goya">Goya (Madrid)</SelectItem>
                      <SelectItem value="Las Rozas">Las Rozas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Profesional</Label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Precio Total (€)</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="text-sm rounded-lg"
                  />
                </div>
              </div>

              {/* Dynamic Calculation Live Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <Calculator className="h-4 w-4 text-slate-400" />
                  <span>Calculado Neto (Comisión + Regla Lab):</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  {(
                    selectedClinic === "Albacete"
                      ? ((parseFloat(price) || 0) * 0.60) - ((parseFloat(labCost) || 0) * 0.50)
                      : (parseFloat(price) || 0) * 0.60
                  ).toFixed(2)} €
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button onClick={handleAddEvent} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20">
                Guardar Cita
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
