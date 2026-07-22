"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Search, Bell, Plus, RefreshCw, CalendarCheck2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientSelect } from "@/components/patients/patient-select";
import {
  NewAppointmentModalGlobal,
  triggerNewAppointmentModal,
} from "@/components/calendar/new-appointment-modal";
import {
  GlobalAIAgentModal,
  triggerAIAgentModal,
} from "@/components/dashboard/global-ai-agent-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-slate-100/70 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-20 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between gap-4 z-10">
          {/* Search bar */}
          <div className="relative w-full max-w-md">
            <PatientSelect />
          </div>

          {/* Action buttons & status badges */}
          <div className="flex items-center gap-3">
            {/* Odoo Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              <span>Odoo API: Connected</span>
            </div>

            {/* WebCal Sync Link */}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex items-center gap-2 rounded-xl text-slate-700 border-slate-200 hover:bg-slate-50 h-10 px-3.5"
            >
              <CalendarCheck2 className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold">Sync Google/Apple</span>
            </Button>

            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-10 w-10 relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </Button>

            {/* AI Assistant Quick Action */}
            <Button
              onClick={() => triggerAIAgentModal()}
              className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Agente IA</span>
            </Button>

            {/* Quick Action Button */}
            <Button 
              onClick={() => triggerNewAppointmentModal()}
              className="h-10 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-md shadow-rose-500/20 gap-2 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Cita</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>

      {/* Global New Appointment Modal */}
      <NewAppointmentModalGlobal />
      {/* Global AI Agent Modal (Floating button & overlay everywhere) */}
      <GlobalAIAgentModal />
    </div>
  );
}
