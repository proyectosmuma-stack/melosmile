"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AIAgentBar } from "@/components/dashboard/ai-agent-bar";
import { Calendar as CalendarIcon, Users, TrendingUp, Sparkles, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

const CalendarView = dynamic(
  () => import("@/components/calendar/calendar-view").then((mod) => mod.CalendarView),
  { ssr: false }
);

export default function DashboardPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  
  // Real KPIs state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    billedThisMonth: 0,
    patientsThisMonth: 0
  });

  useEffect(() => {
    async function fetchKPIs() {
      setLoading(true);
      try {
        // Fetch real clinics from database for quick filters
        const { data: cData } = await (supabase as any)
          .from("clinics")
          .select("id, name")
          .order("name");
        if (cData) setClinics(cData);

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Month start
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayStr = firstDayOfMonth.toISOString();
        
        // Appointments today
        const { count: appointmentsCount } = await (supabase as any)
          .from("appointments")
          .select("id", { count: "exact" })
          .gte("appointment_date", todayStr + "T00:00:00")
          .lte("appointment_date", todayStr + "T23:59:59");
          
        // Billed this month (from billing_records)
        const { data: billingData } = await (supabase as any)
          .from("billing_records")
          .select("total_amount")
          .gte("date", firstDayStr);
          
        const totalBilled = billingData?.reduce((acc: number, record: any) => acc + Number(record.total_amount || 0), 0) || 0;
        
        // Patients seen this month (from completed appointments)
        const { data: patientsData } = await (supabase as any)
          .from("appointments")
          .select("patient_id")
          .gte("appointment_date", firstDayStr)
          .in("status", ["completed", "in_progress"]);
          
        const uniquePatients = new Set(patientsData?.map((p: any) => p.patient_id)).size;
        
        setStats({
          appointmentsToday: appointmentsCount || 0,
          billedThisMonth: totalBilled,
          patientsThisMonth: uniquePatients
        });
      } catch (error) {
        console.error("Error fetching KPIs:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchKPIs();
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto relative min-h-[calc(100vh-100px)]">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Agenda Principal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestiona citas, tratamientos y facturación integrada en lenguaje natural.
          </p>
        </div>

        {/* Quick Clinic Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl w-fit flex-wrap">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedFilter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todas las Sedes
          </button>
          {clinics.map((clinic) => (
            <button
              key={clinic.id}
              onClick={() => setSelectedFilter(clinic.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedFilter === clinic.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {clinic.name}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Metric Cards Row (3 widgets) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Clickable Citas Para Hoy -> switches calendar to Day View of Today */}
        <Card
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("switch-to-today-day-view"));
            }
          }}
          className="rounded-xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group"
          title="Haz clic para ver las citas de hoy en vista diaria"
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center font-bold shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Citas para Hoy</p>
              <h3 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : `${stats.appointmentsToday} Citas`}
              </h3>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5 group-hover:underline">Ver vista del día →</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facturado Este Mes</p>
              <h3 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : `${stats.billedThisMonth.toLocaleString('es-ES')} €`}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Facturación activa</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pacientes Atendidos</p>
              <h3 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : `${stats.patientsThisMonth} Pacientes`}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">En el mes actual</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Section */}
      <div className="w-full">
        <CalendarView selectedClinicId={selectedFilter} />
      </div>
    </div>
  );
}
