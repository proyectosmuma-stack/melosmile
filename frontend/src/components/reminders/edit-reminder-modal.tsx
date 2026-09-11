"use client";

import React, { useState, useEffect } from "react";
import {
  Bell, Calendar, Clock, Mail, MessageSquare, Send, X, Loader2,
  Trash2, Save, Smartphone, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ReminderToEdit = {
  id: string;
  reminder_type: string;
  channel: string;
  scheduled_at: string;
  subject: string | null;
  message: string;
  status: string;
};

interface EditReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: ReminderToEdit | null;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  onSuccess?: () => void;
}

export function EditReminderModal({
  open,
  onOpenChange,
  reminder,
  patientName,
  patientPhone,
  patientEmail,
  onSuccess,
}: EditReminderModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [channel, setChannel] = useState<"whatsapp" | "telegram" | "email" | "sms">("whatsapp");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<string>("pendiente");

  useEffect(() => {
    if (open && reminder) {
      setShowDeleteConfirm(false);
      setChannel((reminder.channel as any) || "whatsapp");
      setSubject(reminder.subject || "");
      setMessage(reminder.message || "");
      setStatus(reminder.status || "pendiente");

      if (reminder.scheduled_at) {
        const d = new Date(reminder.scheduled_at);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        setScheduledDate(`${year}-${month}-${day}`);
        setScheduledTime(`${hours}:${minutes}`);
      }
    }
  }, [open, reminder]);

  const handleSave = async () => {
    if (!reminder) return;
    if (!scheduledDate || !message.trim()) {
      alert("Por favor completa la fecha y el mensaje del recordatorio.");
      return;
    }

    setLoading(true);
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

      const res = await fetch("/api/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reminder.id,
          channel,
          scheduled_at: scheduledDateTime,
          subject: subject.trim() || null,
          message: message.trim(),
          status,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error || "Error al actualizar el recordatorio.");
      }
    } catch (err: any) {
      console.error("Error updating reminder:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!reminder) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/reminders?id=${reminder.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error || "Error al eliminar el recordatorio.");
      }
    } catch (err: any) {
      console.error("Error deleting reminder:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!open || !reminder) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Editar Recordatorio</h2>
              <p className="text-xs text-slate-300 font-medium">{patientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-slate-300 hover:text-white p-1.5 rounded-xl transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-card">
          {/* Channel Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Plataforma de Envío
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  channel === "whatsapp"
                    ? "bg-success/15 border-success text-success ring-2 ring-success/20 shadow-xs"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                <MessageSquare className="h-4 w-4 text-success" /> WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setChannel("telegram")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  channel === "telegram"
                    ? "bg-sky-500/15 border-sky-500 text-sky-400 ring-2 ring-sky-500/20 shadow-xs"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                <Send className="h-4 w-4 text-sky-400" /> Telegram
              </button>

              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  channel === "email"
                    ? "bg-info/15 border-info text-info ring-2 ring-info/20 shadow-xs"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                <Mail className="h-4 w-4 text-info" /> Email
              </button>

              <button
                type="button"
                onClick={() => setChannel("sms")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  channel === "sms"
                    ? "bg-primary/15 border-primary text-primary ring-2 ring-primary/20 shadow-xs"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                <Smartphone className="h-4 w-4 text-primary" /> SMS
              </button>
            </div>

            {/* Destination feedback */}
            {channel === "whatsapp" && (
              <p className="text-[11px] text-success font-medium bg-success/10 p-2.5 rounded-xl border border-success/30 flex items-center justify-between">
                <span>💬 Destinatario: {patientPhone || "Teléfono no registrado"} (WhatsApp Directo / Webhook)</span>
                {patientPhone && (
                  <a
                    href={`https://wa.me/${patientPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold text-success hover:text-success/80 ml-2 shrink-0"
                  >
                    Abrir WhatsApp ↗
                  </a>
                )}
              </p>
            )}
            {channel === "telegram" && (
              <p className="text-[11px] text-sky-400 font-medium bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/30 flex items-center justify-between">
                <span>✈️ Destinatario: {patientPhone || "Teléfono no registrado"} (Telegram Directo al Teléfono)</span>
                {patientPhone && (
                  <a
                    href={`https://t.me/+${patientPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold text-sky-300 hover:text-sky-200 ml-2 shrink-0"
                  >
                    Abrir Telegram ↗
                  </a>
                )}
              </p>
            )}
            {channel === "email" && (
              <p className="text-[11px] text-info font-medium bg-info/10 p-2.5 rounded-xl border border-info/30 flex items-center gap-1.5">
                📧 Destinatario: {patientEmail || "Email no registrado"} (Webhook n8n Email)
              </p>
            )}
            {channel === "sms" && (
              <p className="text-[11px] text-primary font-medium bg-primary/10 p-2.5 rounded-xl border border-primary/30 flex items-center gap-1.5">
                📱 Destinatario: {patientPhone || "Teléfono no registrado"} (SMS Gateway)
              </p>
            )}
          </div>

          {/* Date & Time Scheduling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Fecha Programada de Envío</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="rounded-xl bg-background text-foreground border-border font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Hora de Envío</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="rounded-xl bg-background text-foreground border-border font-medium"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Asunto del Mensaje</Label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto para email o referencia interna"
              className="rounded-xl bg-background text-foreground border-border font-medium"
            />
          </div>

          {/* Message Body */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Cuerpo del Mensaje</Label>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe el mensaje que recibirá el paciente..."
              className="rounded-xl bg-background text-foreground border-border resize-none font-medium leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {message.length} caracteres
            </p>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner inside modal */}
        {showDeleteConfirm && (
          <div className="mx-6 mb-3 p-4 bg-destructive/15 border border-destructive/30 rounded-2xl animate-in fade-in slide-in-from-bottom-2 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-bold text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>¿Confirmas que deseas eliminar este recordatorio?</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Esta acción es permanente y no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirmar y Eliminar
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
          {!showDeleteConfirm ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting || loading}
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading || deleting}
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loading || deleting}
              onClick={handleSave}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar Cambios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
