"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Receipt, Loader2, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

// Local type for billing record
type BillingRecord = {
  id: string;
  patient_id: string | null;
  appointment_id: string | null;
  billing_month: string;
  custom_price: number | null;
  calculated_total: number | null;
  payment_method: string | null;
  status: string | null;
  appointment_reason: string | null;
  notes: string | null;
  odoo_invoice_id: number | null;
  odoo_invoice_number: string | null;
  odoo_invoice_state: string | null;
  odoo_synced_at: string | null;
  created_at: string | null;
  actual_lab_cost: number | null;
  applied_commission_rate: number | null;
  applied_lab_discount_rate: number | null;
  profitability_status: string | null;
};

export type PaymentAppointmentOption = {
  id: string;
  reason: string;
  appointment_date: string;
};

type PatientDetails = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  zip_code: string | null;
  vat: string | null;
  billing_name?: string; // Optional: separate billing name from contact name
};

type PaymentRegistrationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  appointments?: PaymentAppointmentOption[];
  defaultAppointmentId?: string;
  defaultAmount?: number;
  editingRecord?: BillingRecord; // New prop for editing
  onSuccess?: () => void;
  patientDetails?: PatientDetails; // Optional: for Odoo invoice generation
  representatives?: { id?: string; full_name: string; dni_nie: string | null; email: string | null; phone: string | null; }[];
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

type OdooPatientDetails = {
  firstName: string;
  lastName: string;
  historiaId?: string;
  nifCif: string | null;
  billingName: string;
  billingAddress: string | null;
  billingCity: string | null;
  billingPostalCode: string | null;
  email: string | null;
  phone: string | null;
};

export function PaymentRegistrationModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  appointments = [],
  defaultAppointmentId = "",
  defaultAmount = 0,
  editingRecord: initialEditingRecord, // Renamed to avoid reassigning prop
  onSuccess,
  patientDetails, // Desestructured patientDetails
  representatives = [],
}: PaymentRegistrationModalProps) {
  const [saving, setSaving] = useState(false);
  const [currentBillingRecord, setCurrentBillingRecord] = useState<BillingRecord | undefined>(initialEditingRecord);

  const [appointmentId, setAppointmentId] = useState(currentBillingRecord?.appointment_id || defaultAppointmentId);
  const [amount, setAmount] = useState<string>(currentBillingRecord?.custom_price ? String(currentBillingRecord.custom_price) : (defaultAmount > 0 ? String(defaultAmount) : ""));
  const [paymentMethod, setPaymentMethod] = useState(currentBillingRecord?.payment_method || "Tarjeta");
  const [status, setStatus] = useState(currentBillingRecord?.status || "Pagado");
  const [notes, setNotes] = useState(currentBillingRecord?.notes || "");
  const [paymentDate, setPaymentDate] = useState(currentBillingRecord?.billing_month ? new Date(currentBillingRecord.billing_month).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));

  const [selectedRepId, setSelectedRepId] = useState<string>("");

  // Determine if the form should be blocked
  const isBlocked = !!currentBillingRecord && (!!currentBillingRecord.odoo_invoice_id || currentBillingRecord.status === "Facturado Odoo");

  // Reset or initialize state when modal opens or currentBillingRecord changes
  useEffect(() => {
    if (open) {
      if (initialEditingRecord) {
        setCurrentBillingRecord(initialEditingRecord);
        setAppointmentId(initialEditingRecord.appointment_id || "");
        setAmount(String(initialEditingRecord.custom_price));
        setPaymentMethod(initialEditingRecord.payment_method || "");
        setStatus(initialEditingRecord.status || "");
        setNotes(initialEditingRecord.notes || "");
        setPaymentDate(new Date(initialEditingRecord.billing_month).toISOString().substring(0, 10));
      } else {
        setCurrentBillingRecord(undefined); // Reset for new records
        setAppointmentId(defaultAppointmentId);
        setAmount(defaultAmount > 0 ? String(defaultAmount) : "");
        setPaymentMethod("Tarjeta");
        setStatus("Pagado");
        setNotes("");
        setPaymentDate(new Date().toISOString().substring(0, 10));
        setSelectedRepId("");
      }
    }
  }, [open, initialEditingRecord, defaultAppointmentId, defaultAmount]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setSaving(true);
    let recordToProcess = currentBillingRecord; // Use this variable to hold the record for Odoo invoice generation

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
        calculated_total: numAmount,
        custom_price: numAmount,
        payment_method: paymentMethod,
        status: status,
        appointment_reason: reasonText,
        billing_month: paymentDate,
        notes: notes || null,
      };

      if (currentBillingRecord) {
        // Update existing record
        const { error } = await (supabase as any)
          .from("billing_records")
          .update(payload)
          .eq("id", currentBillingRecord.id);

        if (error) throw error;
      } else {
        // Insert new record
        payload.created_at = new Date().toISOString();
        const { error, data } = await (supabase as any)
          .from("billing_records")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        recordToProcess = data; // Update recordToProcess with the newly inserted record
        setCurrentBillingRecord(data); // Also update the state for consistency
      }

      // After successful save, check if we need to generate Odoo invoice
      const shouldGenerateOdooInvoice = (status === "Pagado" || status === "Aconto") && patientDetails;
      const hasOdooInvoice = recordToProcess && recordToProcess.odoo_invoice_id;

      if (shouldGenerateOdooInvoice && !hasOdooInvoice) {
        try {
          const selectedRep = representatives.find(r => r.id === selectedRepId);
          const odooPatientDetails: OdooPatientDetails = {
            firstName: selectedRep ? selectedRep.full_name : patientDetails.first_name,
            lastName: selectedRep ? "" : patientDetails.last_name,
            historiaId: patientDetails.id,
            nifCif: selectedRep ? selectedRep.dni_nie : patientDetails.vat,
            billingName: selectedRep ? selectedRep.full_name : (patientDetails.billing_name || `${patientDetails.first_name} ${patientDetails.last_name}`),
            billingAddress: patientDetails.street, // Usar dirección del menor
            billingCity: patientDetails.city,
            billingPostalCode: patientDetails.zip_code,
            email: selectedRep ? selectedRep.email : patientDetails.email,
            phone: selectedRep ? selectedRep.phone : patientDetails.phone,
          };

          const invoicePayload = {
            patientId: patientId,
            items: [{
              id: recordToProcess?.id, // Use the ID from the saved/updated record
              name: reasonText,
              price: numAmount,
              quantity: 1,
            }],
            patientDetails: odooPatientDetails,
            billingRecordId: recordToProcess?.id, // Pass the billing record ID to update
          };

          const odooResponse = await fetch("/api/odoo/invoice", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(invoicePayload),
          });

          if (!odooResponse.ok) {
            const errorData = await odooResponse.json();
            throw new Error(errorData.message || "Error al generar factura en Odoo");
          }

          const odooData = await odooResponse.json();
          alert(`Factura de Odoo generada con éxito: ${odooData.odoo_invoice_number}`);
        } catch (odooErr: any) {
          console.error("Error al generar factura de Odoo:", odooErr);
          alert(`Advertencia: Pago registrado en Supabase, pero hubo un error al generar la factura en Odoo: ${odooErr.message}. Por favor, genera la factura manualmente.`);
        }
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Error registrando pago:", err);
      alert(`Error al ${currentBillingRecord ? "actualizar" : "registrar"} el pago: ${err.message || "Error desconocido"}`);
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
            {initialEditingRecord ? "Modificar Registro de Pago" : "Registrar Pago / Cobro"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {initialEditingRecord ? "Modifica un cobro o aconto a cuenta para" : "Registra un cobro realizado o aconto a cuenta para"} <span className="font-semibold text-foreground">{`${patientName}`}</span>.
          </p>
        </DialogHeader>

        {isBlocked && (
          <Badge variant="destructive" className="justify-center">
            Este pago ya tiene factura Odoo generada o está facturado en Odoo, no se puede modificar.
          </Badge>
        )}

        {representatives && representatives.length > 0 && !isBlocked && (status === "Pagado" || status === "Aconto") && (
          <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg space-y-2 mt-2">
            <Label className="text-xs font-semibold text-primary">Facturar a nombre de representante</Label>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Facturar a nombre del paciente ({patientName}) --</option>
              {representatives.map((r, idx) => (
                <option key={r.id || idx} value={r.id || String(idx)}>
                  {r.full_name} {r.dni_nie ? `(${r.dni_nie})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Cita Asociada */}
          {appointments.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Cita / Concepto Asociado (Opcional)</Label>
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isBlocked}
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
                  disabled={isBlocked}
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
                disabled={isBlocked}
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
                disabled={isBlocked}
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
                disabled={isBlocked}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Notas y Observaciones</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade notas o comentarios adicionales..."
              rows={3}
              className="rounded-lg text-xs"
              disabled={isBlocked}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={saving || isBlocked}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialEditingRecord ? "Modificar Pago" : "Guardar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}