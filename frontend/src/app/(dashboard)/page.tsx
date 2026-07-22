"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Agenda Principal
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
              Vista Semanal
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona citas, tratamientos y facturación integrada en lenguaje natural.
          </p>
        </div>

        {/* Quick Clinic Filter Pills */}
        <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl w-fit">
          {[
            { id: "all", label: "Todas" },
            { id: "albacete", label: "Albacete" },
            { id: "goya", label: "Goya" },
            { id: "rozas", label: "Rozas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Citas para Hoy</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">8 Citas</h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">3 en Albacete · 5 en Goya</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Facturado Este Mes</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">14.280 €</h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">+12% vs mes anterior</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pacientes Atendidos</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">142 Pacientes</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">En las 3 clínicas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Procesado por n8n IA</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">38 Registros</h3>
              <p className="text-xs text-purple-600 font-medium mt-0.5">100% de precisión</p>
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
