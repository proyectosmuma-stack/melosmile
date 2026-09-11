"use client";

import React, { useState, useEffect } from "react";
import {
  Bell, Calendar, Clock, Mail, MessageSquare, Send, X, Loader2, Sparkles, Check, Smartphone
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
  patientTelegramChatId?: string;
  treatmentPlan?: string | null;
  appointments?: Array<{ id: string; appointment_date: string; reason: string }>;
  onSuccess?: () => void;
}

const PRESET_TEMPLATES = [
  { id: "recordatorio_cita", label: "📅 Recordatorio de Cita" },
  { id: "cambio_alineador", label: "🦷 Cambio Alineador" },
  { id: "seguimiento", label: "🩺 Seguimiento" },
  { id: "pago_pendiente", label: "💳 Aviso de Pago" },
  { id: "personalizado", label: "📝 Personalizado" },
];

export function NewReminderModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientPhone,
  patientEmail,
  patientTelegramChatId,
  treatmentPlan,
  appointments = [],
  onSuccess,
}: NewReminderModalProps) {
  const [loading, setLoading] = useState(false);
  // Selección múltiple de canales
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["telegram"]);
  const [reminderType, setReminderType] = useState<string>("recordatorio_cita");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  // Campo dinámico para alineador
  const [alignerNumber, setAlignerNumber] = useState<string>("1");

  useEffect(() => {
    if (open) {
      // Set default date to tomorrow at 09:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().substring(0, 10));

      // Auto-detectar número de alineador si existe en el plan de tratamiento
      if (treatmentPlan) {
        const match = treatmentPlan.match(/alineador\s*#?(\d+)/i) || treatmentPlan.match(/etapa\s*#?(\d+)/i);
        if (match && match[1]) {
          setAlignerNumber(match[1]);
        }
      }
      
      if (appointments.length > 0) {
        setSelectedAppointmentId(appointments[0].id);
        applyTemplate("recordatorio_cita", appointments[0], alignerNumber);
      } else {
        applyTemplate("recordatorio_cita", undefined, alignerNumber);
      }
    }
  }, [open]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) => {
      if (prev.includes(ch)) {
        if (prev.length === 1) return prev; // Al menos 1 canal debe estar seleccionado
        return prev.filter((c) => c !== ch);
      } else {
        return [...prev, ch];
      }
    });
  };

  const applyTemplate = (
    type: string,
    appt?: { id: string; appointment_date: string; reason: string },
    currentAlignerNum = alignerNumber
  ) => {
    setReminderType(type);
    const firstName = patientName.split(" ")[0];
    const apptDateStr = appt
      ? new Date(appt.appointment_date).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "[Fecha y Hora de Cita]";

    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const baseUrl = isLocal ? "https://agenda.melosmile.com" : (typeof window !== "undefined" ? window.location.origin : "https://agenda.melosmile.com");
    const confirmLink = appt ? `${baseUrl}/c/${appt.id}` : `${baseUrl}/c/confirmar`;

    if (type === "recordatorio_cita") {
      setSubject(`Recordatorio de tu cita en Melosmile`);
      setMessage(`Hola ${firstName}, te recordamos que tienes una cita programada para ${appt ? appt.reason : "tu consulta"} el día ${apptDateStr}.

Por favor, confirma o gestiona tu asistencia con un clic en este enlace:
${confirmLink}

¡Te esperamos en Melosmile!`);
    } else if (type === "cambio_alineador") {
      setSubject(`Recordatorio: Cambio de Alineador Dental #${currentAlignerNum}`);
      setMessage(`Hola ${firstName}, hoy corresponde cambiar al juego de alineadores #${currentAlignerNum} de tu tratamiento de ortodoncia invisible. Recuerda usarlos al menos 22 horas al día y mantenerlos limpios. ¡Seguimos avanzando en tu sonrisa!`);
    } else if (type === "seguimiento") {
      setSubject(`¿Cómo te encuentras tras tu cita? — Melosmile`);
      setMessage(`Hola ${firstName}, esperamos que te encuentres muy bien tras tu reciente intervención de ${appt ? appt.reason : "tratamiento"} en Melosmile. Escríbenos por aquí si tienes alguna molestia o duda sobre tu medicación. ¡Un saludo!`);
    } else if (type === "pago_pendiente") {
      setSubject(`Aviso de gestión de pago pendiente — Melosmile`);
      setMessage(`Estimado/a ${firstName}, te escribimos de Melosmile para recordarte la gestión del pago pendiente correspondiente a tu tratamiento. Si necesitas consultar formas de pago o facilidades, avísanos con gusto.`);
    } else {
      setSubject(`Notificación de Melosmile`);
      setMessage(`Hola ${firstName}, `);
    }
  };

  const handleAlignerNumberChange = (newVal: string) => {
    setAlignerNumber(newVal);
    if (reminderType === "cambio_alineador") {
      applyTemplate("cambio_alineador", undefined, newVal);
    }
  };

  const handleCreate = async (sendImmediately = false) => {
    if (!scheduledDate || !message.trim()) {
      alert("Por favor completa la fecha y el mensaje del recordatorio.");
      return;
    }
    if (selectedChannels.length === 0) {
      alert("Debes seleccionar al menos un canal de envío (Telegram, WhatsApp, etc.).");
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
          channels: selectedChannels,
          scheduledAt: scheduledDateTime,
          subject,
          message,
          patientName,
          patientPhone,
          patientEmail,
          patientTelegramChatId,
          sendImmediately,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const count = data.count || 1;
        alert(sendImmediately 
          ? `¡${count} recordatorio(s) enviado(s) de inmediato!` 
          : `¡${count} recordatorio(s) programado(s) exitosamente!`);
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
          {/* Multi-Channel Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Canales de Envío ({selectedChannels.length} seleccionados)
              </Label>
              <span className="text-[11px] text-muted-foreground">Puedes marcar varios simultáneamente</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "telegram", label: "Telegram", icon: Send, color: "text-sky-400", activeBg: "bg-sky-500/15 border-sky-500 text-sky-400" },
                { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-success", activeBg: "bg-success/15 border-success text-success" },
                { id: "email", label: "Email", icon: Mail, color: "text-info", activeBg: "bg-info/15 border-info text-info" },
                { id: "sms", label: "SMS", icon: Smartphone, color: "text-primary", activeBg: "bg-primary/15 border-primary text-primary" },
              ].map((ch) => {
                const isSelected = selectedChannels.includes(ch.id);
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all ${
                      isSelected
                        ? `${ch.activeBg} ring-2 ring-primary/20 shadow-xs`
                        : "bg-card border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${ch.color}`} />
                      <span>{ch.label}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {/* Destinatarios informativos */}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
              {patientPhone && (
                <span className="px-2 py-0.5 rounded-lg bg-muted/60 border border-border/50">
                  📱 Teléfono: <strong className="text-foreground">{patientPhone}</strong>
                </span>
              )}
              {patientEmail && (
                <span className="px-2 py-0.5 rounded-lg bg-muted/60 border border-border/50">
                  📧 Email: <strong className="text-foreground">{patientEmail}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Quick Template Presets (5 unificados) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Plantilla Automática</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TEMPLATES.map((tmpl) => (
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

          {/* Dynamic Field: Cambio Alineador */}
          {reminderType === "cambio_alineador" && (
            <div className="p-3.5 bg-sky-500/10 rounded-2xl border border-sky-500/25 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <Label htmlFor="aligner-number" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>🦷</span> Número o Etapa del Alineador
                </Label>
                <span className="text-[10px] text-muted-foreground">Se actualiza en vivo en el texto</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="aligner-number"
                  type="text"
                  placeholder="Ej: 4 (o 4 de 14)"
                  value={alignerNumber}
                  onChange={(e) => handleAlignerNumberChange(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-card border-border/80 max-w-[140px] font-mono font-bold text-center"
                />
                <span className="text-xs text-muted-foreground">
                  {treatmentPlan ? `Plan del paciente: "${treatmentPlan.slice(0, 35)}..."` : "Configuración manual"}
                </span>
              </div>
            </div>
          )}

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
              <Label className="text-xs font-semibold text-foreground">Asunto / Título</Label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del recordatorio"
                className="h-10 text-xs rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Mensaje al Paciente</Label>
                <span className="text-[10px] text-muted-foreground">Puedes editar el texto libremente</span>
              </div>
              <Textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-xs rounded-xl p-3 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl h-9"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleCreate(true)}
            className="text-xs rounded-xl h-9 font-bold gap-1.5 border-primary/40 hover:bg-primary/10 text-primary"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar de Inmediato ({selectedChannels.length})
          </Button>

          <Button
            type="button"
            disabled={loading}
            onClick={() => handleCreate(false)}
            className="text-xs rounded-xl h-9 font-bold gap-1.5 bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/90"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Programar Recordatorio ({selectedChannels.length})
          </Button>
        </div>
      </div>
    </div>
  );
}