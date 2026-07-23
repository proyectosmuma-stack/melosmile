"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Stethoscope, 
  Calculator, 
  MessageSquare, 
  FileText, 
  Upload, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AppointmentEvent, DEFAULT_CLINICS } from "@/components/calendar/calendar-view";

type AppointmentDetailDrawerProps = {
  event: AppointmentEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEvent: (updated: AppointmentEvent) => void;
};

export function AppointmentDetailDrawer({
  event,
  isOpen,
  onClose,
  onUpdateEvent,
}: AppointmentDetailDrawerProps) {
  if (!event) return null;

  const router = useRouter();

  const [status, setStatus] = useState<string>("Confirmada");
  const [comments, setComments] = useState<string[]>([
    "Paciente avisado por WhatsApp.",
    "Solicitada prueba de laboratorio para prótesis.",
  ]);
  const [newComment, setNewComment] = useState("");

  // Accounting & Payments
  const [paymentStatus, setPaymentStatus] = useState<"Pendiente" | "Parcial" | "Pagado">("Parcial");
  const [paidAmount, setPaidAmount] = useState<string>("50");
  const [odooStatus, setOdooStatus] = useState<"Sin enviar" | "Borrador" | "Confirmado">("Sin enviar");

  // Attachments / Documentation
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([
    { name: "Radiografía_Panorámica.pdf", url: "#" },
    { name: "Foto_Antes_Tratamiento.jpg", url: "#" },
  ]);

  const clinic = DEFAULT_CLINICS.find((c) => c.id === event.clinicId) || DEFAULT_CLINICS[0];
  const commPct = clinic.baseCommission / 100;
  const labPct = clinic.labDiscount / 100;
  const calculatedNeto = Math.max(0, (event.price * commPct) - (event.labCost * labPct));

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments([...comments, newComment]);
    setNewComment("");
  };

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachments([...attachments, { name: file.name, url: "#" }]);
    }
  };

  const handlePushOdoo = () => {
    setOdooStatus("Borrador");
    alert(` Factura borrador enviada a Odoo (https://melosmile.odoo.com) para ${event.patient}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white border border-slate-200 shadow-2xl opacity-100">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className={cn("h-3.5 w-3.5 rounded-full", clinic.color)} />
              Ficha de Cita — {event.patient}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                <SelectTrigger className="h-8 text-xs font-semibold rounded-lg bg-slate-100 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Por Confirmar">Por Confirmar</SelectItem>
                  <SelectItem value="Confirmada">Confirmada</SelectItem>
                  <SelectItem value="Realizada">Realizada</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              {/* Google Calendar Style Quick Actions */}
              <button
                onClick={() => {
                  onClose();
                  router.push(`/appointments/${event.id}`);
                }}
                className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
                title="Editar cita completa (Google Calendar)"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <button
                onClick={async () => {
                  if (confirm(`¿Estás seguro de eliminar la cita de ${event.patient}?`)) {
                    await supabase.from("appointments").delete().eq("id", event.id);
                    window.dispatchEvent(new CustomEvent("appointment-created"));
                    onClose();
                  }
                }}
                className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors"
                title="Eliminar cita"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-3">
          {/* Quick Patient Contact Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-rose-500" />
                <span className="font-bold text-slate-900 text-base">{event.patient}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                  PAC-001
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" /> +34 612 345 678</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> paciente@email.com</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {event.patientId && (
                <Button 
                  onClick={() => {
                    onClose();
                    router.push(`/patients/${event.patientId}`);
                  }}
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs rounded-lg border-slate-300"
                >
                  Ver Ficha Paciente
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg border-slate-300">
                WhatsApp
              </Button>
              <Button 
                onClick={() => {
                  onClose();
                  router.push(`/appointments/${event.id}`);
                }}
                size="sm" 
                variant="outline" 
                className="h-8 text-xs rounded-lg border-slate-300"
              >
                Ver Ficha Completa
              </Button>
            </div>
          </div>

          {/* Session Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Clínica</span>
              <span className="font-bold text-slate-800">{clinic.name}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Doctora</span>
              <span className="font-bold text-slate-800">{event.doctor}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Hora & Duración</span>
              <span className="font-bold text-slate-800">{event.startTime}h ({event.durationMinutes}m)</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block mb-1">Neto Calculado</span>
              <span className="font-bold text-emerald-700 text-sm">{calculatedNeto.toFixed(2)} €</span>
            </div>
          </div>

          {/* Treatment & Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Tratamiento & Notas de Sesión</Label>
            <Input
              value={event.title}
              onChange={(e) => onUpdateEvent({ ...event, title: e.target.value })}
              className="text-sm font-medium rounded-lg"
            />
          </div>

          {/* Accounting & Payments Section (Odoo & Partial Payments) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <CreditCard className="h-4 w-4 text-rose-500" />
                <span>Gestión Contable de la Cita (Pagos y Odoo)</span>
              </div>
              <span className={cn(
                "text-xs px-2.5 py-0.5 rounded-full font-bold border",
                odooStatus === "Sin enviar" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-purple-50 text-purple-700 border-purple-200"
              )}>
                Odoo: {odooStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Estado del Pago</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as any)}>
                  <SelectTrigger className="h-9 text-xs rounded-lg bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Parcial">Pago Parcial / Entrega</SelectItem>
                    <SelectItem value="Pagado">Pagado Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Monto Entregado (€)</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-9 text-xs bg-white rounded-lg"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handlePushOdoo}
                  size="sm"
                  className="w-full h-9 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Enviar a Odoo API
                </Button>
              </div>
            </div>
          </div>

          {/* Documentation & Photos Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-500" />
                Documentación & Registro de Fotos
              </Label>
              <label className="text-xs text-rose-600 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" />
                Adjuntar Archivo
                <input type="file" onChange={handleAddAttachment} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                  <span className="truncate">{att.name}</span>
                  <span className="text-[10px] text-rose-600 underline font-semibold">Ver</span>
                </div>
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-slate-500" />
              Comentarios de la Sesión
            </Label>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {comments.map((c, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
                  {c}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Añadir un comentario..."
                className="h-9 text-xs rounded-lg"
              />
              <Button onClick={handleAddComment} size="sm" className="h-9 text-xs rounded-lg bg-slate-900 text-white">
                Añadir
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cerrar Ficha
          </Button>
          <Button onClick={onClose} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20">
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
