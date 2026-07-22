"use client";

import React, { useState } from "react";
import { User, Calendar as CalendarIcon, Clock, Building2, Stethoscope, FileText, Upload, CreditCard, MessageSquare, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState("Confirmada");
  const [treatmentNotes, setTreatmentNotes] = useState("Ortodoncia brackets metal, cambio de arcos e higiene.");
  const [comments, setComments] = useState("Paciente avisado por WhatsApp de que debe traer la férula.");
  const [paymentStatus, setPaymentStatus] = useState("Parcial");
  const [price, setPrice] = useState("60");
  const [labCost, setLabCost] = useState("0");
  const [customCommission, setCustomCommission] = useState("60");
  const [customLabDiscount, setCustomLabDiscount] = useState("50");

  const calcNeto = (p: number, l: number, commRate: number, labDiscountRate: number) => {
    return Math.max(0, (p * (commRate / 100)) - (l * (labDiscountRate / 100)));
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Ficha de Cita <span className="text-slate-400 font-normal">#{params.id}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestión clínica, registro fotográfico y contabilidad (Odoo).</p>
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px] bg-white border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Por Confirmar">Por Confirmar</SelectItem>
              <SelectItem value="Confirmada">Confirmada</SelectItem>
              <SelectItem value="Realizada">Realizada</SelectItem>
              <SelectItem value="Reprogramada">Reprogramada</SelectItem>
              <SelectItem value="Cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2 bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20">
            <Save className="h-4 w-4" /> Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient & Session Data */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
                <User className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Juan Pérez <span className="text-sm text-slate-400 font-normal">(PAC-001)</span></h2>
                <div className="flex gap-4 text-xs text-slate-500 mt-1">
                  <span>+34 612 345 678</span>
                  <span>juan.perez@email.com</span>
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Fecha</Label>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-slate-400" /> 20 Jul 2026</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Hora</Label>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" /> 10:00 (60m)</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Clínica</Label>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" /> Albacete</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Doctor/a</Label>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5 text-slate-400" /> Dra. Osly Melo</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-800">Tratamiento de la Sesión</Label>
                <Input value={treatmentNotes} onChange={(e) => setTreatmentNotes(e.target.value)} className="bg-white border-slate-200" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" /> Anotaciones / Evolución (Notion-style)
                </Label>
                <Textarea 
                  value={comments} 
                  onChange={(e) => setComments(e.target.value)} 
                  className="min-h-[150px] bg-slate-50/50 border-slate-200 resize-y" 
                  placeholder="Escribe aquí los detalles clínicos de la sesión, cosas a tener en cuenta para la próxima visita, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* Documentos & Registro Fotográfico */}
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" /> Registro Fotográfico y Documentos
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-2 rounded-xl">
                <Upload className="h-4 w-4" /> Adjuntar
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Upload className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold">Arrastra fotos de la sesión o haz clic aquí</p>
                  <p className="text-xs">Soporta JPG, PNG, PDF</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Billing & Financials */}
        <div className="space-y-6">
          <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-white/90">
                <CreditCard className="h-5 w-5 text-rose-400" /> Contabilidad y Odoo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-xs text-slate-300">Estado del Pago</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Parcial">Pago Parcial / Entrega</SelectItem>
                    <SelectItem value="Pagado">Pagado Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Precio Total (€)</Label>
                    <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Gasto Lab (€)</Label>
                    <Input type="number" value={labCost} onChange={(e) => setLabCost(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-wider">% Comis. Dra.</Label>
                    <Input type="number" value={customCommission} onChange={(e) => setCustomCommission(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400 uppercase tracking-wider">% Dto. Lab</Label>
                    <Input type="number" value={customLabDiscount} onChange={(e) => setCustomLabDiscount(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">Neto Calculado</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {calcNeto(parseFloat(price)||0, parseFloat(labCost)||0, parseFloat(customCommission)||0, parseFloat(customLabDiscount)||0).toFixed(2)} €
                  </span>
                </div>
              </div>

              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 gap-2">
                <CheckCircle2 className="h-4 w-4" /> Sincronizar con Odoo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
