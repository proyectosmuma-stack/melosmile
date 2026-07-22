"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { AIAgentBar } from "@/components/dashboard/ai-agent-bar";
import { Calendar as CalendarIcon, Users, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const CalendarView = dynamic(
  () => import("@/components/calendar/calendar-view").then((mod) => mod.CalendarView),
  { ssr: false }
);

export default function DashboardPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto">
      {/* Conversational AI Agent Bar */}
      <AIAgentBar />

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
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl w-fit">
          {[
            { id: "all", label: "Todas las Sedes" },
            { id: "albacete", label: "Albacete" },
            { id: "goya", label: "Goya" },
            { id: "rozas", label: "Las Rozas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedFilter === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
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
              <h3 className="text-lg font-bold text-slate-900 leading-tight">8 Citas</h3>
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
              <h3 className="text-lg font-bold text-slate-900 leading-tight">14.280 €</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">+12% vs mes anterior</p>
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
              <h3 className="text-lg font-bold text-slate-900 leading-tight">142 Pacientes</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">En las 3 clínicas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Section */}
      <div className="w-full">
        <CalendarView />
      </div>
    </div>
  );
}
