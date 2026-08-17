"use client";

import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Receipt, Loader2, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export type PaymentAppointmentOption = {
  id: string;
  reason: string;
  appointment_date: string;
};

type PaymentRegistrationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  appointments?: PaymentAppointmentOption[];
  defaultAppointmentId?: string;
  defaultAmount?: number;
  onSuccess?: () => void;
};

export const PAYMENT_METHODS = [
  "Tarjeta",
  "Efectivo",
  "Transferencia",
  "Bizum",
  "Financiación",
  "Otro",
];

export const PAYMENT_STATUSES = [
  { id: "Pagado", label: "Pagado (Completo)" },
  { id: "Aconto", label: "Aconto / Entrega a cuenta" },
  { id: "Pendiente", label: "Pendiente de cobro" },
];

export function PaymentRegistrationModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  appointments = [],
  defaultAppointmentId = "",
  defaultAmount = 0,
  onSuccess,
}: PaymentRegistrationModalProps) {
  const [saving, setSaving] = useState(false);

  const [appointmentId, setAppointmentId] = useState(defaultAppointmentId);
  const [amount, setAmount] = useState<string>(defaultAmount > 0 ? String(defaultAmount) : "");
  const [paymentMethod, setPaymentMethod] = useState("Tarjeta");
  const [status, setStatus] = useState("Pagado");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));

  // Reset or initialize state when modal opens
  React.useEffect(() => {
    if (open) {
      setAppointmentId(defaultAppointmentId);
      setAmount(defaultAmount > 0 ? String(defaultAmount) : "");
      setPaymentMethod("Tarjeta");
      setStatus("Pagado");
      setNotes("");
      setPaymentDate(new Date().toISOString().substring(0, 10));
    }
  }, [open, defaultAppointmentId, defaultAmount]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setSaving(true);
    try {
      const selectedAppt = appointments.find((a) => a.id === appointmentId);
      const reasonText = selectedAppt
        ? selectedAppt.reason
        : status === "Aconto"
        ? "Entrega a Cuenta / Aconto"
        : "Pago de Servicios";

      const payload: Record<string, unknown> = {
        patient_id: patientId,
        appointment_id: appointmentId || null,
        total_amount: numAmount,
        custom_price: numAmount,
        payment_method: paymentMethod,
        status: status,
        appointment_reason: reasonText,
        billing_month: paymentDate,
        created_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from("billing_records")
        .insert(payload);

      if (error) throw error;

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Error registrando pago:", err);
      alert(`Error al registrar el pago: ${err.message || "Error desconocido"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-card shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-success" />
            Registrar Pago / Cobro
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Registra un cobro realizado o aconto a cuenta para <span className="font-semibold text-foreground">{patientName}</span>.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cita Asociada */}
          {appointments.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Cita / Concepto Asociado (Opcional)</Label>
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Sin cita (Aconto / Pago General) --</option>
                {appointments.map((a) => {
                  const d = new Date(a.appointment_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
                  return (
                    <option key={a.id} value={a.id}>
                      {d} - {a.reason}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Importe y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Monto (€) *</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="rounded-lg pl-8 text-sm font-bold text-foreground"
                />
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">€</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Fecha de Cobro</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Método de Pago & Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Método de Pago</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Estado del Pago</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PAYMENT_STATUSES.map((st) => (
                  <option key={st.id} value={st.id}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas u Observaciones */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Observaciones (Opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Pago parcial entregado en recepción"
              className="rounded-lg text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className="bg-success hover:bg-success/90 text-white rounded-xl gap-2 font-bold shadow-md shadow-success/20 text-xs"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}