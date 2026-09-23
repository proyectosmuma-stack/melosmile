"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AIAgentBar } from "@/components/dashboard/ai-agent-bar";
import { Calendar as CalendarIcon, Users, TrendingUp, Sparkles, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

import { useClinic } from "@/context/clinic-context";

const CalendarView = dynamic(
  () => import("@/components/calendar/calendar-view").then((mod) => mod.CalendarView),
  { ssr: false }
);

export default function DashboardPage() {
  const { clinics, selectedClinicId, setSelectedClinicId } = useClinic();
  
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
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        // Month start
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayStr = firstDayOfMonth.toISOString();
        
        // Appointments today (filtered by clinic if selected)
        let apptQuery = (supabase as any)
          .from("appointments")
          .select("id, status, appointment_date, clinic_id")
          .gte("appointment_date", `${todayStr}T00:00:00.000Z`)
          .lte("appointment_date", `${todayStr}T23:59:59.999Z`);

        if (selectedClinicId && selectedClinicId !== "all") {
          apptQuery = apptQuery.eq("clinic_id", selectedClinicId);
        }

        const { data: apptData } = await apptQuery;

        const appointmentsCount = (apptData || []).filter((a: any) => a.status !== "Cancelada" && a.status !== "cancelada").length;
          
        // Billed this month (from billing_records)
        // Columns: calculated_total, created_at (no clinic_id in this table)
        const { data: billingData } = await (supabase as any)
          .from("billing_records")
          .select("calculated_total")
          .gte("created_at", firstDayStr);
          
        const totalBilled = billingData?.reduce((acc: number, record: any) => acc + Number(record.calculated_total || 0), 0) || 0;
        
        // Patients seen this month
        let patientsQuery = (supabase as any)
          .from("appointments")
          .select("patient_id, clinic_id")
          .gte("appointment_date", firstDayStr)
          .eq("status", "Realizada"); // Only real status values: Realizada | Pendiente | Cancelada

        if (selectedClinicId && selectedClinicId !== "all") {
          patientsQuery = patientsQuery.eq("clinic_id", selectedClinicId);
        }
          
        const { data: patientsData } = await patientsQuery;
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
  }, [selectedClinicId]);

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto relative h-[calc(100vh-60px)]">
      
      {/* Page Header (Desktop only - mobile uses native Apple Calendar header) */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Agenda Principal
          </h1>
        </div>

        {/* Quick Clinic Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl w-fit flex-wrap">
          <button
            onClick={() => setSelectedClinicId("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedClinicId === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas las Sedes
          </button>
          {clinics.map((clinic) => (
            <button
              key={clinic.id}
              onClick={() => setSelectedClinicId(clinic.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedClinicId === clinic.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {clinic.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Section */}
      <div className="w-full flex-1 overflow-hidden">
        <CalendarView 
          selectedClinicId={selectedClinicId} 
          stats={stats}
          loadingStats={loading}
        />
      </div>
    </div>
  );
}
