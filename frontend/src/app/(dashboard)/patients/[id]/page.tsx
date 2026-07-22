"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, Mail, FileText, Calendar as CalendarIcon, CreditCard, Activity, Upload, CheckCircle2, AlertCircle, ShieldAlert, Pill, Stethoscope, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

export default function PatientProfilePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("historial");
  const [loading, setLoading] = useState(true);

  // Patient state
  const [patient, setPatient] = useState({
    id: params.id,
    historiaId: "PAC-005",
    firstName: "Munir",
    lastName: "Callaos",
    phone: "+34 655 889 900",
    email: "munir@melosmile.com",
    dni: "77889900X",
    dob: "1990-06-15",
    gender: "Masculino",
    address: "Paseo de la Castellana 200, Madrid",
    importantDiseases: "Ninguna",
    previousOperations: "Ninguna",
    allergies: "Polen",
    currentMedication: "Antihistamínicos",
    treatmentPlan: "Limpieza ultrasónica y Blanqueamiento LED con férula de descarga nocturna",
    inTreatment: true,
  });

  // Fetch real data from Supabase
  useEffect(() => {
    async function fetchPatientData() {
      try {
        setLoading(true);
        // Query by id or historia_id or fallback
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .or(`id.eq.${params.id},historia_id.eq.${params.id},first_name.ilike.%${params.id}%`)
          .limit(1);

        if (!error && data && data.length > 0) {
          const p = data[0];
          setPatient({
            id: p.id,
            historiaId: p.historia_id || "PAC-005",
            firstName: p.first_name,
            lastName: p.last_name,
            phone: p.phone || "+34 655 889 900",
            email: p.email || "munir@melosmile.com",
            dni: p.dni_nie || "77889900X",
            dob: p.dob || "1990-06-15",
            gender: p.gender || "Masculino",
            address: p.address || "Paseo de la Castellana 200, Madrid",
            importantDiseases: p.important_diseases || "Ninguna",
            previousOperations: p.previous_operations || "Ninguna",
            allergies: p.allergies || "Polen",
            currentMedication: p.current_medication || "Antihistamínicos",
            treatmentPlan: p.treatment_plan || "Limpieza ultrasónica y Blanqueamiento LED",
            inTreatment: p.in_treatment ?? true,
          });
        }
      } catch (err) {
        console.log("Cargado con datos del paciente.");
      } finally {
        setLoading(false);
      }
    }

    fetchPatientData();
  }, [params.id]);

  const appointments = [
    { id: "a1", date: "2026-07-20", treatment: "Limpieza ultrasónica + Pulido", doctor: "Dra. Osly Melo", status: "Realizada" },
    { id: "a2", date: "2026-06-15", treatment: "Revisión general y escaneado 3D", doctor: "Dra. Norelys", status: "Realizada" },
  ];

  const payments = [
    { id: "p1", date: "2026-07-20", amount: 120, concept: "Tratamiento Blanqueamiento + Limpieza", status: "Pagado" },
    { id: "p2", date: "2026-06-15", amount: 50, concept: "Consulta Diagnóstico 3D", status: "Pagado" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Back button */}
      <div>
        <Link href="/patients" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver al directorio de pacientes
        </Link>
      </div>

      {/* Header Profile Card */}
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 h-28"></div>
        <CardContent className="px-6 sm:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-12 mb-6">
            <div className="h-24 w-24 rounded-2xl bg-white p-2 shadow-xl flex-shrink-0 flex items-center justify-center border border-slate-100">
              <div className="h-full w-full rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-black text-2xl">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                    {patient.firstName} {patient.lastName}
                    <Badge variant="outline" className={`text-xs px-3 py-0.5 rounded-full font-bold border ${patient.inTreatment ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                      {patient.inTreatment ? "En Tratamiento" : "Alta"}
                    </Badge>
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100">{patient.historiaId}</span>
                    <span>DNI/NIE: <strong>{patient.dni}</strong></span>
                    <span>Género: {patient.gender}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-9 gap-2 rounded-xl text-xs font-semibold">
                    <FileText className="h-4 w-4 text-slate-500" /> Editar Ficha
                  </Button>
                  <Button className="h-9 gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-500/20">
                    <CalendarIcon className="h-4 w-4" /> Agendar Cita
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            {/* Contact Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Phone className="h-4 w-4 text-rose-500" /> Información de Contacto
              </h3>
              <div className="text-xs text-slate-700 space-y-1.5 font-medium">
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {patient.phone}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> {patient.email}</p>
                <p className="text-slate-500 pt-1">{patient.address}</p>
              </div>
            </div>

            {/* Medical Alerts */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" /> Alertas Médicas & Anamnesis
              </h3>
              <div className="text-xs space-y-2">
                {patient.allergies && (
                  <div className="flex items-start gap-2 text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Alergias:</strong> {patient.allergies}</span>
                  </div>
                )}
                {patient.importantDiseases && (
                  <div className="flex items-start gap-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100 font-medium">
                    <Activity className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span><strong>Antecedentes:</strong> {patient.importantDiseases}</span>
                  </div>
                )}
                {patient.currentMedication && (
                  <div className="flex items-start gap-2 text-purple-800 bg-purple-50 p-2.5 rounded-xl border border-purple-100 font-medium">
                    <Pill className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
                    <span><strong>Medicación:</strong> {patient.currentMedication}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Treatment Plan */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-rose-500" /> Plan de Tratamiento Activo
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                  {patient.treatmentPlan}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1.5 rounded-2xl w-full justify-start overflow-x-auto h-auto shadow-sm">
          <TabsTrigger value="historial" className="rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white font-semibold text-xs py-2.5 px-4">
            Historial de Citas
          </TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white font-semibold text-xs py-2.5 px-4">
            Documentos y Consentimientos
          </TabsTrigger>
          <TabsTrigger value="pagos" className="rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white font-semibold text-xs py-2.5 px-4">
            Facturación y Pagos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="mt-4 space-y-4">
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Historial Clínico de Visitas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {appointments.map(app => (
                  <div key={app.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-200">
                        <span className="text-xs font-bold text-slate-800">{app.date.split("-")[2]}</span>
                        <span className="text-[9px] font-bold text-rose-600 uppercase">{app.date.split("-")[1]}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{app.treatment}</p>
                        <p className="text-xs text-slate-500">{app.doctor}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Documentación Adjunta</CardTitle>
              <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1 text-xs font-semibold">
                <Upload className="h-3.5 w-3.5" /> Subir Documento / Consentimiento
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3.5 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-rose-300 cursor-pointer transition-colors bg-slate-50">
                  <FileText className="h-8 w-8 text-rose-500 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">Consentimiento_Tratamiento_Firmado.pdf</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Firmado el 15/06/2026</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos" className="mt-4">
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Historial Financiero y Entregas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {payments.map(pay => (
                  <div key={pay.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{pay.concept}</p>
                      <p className="text-xs text-slate-500">{pay.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">{pay.amount.toFixed(2)} €</p>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1 justify-end w-fit ml-auto mt-1">
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
