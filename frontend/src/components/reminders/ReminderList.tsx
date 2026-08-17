"use client";

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useReminders } from "@/hooks/use-reminders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, XCircle, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReminderListProps {
  patientId?: string;
}

export function ReminderList({ patientId }: ReminderListProps) {
  const { reminders, isLoading, isError, cancelReminder } = useReminders(patientId);

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          Recordatorios Pendientes
        </CardTitle>
        <CardDescription>
          Próximos envíos automáticos para {patientId ? "este paciente" : "los próximos 7 días"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Programada</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map((reminder: any) => (
                <TableRow key={reminder.id}>
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
                    {reminder.status === "pendiente" && (
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}