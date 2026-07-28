"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertCircle, Sparkles, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

export type SystemNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "success" | "info" | "warning";
  read: boolean;
};

const INITIAL_NOTIFICATIONS: SystemNotification[] = [];

let globalAddNotification: ((notif: Omit<SystemNotification, "id" | "timestamp" | "read">) => void) | null = null;

export function addSystemNotification(notif: Omit<SystemNotification, "id" | "timestamp" | "read">) {
  const stored: SystemNotification[] = JSON.parse(localStorage.getItem("melosmile_notifications") || "[]");
  const exists = stored.some((n) => n.title === notif.title && n.message === notif.message);
  if (!exists) {
    const item: SystemNotification = {
      ...notif,
      id: Date.now().toString(),
      timestamp: "Ahora mismo",
      read: false,
    };
    stored.unshift(item);
    localStorage.setItem("melosmile_notifications", JSON.stringify(stored));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("melosmile_notifications_updated", { detail: item }));
    }
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchActivePlanAlerts = async (): Promise<SystemNotification[]> => {
      try {
        const res = await fetch("/api/treatment-plans?status=activo");
        if (!res.ok) return [];
        const json = await res.json();
        const plans = json.data || [];

        if (!plans || plans.length === 0) return [];

        const alerts: SystemNotification[] = [];

        for (const plan of plans) {
          if (!plan.patients) continue;

          const { data: appts } = await supabase
            .from("appointments")
            .select("id, status, reason")
            .eq("patient_id", plan.patient_id);

          const completedCount = (appts || []).filter((a: any) => {
            const isNotCancelled = a.status !== "Cancelada" && a.status !== "cancelada";
            const isControl = /control|mensualidad/i.test(a.reason || "");
            return isNotCancelled && isControl;
          }).length;

          const totalCompleted = completedCount + (plan.paid_installments_count || 0);
          const totalInst = plan.total_installments || 0;
          const remaining = Math.max(0, totalInst - totalCompleted);

          if (totalInst > 0 && remaining <= 1) {
            const pName = `${plan.patients.first_name || ""} ${plan.patients.last_name || ""}`.trim();
            const hId = plan.patients.historia_id || "";
            const tType = plan.treatment_type || "Ortodoncia";

            alerts.push({
              id: `plan-alert-${plan.id}`,
              title: `⚠️ Revisión de Plan: ${tType}`,
              message: `El paciente ${pName} (${hId}) ha completado ${totalCompleted} de ${totalInst} mensualidades (${remaining === 0 ? "¡Plan alcanzado 100%!" : "Queda 1 cuota pendiente"}).`,
              timestamp: "Plan Activo",
              type: "warning",
              read: false,
            });
          }
        }

        return alerts;
      } catch (e) {
        console.warn("Notice fetching plan alerts:", e);
        return [];
      }
    };

    const syncNotifs = async () => {
      const saved = localStorage.getItem("melosmile_notifications");
      let local: SystemNotification[] = [];
      if (saved) {
        try {
          local = JSON.parse(saved);
        } catch (e) {}
      }

      const dynamicAlerts = await fetchActivePlanAlerts();

      const combined = [...dynamicAlerts];
      local.forEach((loc) => {
        if (!combined.some((c) => c.title === loc.title && c.message === loc.message)) {
          combined.push(loc);
        }
      });

      setNotifications(combined);
    };

    syncNotifs();

    const handleUpdate = () => {
      syncNotifs();
    };

    window.addEventListener("melosmile_notifications_updated", handleUpdate);
    return () => {
      window.removeEventListener("melosmile_notifications_updated", handleUpdate);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("melosmile_notifications", JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem("melosmile_notifications");
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        className="rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-10 w-10 relative cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Popover */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Notificaciones</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="bg-rose-100 text-rose-700 font-bold text-[10px]">
                    {unreadCount} nuevas
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-slate-400 hover:text-slate-600">
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Limpiar
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-7 w-7 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No tienes notificaciones pendientes.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 transition-colors ${!n.read ? "bg-emerald-50/40" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start gap-3">
                      {n.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                          <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
