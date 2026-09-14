"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { useReminders } from "@/hooks/use-reminders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Megaphone, 
  XCircle, 
  CheckCircle2,
  Clock, 
  Trash2, 
  Search, 
  Phone, 
  ExternalLink, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Send, 
  AlertCircle 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReminderListProps {
  patientId?: string;
}

interface PatientGroup {
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  reminders: any[];
}

export function ReminderList({ patientId }: ReminderListProps) {
  const { reminders, isLoading, isError, cancelReminder } = useReminders(patientId);
  const [activeTab, setActiveTab] = useState<"pendientes" | "historial">("pendientes");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // 1. Pending reminders: strictly pending status and future scheduled time (not expired)
  const pendingReminders = useMemo(() => {
    if (!reminders) return [];
    const nowMs = Date.now() - 60000; // 1 min grace period
    return reminders.filter((r: any) => {
      const isPending = r.status === "pendiente";
      const schedMs = new Date(r.scheduled_at).getTime();
      const notExpired = !isNaN(schedMs) && schedMs >= nowMs;
      return isPending && notExpired;
    });
  }, [reminders]);

  // 2. History reminders: sent, cancelled, error, or past-due
  // Rule: "El historial debe desaparecer de esta vista al dia siguiente de haber sido realizada la cita del paciente."
  const historyReminders = useMemo(() => {
    if (!reminders) return [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const nowMs = Date.now() - 60000;

    return reminders.filter((r: any) => {
      const isPending = r.status === "pendiente";
      const schedMs = new Date(r.scheduled_at).getTime();
      const isExpired = isNaN(schedMs) || schedMs < nowMs;
      const isHistoryItem = !isPending || isExpired;

      if (!isHistoryItem) return false;

      // Check appointment date (or fallback to scheduled_at)
      const appointmentDateStr = r.appointment?.appointment_date || r.scheduled_at;
      if (appointmentDateStr) {
        const apptDate = new Date(appointmentDateStr);
        if (!isNaN(apptDate.getTime())) {
          const apptDayStart = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate()).getTime();
          // Difference in calendar days from the appointment day to today
          const diffDays = Math.round((todayStart - apptDayStart) / (1000 * 60 * 60 * 24));
          // Once the day of the appointment has passed and "el día siguiente" arrives (diffDays >= 1),
          // it disappears from this view.
          if (diffDays >= 1) {
            return false;
          }
        }
      }

      return true;
    });
  }, [reminders]);

  // Reminders for current active tab
  const currentTabReminders = activeTab === "pendientes" ? pendingReminders : historyReminders;

  // 3. Group current tab reminders by patient
  const groupedByPatient = useMemo(() => {
    const map = new Map<string, PatientGroup>();

    for (const reminder of currentTabReminders) {
      const pId = reminder.patient_id || reminder.patient?.id || "unknown";
      const pName = reminder.patient 
        ? `${reminder.patient.first_name || ""} ${reminder.patient.last_name || ""}`.trim() || "Paciente Sin Nombre"
        : "Paciente sin asignar";
      const pPhone = reminder.patient?.phone || null;

      if (!map.has(pId)) {
        map.set(pId, {
          patientId: pId,
          patientName: pName,
          patientPhone: pPhone,
          reminders: [],
        });
      }
      map.get(pId)!.reminders.push(reminder);
    }

    // Sort patient groups alphabetically
    const groups = Array.from(map.values()).sort((a, b) => 
      a.patientName.localeCompare(b.patientName)
    );

    // Filter by search query if any
    if (!searchQuery.trim()) return groups;

    const q = searchQuery.toLowerCase().trim();
    return groups
      .map(group => {
        const matchesPatient = group.patientName.toLowerCase().includes(q) || 
          (group.patientPhone && group.patientPhone.toLowerCase().includes(q));
        if (matchesPatient) return group;

        const matchingReminders = group.reminders.filter((r: any) => 
          (r.message && r.message.toLowerCase().includes(q)) ||
          (r.subject && r.subject.toLowerCase().includes(q)) ||
          (r.channel && r.channel.toLowerCase().includes(q))
        );

        if (matchingReminders.length > 0) {
          return { ...group, reminders: matchingReminders };
        }
        return null;
      })
      .filter((g): g is PatientGroup => g !== null);
  }, [currentTabReminders, searchQuery]);

  // Flatten currently visible reminder IDs
  const visibleReminderIds = useMemo(() => {
    return groupedByPatient.flatMap(g => g.reminders.map(r => r.id));
  }, [groupedByPatient]);

  const allVisibleSelected = visibleReminderIds.length > 0 && 
    visibleReminderIds.every(id => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleReminderIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleReminderIds])));
    }
  };

  const toggleSelectPatient = (groupReminders: any[]) => {
    const groupIds = groupReminders.map(r => r.id);
    const allGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.includes(id));

    if (allGroupSelected) {
      setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkCancel = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`¿Estás seguro de cancelar ${selectedIds.length} recordatorio(s)?`)) {
      setCancelling(true);
      try {
        for (const id of selectedIds) {
          await cancelReminder(id);
        }
        setSelectedIds([]);
      } finally {
        setCancelling(false);
      }
    }
  };

  const handleCancelSingle = async (id: string) => {
    if (confirm("¿Estás seguro de cancelar este recordatorio?")) {
      await cancelReminder(id);
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const formatScheduledDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      if (isToday(d)) {
        return `Hoy, ${format(d, "HH:mm", { locale: es })}`;
      }
      if (isTomorrow(d)) {
        return `Mañana, ${format(d, "HH:mm", { locale: es })}`;
      }
      return format(d, "d 'de' MMM, HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const getChannelBadge = (channel: string | null) => {
    const c = (channel || "whatsapp").toLowerCase();
    switch (c) {
      case "whatsapp":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium gap-1 text-xs">
            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
          </Badge>
        );
      case "email":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-medium gap-1 text-xs">
            <Mail className="w-3.5 h-3.5" /> Email
          </Badge>
        );
      case "sms":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-medium gap-1 text-xs">
            <Smartphone className="w-3.5 h-3.5" /> SMS
          </Badge>
        );
      case "telegram":
        return (
          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-medium gap-1 text-xs">
            <Send className="w-3.5 h-3.5" /> Telegram
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="capitalize text-xs">
            {channel}
          </Badge>
        );
    }
  };

  const getStatusBadge = (reminder: any) => {
    const nowMs = Date.now() - 60000;
    const schedMs = new Date(reminder.scheduled_at).getTime();
    const isPast = !isNaN(schedMs) && schedMs < nowMs;

    switch (reminder.status) {
      case "pendiente":
        if (isPast) {
          return (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-medium text-[11px] gap-1">
              <Clock className="w-3 h-3" /> Vencido
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 font-medium text-[11px] gap-1">
            <Clock className="w-3 h-3" /> Pendiente
          </Badge>
        );
      case "enviado":
      case "leido":
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-medium text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> Enviado
          </Badge>
        );
      case "error":
      case "fallido":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-medium text-[11px] gap-1">
            <AlertCircle className="w-3 h-3" /> Error
          </Badge>
        );
      case "cancelado":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-medium text-[11px] gap-1">
            <XCircle className="w-3 h-3" /> Cancelado
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-[11px]">{reminder.status}</Badge>;
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
            No se pudieron consultar los recordatorios.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tab Navigation: Pendientes vs Historial */}
      <div className="flex items-center gap-2 bg-card border border-border/70 p-1.5 rounded-2xl w-fit shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("pendientes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "pendientes"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pendientes de Envío</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
            activeTab === "pendientes" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {pendingReminders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("historial")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "historial"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Historial y Enviados</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
            activeTab === "historial" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {historyReminders.length}
          </span>
        </button>
      </div>

      {/* Search & Bulk Actions Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por paciente, teléfono o mensaje..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>

          {visibleReminderIds.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none bg-muted/40 hover:bg-muted/70 px-3 py-2 rounded-xl transition-colors">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <span>Seleccionar todos ({visibleReminderIds.length})</span>
              </label>
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkCancel}
              disabled={cancelling}
              className="rounded-xl shadow-xs gap-1.5 font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Cancelar Seleccionados ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Empty State for Active Tab */}
      {currentTabReminders.length === 0 ? (
        <Card className="border-dashed border-2 border-border/70 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-4 bg-muted/60 rounded-2xl mb-4 text-muted-foreground">
              <Megaphone className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {activeTab === "pendientes" 
                ? "No hay recordatorios pendientes programados" 
                : "No hay recordatorios en el historial"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {activeTab === "pendientes" 
                ? "No tienes mensajes pendientes de envío. Los recordatorios ya enviados o vencidos están guardados en la pestaña 'Historial y Enviados'."
                : "No hay registros históricos de recordatorios enviados o cancelados."}
            </p>

            {activeTab === "pendientes" && historyReminders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("historial")}
                className="mt-4 rounded-xl gap-2 font-semibold border-primary/30 text-primary hover:bg-primary/10"
              >
                <CheckCircle2 className="w-4 h-4" />
                Ver {historyReminders.length} recordatorio(s) ya enviado(s)
              </Button>
            )}
          </CardContent>
        </Card>
      ) : groupedByPatient.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No se encontraron recordatorios con el filtro de búsqueda aplicado.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedByPatient.map((group) => {
            const groupIds = group.reminders.map(r => r.id);
            const groupAllSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.includes(id));
            const groupSomeSelected = groupIds.some(id => selectedIds.includes(id));

            return (
              <Card key={group.patientId} className="border border-border/80 shadow-xs overflow-hidden rounded-2xl">
                {/* Patient Header */}
                <div className="bg-muted/40 border-b border-border/60 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={groupAllSelected}
                      ref={el => {
                        if (el) el.indeterminate = !groupAllSelected && groupSomeSelected;
                      }}
                      onChange={() => toggleSelectPatient(group.reminders)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />

                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {group.patientName.slice(0, 2)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          {group.patientId !== "unknown" ? (
                            <Link
                              href={`/patients/${group.patientId}`}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1 group/link"
                            >
                              <span>{group.patientName}</span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover/link:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="font-bold text-sm text-foreground">{group.patientName}</span>
                          )}
                        </div>

                        {group.patientPhone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{group.patientPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 rounded-lg">
                    {group.reminders.length} {group.reminders.length === 1 ? "mensaje" : "mensajes"}
                  </Badge>
                </div>

                {/* Reminders Table */}
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow className="border-border/60">
                        <TableHead className="w-[50px] text-center"></TableHead>
                        <TableHead className="w-[180px]">Programado para</TableHead>
                        <TableHead className="w-[130px]">Canal</TableHead>
                        <TableHead>Mensaje</TableHead>
                        <TableHead className="w-[110px]">Estado</TableHead>
                        <TableHead className="w-[100px] text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.reminders.map((reminder: any) => {
                        const isSelected = selectedIds.includes(reminder.id);
                        const isPending = reminder.status === "pendiente";

                        return (
                          <TableRow 
                            key={reminder.id} 
                            className={`border-border/50 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
                          >
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(reminder.id)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-xs whitespace-nowrap text-foreground">
                              {formatScheduledDate(reminder.scheduled_at)}
                            </TableCell>
                            <TableCell>
                              {getChannelBadge(reminder.channel)}
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="text-xs text-foreground/90 line-clamp-2" title={reminder.message}>
                                {reminder.message}
                              </p>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(reminder)}
                            </TableCell>
                            <TableCell className="text-right">
                              {isPending ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelSingle(reminder.id)}
                                  className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1 font-medium"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Cancelar
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground italic pr-2">
                                  {reminder.sent_at ? `Enviado ${formatScheduledDate(reminder.sent_at)}` : "Completado"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}