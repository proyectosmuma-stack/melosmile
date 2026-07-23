"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Calendar as CalendarIcon, Clock, Building2, Stethoscope, FileText, Upload,
  CreditCard, MessageSquare, CheckCircle2, Save, Loader2, AlertCircle, ArrowLeft, Receipt,
  TrendingDown, TrendingUp, AlertTriangle, FlaskConical, Plus, Sparkles, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import { PaymentRegistrationModal } from "@/components/billing/payment-registration-modal";

type AppointmentData = {
  id: string;
  appointment_date: string;
  reason: string;
  status: string;
  notes: string | null;
  clinicName: string;
  professionalName: string;
  patientId: string;
  patientName: string;
  patientHistoriaId: string;
  patientPhone: string;
  patientEmail: string;
  patientNif: string;
  billingId: string | null;
  customPrice: number;
  actualLabCost: number;
  customCommission: number;
  customLabDiscount: number;
  paymentStatus: string;
  odooInvoiceId: number | null;
  odooInvoiceNumber: string | null;
  profitabilityStatus: string;
};

type TreatmentOption = {
  id: string;
  service_name: string;
  default_price: number;
};

type ApptDocument = {
  id: string;
  file_name: string;
  document_type: string;
  description: string | null;
  created_at: string;
};

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = React.use(params as any) as { id: string };
  const targetId = resolvedParams?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingOdoo, setSyncingOdoo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [appt, setAppt] = useState<AppointmentData | null>(null);
  const [treatmentsList, setTreatmentsList] = useState<TreatmentOption[]>([]);
  const [apptDocs, setApptDocs] = useState<ApptDocument[]>([]);

  const [status, setStatus] = useState("Confirmada");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [toothRef, setToothRef] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pendiente");
  const [price, setPrice] = useState("0");
  const [labCost, setLabCost] = useState("0");
  const [customCommission, setCustomCommission] = useState("60");
  const [customLabDiscount, setCustomLabDiscount] = useState("50");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profitability calculation
  const calcNeto = (p: number, l: number, commRate: number, labDiscountRate: number) => {
    return (p * (commRate / 100)) - (l * (labDiscountRate / 100));
  };

  const getProfitabilityStatus = (p: number, l: number, commRate: number, labDiscountRate: number) => {
    const neto = calcNeto(p, l, commRate, labDiscountRate);
    if (neto < 0) return "loss";
    if (p > 0 && neto / p < 0.15) return "warning";
    return "ok";
  };

  const fetchAppointment = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      // 1. Fetch appointment details
      const { data: a } = await supabase
        .from("appointments")
        .select(`
          id, appointment_date, reason, status, notes,
          clinics ( name ),
          professionals ( first_name, last_name ),
          patients ( id, first_name, last_name, historia_id, phone, email, nif_cif, billing_name, billing_address, billing_city, billing_postal_code )
        `)
        .eq("id", targetId)
        .limit(1)
        .maybeSingle();

      if (a) {
        // Fetch billing record
        const { data: bData } = await (supabase as any)
          .from("billing_records")
          .select("*")
          .eq("appointment_id", a.id)
          .maybeSingle();

        // Fetch treatments list catalog
        const { data: tData } = await (supabase as any)
          .from("treatments")
          .select("id, service_name, default_price")
          .eq("is_active", true)
          .order("service_name");
        if (tData) setTreatmentsList(tData);

        // Fetch documents attached to this appointment
        const { data: dData } = await (supabase as any)
          .from("documents")
          .select("id, file_name, document_type, description, created_at")
          .eq("appointment_id", a.id)
          .order("created_at", { ascending: false });
        if (dData) setApptDocs(dData);

        const p = a.patients as any;
        const prof = a.professionals as any;
        const clinic = a.clinics as any;

        const loadedAppt: AppointmentData = {
          id: a.id,
          appointment_date: a.appointment_date,
          reason: a.reason ?? "Consulta",
          status: a.status ?? "Confirmada",
          notes: a.notes ?? "",
          clinicName: clinic?.name ?? "Clínica",
          professionalName: prof ? `${prof.first_name} ${prof.last_name}` : "Dra. Osly Melo",
          patientId: p?.id ?? "",
          patientName: p ? `${p.first_name} ${p.last_name}` : "Paciente",
          patientHistoriaId: p?.historia_id ?? "PAC-",
          patientPhone: p?.phone ?? "",
          patientEmail: p?.email ?? "",
          patientNif: p?.nif_cif ?? "",
          billingId: bData?.id ?? null,
          customPrice: bData?.custom_price ?? 0,
          actualLabCost: bData?.actual_lab_cost ?? 0,
          customCommission: bData?.applied_commission_rate ?? 60,
          customLabDiscount: bData?.applied_lab_discount_rate ?? 50,
          paymentStatus: bData?.status ?? "Pendiente",
          odooInvoiceId: bData?.odoo_invoice_id ?? null,
          odooInvoiceNumber: bData?.odoo_invoice_number ?? null,
          profitabilityStatus: bData?.profitability_status ?? "ok",
        };

        setAppt(loadedAppt);
        setStatus(loadedAppt.status);
        setReason(loadedAppt.reason);
        setNotes(loadedAppt.notes ?? "");
        setPaymentStatus(loadedAppt.paymentStatus ?? "Pendiente");
        setPrice(String(loadedAppt.customPrice));
        setLabCost(String(loadedAppt.actualLabCost));
        setCustomCommission(String(loadedAppt.customCommission));
        setCustomLabDiscount(String(loadedAppt.customLabDiscount));
      }
    } catch (err) {
      console.error("Error cargando cita:", err);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => { fetchAppointment(); }, [fetchAppointment]);

  const handleSave = async () => {
    if (!appt) return;
    setSaving(true);
    try {
      const fullNotes = toothRef ? `[Pieza/Zona: ${toothRef}]\n${notes}` : notes;

      await supabase.from("appointments").update({
        status: status as any,
        reason,
        notes: fullNotes,
      }).eq("id", appt.id);

      const numPrice = parseFloat(price) || 0;
      const numLabCost = parseFloat(labCost) || 0;
      const numComm = parseFloat(customCommission) || 60;
      const numLabDisc = parseFloat(customLabDiscount) || 50;
      const profStatus = getProfitabilityStatus(numPrice, numLabCost, numComm, numLabDisc);

      if (appt.billingId) {
        await (supabase as any).from("billing_records").update({
          custom_price: numPrice,
          status: paymentStatus,
          applied_commission_rate: numComm,
          applied_lab_discount_rate: numLabDisc,
          actual_lab_cost: numLabCost,
          profitability_status: profStatus,
        }).eq("id", appt.billingId);
      } else {
        // Create billing record if doesn't exist yet
        await (supabase as any).from("billing_records").insert({
          appointment_id: appt.id,
          patient_id: appt.patientId,
          appointment_reason: reason,
          custom_price: numPrice,
          total_amount: numPrice,
          status: paymentStatus,
          applied_commission_rate: numComm,
          applied_lab_discount_rate: numLabDisc,
          actual_lab_cost: numLabCost,
          profitability_status: profStatus,
          billing_month: appt.appointment_date.substring(0, 10),
        });
      }

      await fetchAppointment();
      alert("Ficha de cita guardada correctamente");
    } catch (err) {
      console.error("Error guardando cita:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleOdooInvoice = async () => {
    if (!appt) return;
    setSyncingOdoo(true);
    try {
      const res = await fetch("/api/odoo/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: appt.patientId,
          billingRecordId: appt.billingId,
          patientDetails: {
            firstName: appt.patientName.split(" ")[0],
            lastName: appt.patientName.split(" ").slice(1).join(" "),
            historiaId: appt.patientHistoriaId,
            nifCif: appt.patientNif,
            email: appt.patientEmail,
            phone: appt.patientPhone,
          },
          treatmentName: reason,
          price: parseFloat(price) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Factura Odoo creada: ${data.invoiceNumber || `#${data.invoiceId}`}`);
        await fetchAppointment();
      } else {
        throw new Error(data.error || "Error creando factura Odoo");
      }
    } catch (err: any) {
      console.error("Error creando factura Odoo:", err);
      alert(`Error Odoo: ${err.message}`);
    } finally {
      setSyncingOdoo(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !appt) return;
    setUploadingDoc(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        let docType = "foto_clinica";
        if (ext === "pdf") docType = "radiografia";

        const filePath = `/opt/melosmile/docs/${appt.patientId}/${Date.now()}_${file.name}`;

        const { data: newDoc, error } = await (supabase as any).from("documents").insert({
          patient_id: appt.patientId,
          appointment_id: appt.id,
          document_type: docType,
          file_name: file.name,
          file_path: filePath,
          file_size_bytes: file.size,
          mime_type: file.type,
          uploaded_by: "Dra. Melo",
          description: "Vectorizado 🧠 (Procesado por n8n IA)",
        }).select("id").single();

        if (newDoc && !error) {
          fetch("/api/documents/vectorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId: newDoc.id,
              patientId: appt.patientId,
              fileName: file.name,
              filePath,
              documentType: docType,
            }),
          }).catch((e) => console.warn("Error vectorización:", e));
        }
      }
      await fetchAppointment();
    } catch (err) {
      console.error("Error adjuntando archivo:", err);
    } finally {
      setUploadingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span className="ml-3 text-slate-600 font-medium">Cargando datos de la cita...</span>
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-slate-300" />
        <p className="text-slate-600 font-semibold">Cita no encontrada en la base de datos</p>
        <Link href="/"><Button variant="outline">Volver a la agenda</Button></Link>
      </div>
    );
  }

  const apptDate = new Date(appt.appointment_date);

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto p-4 md:p-6">
      <div>
        <Link href={`/patients/${appt.patientId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver a la ficha del paciente
        </Link>
      </div>

      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Ficha de Gestión de Cita <span className="text-slate-400 font-normal">#{appt.id.slice(0, 8)}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Gestión clínica, procedimientos, notas de evolución y contabilidad Odoo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(val) => setStatus(val || "")}>
            <SelectTrigger className="w-[160px] bg-white border-slate-200 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="Confirmada">Confirmada</SelectItem>
              <SelectItem value="En Proceso">En Proceso</SelectItem>
              <SelectItem value="Realizada">Realizada (Completada)</SelectItem>
              <SelectItem value="Cancelada">Cancelada</SelectItem>
              <SelectItem value="No Presentado">No Presentado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/20">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Clinical & Session Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-lg">
                  {appt.patientName[0]}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {appt.patientName} <span className="text-xs text-rose-600 font-bold">({appt.patientHistoriaId})</span>
                  </h2>
                  <div className="flex gap-4 text-xs text-slate-500 mt-0.5">
                    {appt.patientPhone && <span>{appt.patientPhone}</span>}
                    {appt.patientEmail && <span>{appt.patientEmail}</span>}
                  </div>
                </div>
              </div>
              <Link href={`/patients/${appt.patientId}`}>
                <Button size="sm" variant="outline" className="text-xs rounded-xl font-semibold">Ver Ficha Cliente</Button>
              </Link>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Date / Clinic / Doctor badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Fecha</Label>
                  <p className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-slate-400" /> {apptDate.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Hora</Label>
                  <p className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> {apptDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Clínica / Sede</Label>
                  <p className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" /> {appt.clinicName}
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Doctor/a</Label>
                  <p className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                    <Stethoscope className="h-3.5 w-3.5 text-slate-400" /> {appt.professionalName}
                  </p>
                </div>
              </div>

              {/* Procedimiento & Pieza Dental */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Tratamiento / Procedimiento Realizado</Label>
                  {treatmentsList.length > 0 ? (
                    <select
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        const found = treatmentsList.find((t) => t.service_name === e.target.value);
                        if (found && (!price || price === "0")) {
                          setPrice(String(found.default_price));
                        }
                      }}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value={reason}>{reason || "-- Seleccionar del catálogo --"}</option>
                      {treatmentsList.map((t) => (
                        <option key={t.id} value={t.service_name}>
                          {t.service_name} ({t.default_price} €)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Ortodoncia Invisible - Ajuste" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Pieza Dental / Zona</Label>
                  <Input
                    value={toothRef}
                    onChange={(e) => setToothRef(e.target.value)}
                    placeholder="Ej: Pieza 36 / Cuadrante 2"
                    className="rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Anotaciones & Evolución Clínica */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-rose-500" /> Evolución Clínica & Observaciones del Doctor
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[140px] bg-slate-50/50 border-slate-200 text-xs leading-relaxed resize-y rounded-xl"
                  placeholder="Detalles clínicos de la sesión, hallazgos, tratamiento realizado, medicación recetada e instrucciones para la próxima visita..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Documentos & Registro Fotográfico de la Cita */}
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-rose-500" /> Adjuntos de la Cita (IA Vectorizada)
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                className="gap-2 rounded-xl text-xs font-semibold"
              >
                {uploadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Adjuntar Archivo
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-rose-300 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-rose-50/20 transition-all cursor-pointer"
              >
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Upload className="h-7 w-7 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">Arrastra fotos de la sesión, radiografías o consentimientos</p>
                  <p className="text-[11px] text-slate-400">Los archivos se vectorizan automáticamente para el Agente IA</p>
                </div>
              </div>

              {/* Document List */}
              {apptDocs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {apptDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-slate-400">{doc.description || "Vectorizado 🧠"}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700">
                        IA 🧠
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financial & Payment Management */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-850 text-white">
            <CardHeader className="pb-4 border-b border-slate-800">
              <CardTitle className="text-base flex items-center justify-between text-white/90">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-rose-400" /> Contabilidad & Odoo
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
                  {paymentStatus}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Estado del Pago</Label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full h-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs px-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Pendiente">Pendiente de cobro</option>
                  <option value="Aconto">Aconto / Entrega parcial</option>
                  <option value="Pagado">Pagado Total</option>
                  <option value="Facturado Odoo">Facturado Odoo</option>
                </select>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Precio Sesión (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <FlaskConical className="h-3 w-3 text-amber-400" /> Gasto Lab (€)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={labCost}
                      onChange={(e) => setLabCost(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-wider">% Comis. Sede</Label>
                    <Input
                      type="number"
                      value={customCommission}
                      onChange={(e) => setCustomCommission(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-wider">% Dto. Lab</Label>
                    <Input
                      type="number"
                      value={customLabDiscount}
                      onChange={(e) => setCustomLabDiscount(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>

                {/* Profitability Indicator Section */}
                {(() => {
                  const p = parseFloat(price) || 0;
                  const l = parseFloat(labCost) || 0;
                  const comm = parseFloat(customCommission) || 0;
                  const disc = parseFloat(customLabDiscount) || 0;
                  const neto = calcNeto(p, l, comm, disc);
                  const profStatus = getProfitabilityStatus(p, l, comm, disc);
                  const margin = p > 0 ? (neto / p) * 100 : 100;

                  return (
                    <div className="pt-3 border-t border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Neto Calculado</span>
                        <span className={`text-xl font-bold ${
                          profStatus === "loss" ? "text-red-400" :
                          profStatus === "warning" ? "text-amber-400" :
                          "text-emerald-400"
                        }`}>
                          {neto.toFixed(2)} €
                        </span>
                      </div>

                      {profStatus === "loss" && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300">
                          <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">⚠️ TRATAMIENTO EN PÉRDIDA</p>
                            <p className="text-[10px] text-red-400 mt-0.5">El gasto de laboratorio supera el neto del profesional.</p>
                          </div>
                        </div>
                      )}
                      {profStatus === "warning" && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300">
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">⚠️ MARGEN BAJO ({margin.toFixed(0)}%)</p>
                            <p className="text-[10px] text-amber-400 mt-0.5">El margen es inferior al 15%.</p>
                          </div>
                        </div>
                      )}
                      {profStatus === "ok" && p > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                          <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                          <p className="text-xs font-semibold">Rentable — Margen {margin.toFixed(0)}%</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 font-bold text-xs h-10 shadow-md shadow-emerald-600/20"
                >
                  <Plus className="h-4 w-4" /> Registrar Pago de esta Cita
                </Button>

                {appt.odooInvoiceNumber ? (
                  <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-800 text-center">
                    <p className="text-xs font-bold text-purple-300 flex items-center justify-center gap-1.5">
                      <Receipt className="h-4 w-4" /> Factura Odoo: {appt.odooInvoiceNumber}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleOdooInvoice}
                    disabled={syncingOdoo}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 gap-2 font-bold text-xs h-10 rounded-xl shadow-md shadow-purple-600/20"
                  >
                    {syncingOdoo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                    Generar Factura en Odoo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal Pre-Populated for this Appointment */}
      {appt && (
        <PaymentRegistrationModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          patientId={appt.patientId}
          patientName={appt.patientName}
          defaultAppointmentId={appt.id}
          defaultAmount={parseFloat(price) || 0}
          onSuccess={fetchAppointment}
        />
      )}
    </div>
  );
}
