"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Search, Bell, Plus, RefreshCw, CalendarCheck2, Sparkles, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/layout/notification-center";
import { PatientSelect } from "@/components/patients/patient-select";
import {
  NewAppointmentModalGlobal,
  triggerNewAppointmentModal,
} from "@/components/calendar/new-appointment-modal";
import {
  GlobalAIAgentModal,
  triggerAIAgentModal,
} from "@/components/dashboard/global-ai-agent-modal";

import { ClinicProvider } from "@/context/clinic-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClinicProvider>
      <div className="flex h-screen w-full bg-muted/70 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 shrink-0 bg-card/80 backdrop-blur-md border-b border-border/80 px-4 flex items-center justify-between gap-4 z-10">
          {/* Mobile Menu Trigger */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"))}
            className="md:hidden p-2 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            title="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search bar */}
          <div className="relative w-full max-w-md">
            <PatientSelect />
          </div>

          {/* Action buttons & status badges */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell />

            {/* AI Assistant Quick Action (Shortcut: Cmd+K / Ctrl+K) */}
            <Button
              onClick={() => triggerAIAgentModal()}
              className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 gap-2 transition-all cursor-pointer"
              title="Abrir Musly (⌘K)"
            >
              <Sparkles className="h-4 w-4" />
              <span>Musly</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono tracking-tighter">
                ⌘K
              </kbd>
            </Button>

            {/* Quick Action Button */}
            <Button 
              onClick={() => triggerNewAppointmentModal()}
              className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nueva Cita</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-4 lg:pt-3">
          {children}
        </main>
      </div>

      {/* Global New Appointment Modal */}
      <NewAppointmentModalGlobal />
      {/* Global AI Agent Modal (Floating button & overlay everywhere) */}
      <GlobalAIAgentModal />
    </div>
    </ClinicProvider>
  );
}
