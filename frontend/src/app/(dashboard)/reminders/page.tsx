"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReminderList } from "@/components/reminders/ReminderList";
import { GlobalNewReminderModal } from "@/components/reminders/global-new-reminder-modal";

export default function GlobalRemindersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  // We can use a key to force re-render the ReminderList after a new reminder is created
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-none p-6 border-b border-border bg-card shadow-xs z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Centro de Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los recordatorios y notificaciones pendientes de todos los pacientes.
          </p>
        </div>
        
        <Button 
          onClick={() => setModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-md gap-2"
        >
          <Plus className="h-5 w-5" />
          Nuevo Recordatorio
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
        <div className="max-w-6xl mx-auto space-y-6">
          <ReminderList key={refreshKey} />
        </div>
      </div>

      {/* Modal */}
      <GlobalNewReminderModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
}
