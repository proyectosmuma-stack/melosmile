"use client";

import React, { useState, useEffect } from "react";
import {
  Bell, Calendar, Clock, Mail, MessageSquare, Send, X, Loader2, Sparkles, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  appointments?: Array<{ id: string; appointment_date: string; reason: string }>;
  onSuccess?: () => void;
}

export function NewReminderModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientPhone,
  patientEmail,
  appointments = [],
  onSuccess,
}: NewReminderModalProps) {
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [reminderType, setReminderType] = useState<string>("recordatorio_cita");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (open) {
      // Set default date to tomorrow at 09:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().substring(0, 10));
      
      if (appointments.length > 0) {
        setSelectedAppointmentId(appointments[0].id);
        applyTemplate("recordatorio_cita", appointments[0]);
      } else {
        applyTemplate("recordatorio_cita");
      }
    }
  }, [open]);

  const applyTemplate = (type: string, appt?: { id: string; appointment_date: string; reason: string }) => {
    setReminderType(type);
    const firstName = patientName.split(" ")[0];
    const apptDateStr = appt
      ? new Date(appt.appointment_date).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "[Fecha y Hora]";

    if (type === "recordatorio_cita") {
      setSubject(`Recordatorio de tu cita en Melosmile`);
      setMessage(`Hola ${firstName}, te recordamos que tienes una cita programada para ${appt ? appt.reason : "tu consulta"} el día ${apptDateStr}. Si necesitas modificarla, por favor avísanos con antelación. ¡Te esperamos en Melosmile!`);
    } else if (type === "confirmar_cita") {
      setSubject(`Por favor confirma tu cita — Melosmile`);
      setMessage(`Hola ${firstName}, necesitamos que confirmes tu asistencia a la cita de ${appt ? appt.reason : "tratamiento"} el día ${apptDateStr}. Responde a este mensaje para confirmar o reagendar.`);
    } else if (type === "cambio_alineador") {
      setSubject(`Recordatorio: Cambio de Alineador Dental`);
      setMessage(`Hola ${firstName}, hoy corresponde cambiar a tu siguiente juego de alineadores transparentes. Recuerda usar los masticadores y mantener la higiene adecuada. ¡Seguimos avanzando en tu sonrisa!`);
    } else if (type === "pago_pendiente") {
      setSubject(`Aviso de gestión de pago pendiente — Melosmile`);
      setMessage(`Estimado/a ${firstName}, te escribimos de Melosmile para recordarte que tienes un importe pendiente correspondiente a tus tratamientos. Quedamos a tu disposición para ayudarte con la gestión.`);
    } else if (type === "seguimiento") {
      setSubject(`¿Cómo te encuentras tras tu cita? — Melosmile`);
      setMessage(`Hola ${firstName}, esperamos que te encuentres muy bien tras tu reciente intervención en Melosmile. Escríbenos si tienes alguna molestia o duda sobre tu pauta de medicación.`);
    } else {
      setSubject(`Notificación de Melosmile`);
      setMessage(`Hola ${firstName}, `);
    }
  };

  const handleCreate = async (sendImmediately = false) => {
    if (!scheduledDate || !message.trim()) {
      alert("Por favor completa la fecha y el mensaje del recordatorio.");
      return;
    }

    setLoading(true);
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

      const res = await fetch("/api/reminders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          appointmentId: selectedAppointmentId || null,
          reminderType,
          channel,
          scheduledAt: scheduledDateTime,
          subject,
          message,
          patientName,
          patientPhone,
          patientEmail,
          sendImmediately,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(sendImmediately ? "Recordatorio enviado correctamente" : "Recordatorio programado correctamente");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error || "Error creando recordatorio");
      }
    } catch (err: any) {
      console.error("Error creando recordatorio:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-sidebar-accent to-sidebar-border text-sidebar-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary/80">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Programar Recordatorio para el Paciente</h2>
              <p className="text-xs text-sidebar-muted-foreground">{patientName}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-sidebar-muted-foreground hover:text-sidebar-foreground p-1 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Channel Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Canal de Envío</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  channel === "whatsapp"
                    ? "bg-success/10 border-success text-success ring-2 ring-success/20 shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <MessageSquare className="h-4 w-4 text-success" /> WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  channel === "email"
                    ? "bg-info/10 border-info text-info ring-2 ring-info/20 shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Mail className="h-4 w-4 text-info" /> Email
              </button>

              <button
                type="button"
                onClick={() => setChannel("sms")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  channel === "sms"
                    ? "bg-primary/10 border-primary/60 text-primary ring-2 ring-primary/20 shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Send className="h-4 w-4 text-primary" /> SMS
              </button>
            </div>
            {channel === "whatsapp" && (
              <p className="text-[11px] text-success font-medium bg-success/10 p-2 rounded-xl border border-success/30 flex items-center gap-1.5">
                💬 Destinatario: {patientPhone || "Teléfono no registrado"} (Webhook n8n WhatsApp)
              </p>
            )}
            {channel === "email" && (
              <p className="text-[11px] text-info font-medium bg-info/10 p-2 rounded-xl border border-info/30 flex items-center gap-1.5">
                📧 Destinatario: {patientEmail || "Email no registrado"} (Webhook n8n Email)
              </p>
            )}
          </div>

          {/* Quick Template Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Plantilla Automática</Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "recordatorio_cita", label: "📅 Recordatorio Cita" },
                { id: "confirmar_cita", label: "✅ Confirmar Cita" },
                { id: "cambio_alineador", label: "🦷 Cambio Alineador" },
                { id: "seguimiento", label: "🩺 Seguimiento Post-Cita" },
                { id: "pago_pendiente", label: "💳 Aviso de Pago" },
                { id: "personalizado", label: "📝 Personalizado" },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    const foundAppt = appointments.find(a => a.id === selectedAppointmentId);
                    applyTemplate(tmpl.id, foundAppt);
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    reminderType === tmpl.id
                      ? "bg-sidebar-accent text-sidebar-foreground border-sidebar-accent shadow-xs"
                      : "bg-muted/40 text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Associated Appointment & Schedule Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {appointments.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Cita Vinculada (Opcional)</Label>
                <select
                  value={selectedAppointmentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAppointmentId(val);
                    const found = appointments.find(a => a.id === val);
                    applyTemplate(reminderType, found);
                  }}
                  className="w-full h-10 rounded-xl border border-border bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/60"
                >
                  <option value="">-- Sin cita vinculada --</option>
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.appointment_date).toLocaleDateString("es-ES")} — {a.reason}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Fecha Programada de Envío</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Hora de Envío</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Subject & Message Textarea */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Asunto del Mensaje</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto o título del aviso"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Cuerpo del Mensaje</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Escribe el mensaje que se enviará al paciente..."
                className="text-xs rounded-xl leading-relaxed p-3 bg-muted/40"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border/60 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold text-muted-foreground border-border"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleCreate(true)}
              className="rounded-xl text-xs font-bold border-success/40 text-success hover:bg-success/10 gap-1.5 cursor-pointer"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar Ahora
            </Button>

            <Button
              type="button"
              disabled={loading}
              onClick={() => handleCreate(false)}
              className="rounded-xl text-xs font-bold bg-sidebar-accent hover:bg-sidebar-border text-sidebar-foreground gap-1.5 shadow-md cursor-pointer"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />} Programar Envío
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}