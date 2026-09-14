"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useReminders } from "@/hooks/use-reminders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, XCircle, CheckCircle2, AlertCircle, Clock, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReminderListProps {
  patientId?: string;
}

export function ReminderList({ patientId }: ReminderListProps) {
  const { reminders, isLoading, isError, cancelReminder } = useReminders(patientId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pendingReminders = reminders?.filter((r: any) => r.status === "pendiente") || [];
  const allSelected = pendingReminders.length > 0 && selectedIds.length === pendingReminders.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingReminders.map((r: any) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkCancel = async () => {
    if (confirm(`¿Estás seguro de cancelar ${selectedIds.length} recordatorio(s)?`)) {
      // Execute sequentially to avoid rate limiting or overwhelming the hook/backend
      for (const id of selectedIds) {
        await cancelReminder(id);
      }
      setSelectedIds([]);
    }
  };

  if (isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Error al cargar
          </CardTitle>
          <CardDescription className="text-destructive">
            No se pudieron cargar los recordatorios.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando Recordatorios...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reminders || reminders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
          <CalendarClock className="w-12 h-12 mb-4 text-muted-foreground" />
          <p>No hay recordatorios pendientes programados.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pendiente":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>;
      case "enviado":
      case "leido":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><CheckCircle2 className="w-3 h-3 mr-1"/> Enviado</Badge>;
      case "error":
      case "fallido":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><AlertCircle className="w-3 h-3 mr-1"/> Error</Badge>;
      case "cancelado":
        return <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border"><XCircle className="w-3 h-3 mr-1"/> Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCancel = async (id: string) => {
    if (confirm("¿Estás seguro de cancelar este recordatorio?")) {
      await cancelReminder(id);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Recordatorios Pendientes
          </CardTitle>
          <CardDescription>
            Próximos envíos automáticos para {patientId ? "este paciente" : "los próximos 7 días"}.
          </CardDescription>
        </div>
        {selectedIds.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkCancel}
            className="shadow-sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancelar Seleccionados ({selectedIds.length})
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <input 
                    type="checkbox" 
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={pendingReminders.length === 0}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </TableHead>
                <TableHead>Fecha Programada</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map((reminder: any) => {
                const isPending = reminder.status === "pendiente";
                return (
                  <TableRow key={reminder.id} className={selectedIds.includes(reminder.id) ? "bg-muted/50" : ""}>
                    <TableCell className="text-center">
                      {isPending && (
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(reminder.id)}
                          onChange={() => toggleSelect(reminder.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(reminder.scheduled_at), "dd MMM yyyy, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={reminder.message}>
                      {reminder.message}
                    </TableCell>
                    <TableCell className="capitalize">
                      {reminder.channel || "WhatsApp"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(reminder.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => handleCancel(reminder.id)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}