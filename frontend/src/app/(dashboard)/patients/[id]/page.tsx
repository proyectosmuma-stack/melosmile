"use client";

import React, { useState } from "react";
import { User, Phone, Mail, FileText, Calendar as CalendarIcon, CreditCard, Activity, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function PatientProfilePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("historial");

  // Mock data for the patient
  const patient = {
    id: params.id,
    historiaId: "PAC-001",
    firstName: "Juan",
    lastName: "Pérez",
    phone: "+34 612 345 678",
    email: "juan.perez@email.com",
    dni: "12345678A",
    dob: "1985-04-12",
    address: "Calle Mayor 12, Madrid",
    importantDiseases: "Hipertensión controlada",
    allergies: "Penicilina",
  };

  const appointments = [
    { id: "a1", date: "2026-07-20", treatment: "Ortodoncia - Revisión mensual", doctor: "Dra. Osly Melo", status: "Realizada" },
    { id: "a2", date: "2026-06-15", treatment: "Limpieza bucal", doctor: "Dra. Norelys", status: "Realizada" },
  ];

  const payments = [
    { id: "p1", date: "2026-07-20", amount: 60, concept: "Abono Ortodoncia", status: "Pagado" },
    { id: "p2", date: "2026-06-15", amount: 50, concept: "Limpieza", status: "Pagado" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Header Profile Card */}
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-24"></div>
        <CardContent className="px-6 sm:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-12 mb-6">
            <div className="h-24 w-24 rounded-2xl bg-white p-2 shadow-lg flex-shrink-0 flex items-center justify-center border border-slate-100">
              <User className="h-12 w-12 text-slate-300" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{patient.firstName} {patient.lastName}</h1>
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{patient.historiaId}</span>
                    <span>DNI: {patient.dni}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-9 gap-2 rounded-xl">
                    <FileText className="h-4 w-4" /> Editar Datos
                  </Button>
                  <Button className="h-9 gap-2 rounded-xl bg-slate-900 text-white">
                    <CalendarIcon className="h-4 w-4" /> Nueva Cita
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" /> Contacto
              </h3>
              <div className="text-sm text-slate-600 space-y-1">
                <p>{patient.phone}</p>
                <p>{patient.email}</p>
                <p className="text-xs text-slate-500 mt-2">{patient.address}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-rose-400" /> Alertas Médicas
              </h3>
              <div className="text-sm space-y-2">
                {patient.allergies && (
                  <div className="flex items-start gap-2 text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Alergias:</strong> {patient.allergies}</span>
                  </div>
                )}
                {patient.importantDiseases && (
                  <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Enfermedades:</strong> {patient.importantDiseases}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl w-full justify-start overflow-x-auto h-auto">
          <TabsTrigger value="historial" className="rounded-lg data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600 py-2">
            Historial de Citas
          </TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-lg data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600 py-2">
            Documentos y Consentimientos
          </TabsTrigger>
          <TabsTrigger value="pagos" className="rounded-lg data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600 py-2">
            Facturación y Pagos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="mt-4 space-y-4">
          <Card className="border-0 shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg">Citas Previas y Próximas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {appointments.map(app => (
                  <div key={app.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-700">{app.date.split("-")[2]}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{app.date.split("-")[1]}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{app.treatment}</p>
                        <p className="text-xs text-slate-500">{app.doctor}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <Card className="border-0 shadow-md rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-lg">Archivos del Paciente</CardTitle>
              <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1 text-xs">
                <Upload className="h-3.5 w-3.5" /> Subir Archivo
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Mock files */}
                <div className="p-3 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-rose-300 cursor-pointer transition-colors bg-slate-50">
                  <FileText className="h-8 w-8 text-rose-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 truncate">Consentimiento_Ortodoncia.pdf</p>
                    <p className="text-xs text-slate-500">Firmado el 15/06/2026</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos" className="mt-4">
          <Card className="border-0 shadow-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg">Historial Financiero</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {payments.map(pay => (
                  <div key={pay.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{pay.concept}</p>
                      <p className="text-xs text-slate-500">{pay.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{pay.amount.toFixed(2)} €</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1 justify-end w-fit ml-auto mt-1">
                        <CheckCircle2 className="h-3 w-3" /> {pay.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
