"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Calendar, 
  Users, 
  Receipt, 
  Settings, 
  Building2, 
  ChevronDown, 
  ChevronRight,
  Stethoscope,
  FlaskConical,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useClinic } from "@/context/clinic-context";

const mainNavigation = [
  { name: "Agenda & Citas", href: "/", icon: Calendar },
  { name: "Fichas Pacientes", href: "/patients", icon: Users },
  { name: "Cálculo Facturación", href: "/billing", icon: Receipt },
];

const settingsSubMenu = [
  { name: "Clínicas", href: "/settings/clinics", icon: Building2 },
  { name: "Profesionales", href: "/settings/professionals", icon: Stethoscope },
  { name: "Tratamientos", href: "/settings/treatments", icon: FlaskConical },
];

const COLOR_PALETTE = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-cyan-500",
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { clinics: dbClinics, selectedClinicId, setSelectedClinicId } = useClinic();
  const [isCollapsed, setIsCollapsed] = useState(true); // Collapsed by default as requested
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  // Combine "all" option with real database clinics
  const clinicOptions = [
    { id: "all", name: "Todas las Clínicas", color: "bg-rose-500", colorHex: undefined },
    ...dbClinics.map((c, idx) => ({
      id: c.id,
      name: c.name,
      color: c.color_hex ? `bg-[${c.color_hex}]` : COLOR_PALETTE[idx % COLOR_PALETTE.length],
      colorHex: c.color_hex,
    })),
  ];

  const clinicItems = clinicOptions.map((c) => ({ value: c.id, label: c.name }));

  const currentClinicName =
    clinicOptions.find((c) => c.id === selectedClinicId)?.name || "Todas las Clínicas";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground shadow-2xl relative z-30 border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header / Brand & Collapse Toggle */}
      <div
        className={cn(
          "flex h-20 shrink-0 items-center border-b border-sidebar-border bg-sidebar/60 backdrop-blur-md px-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary via-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-white/20 shrink-0">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="animate-in fade-in duration-200 truncate">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  Melosmile
                  <span className="inline-block text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-primary/20 text-primary-foreground border border-primary/30">
                    PRO
                  </span>
                </h1>
                <p className="text-xs text-sidebar-muted-foreground font-medium truncate">Gestión Odontológica</p>
              </div>
            </div>

            <button
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 rounded-lg bg-sidebar-accent hover:bg-sidebar-muted border border-sidebar-border text-sidebar-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Colapsar menú sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="h-10 w-10 rounded-xl bg-sidebar-accent hover:bg-sidebar-muted border border-sidebar-border text-primary-foreground hover:text-primary-foreground flex items-center justify-center transition-colors cursor-pointer shadow-md"
            title="Expandir menú sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Clinic Selector */}
      <div className="px-3 pt-5 pb-3">
        {!isCollapsed ? (
          <>
            <label className="text-[11px] font-semibold text-sidebar-muted-foreground uppercase tracking-wider px-2 mb-2 block">
              Sede Activa
            </label>
            <Select items={clinicItems} value={selectedClinicId} onValueChange={(val) => val && setSelectedClinicId(val)}>
              <SelectTrigger className="w-full bg-sidebar-accent/90 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent transition-colors focus:ring-primary h-11 rounded-xl">
                <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis">
                  <Building2 className="h-4 w-4 text-primary-foreground shrink-0" />
                  <SelectValue placeholder="Seleccionar clínica" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground z-50">
                {clinicOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="focus:bg-sidebar-muted focus:text-white cursor-pointer py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-2.5 w-2.5 rounded-full shrink-0", c.color)}
                        style={c.colorHex ? { backgroundColor: c.colorHex } : undefined}
                      />
                      <span className="font-medium truncate">{c.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          /* Compact Clinic Icon in Collapsed State with Unclipped Floating Tooltip */
          <div className="group relative flex justify-center">
            <div className="h-11 w-11 rounded-xl bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-primary-foreground cursor-pointer hover:bg-sidebar-muted transition-colors">
              <Building2 className="h-5 w-5" />
            </div>
            {/* Escapes overflow clipping using fixed z-[9999] */}
            <div className="fixed left-24 ml-1 z-[9999] hidden group-hover:flex items-center bg-sidebar-accent text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl border border-sidebar-muted whitespace-nowrap pointer-events-none">
              Sede: {currentClinicName}
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4 space-y-1">
        {!isCollapsed && (
          <span className="text-[11px] font-semibold text-sidebar-muted-foreground uppercase tracking-wider px-2 mb-1 block">
            Menú Principal
          </span>
        )}
        <ul role="list" className="space-y-1">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name} className="group relative flex items-center">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-xl py-3 text-sm font-semibold transition-all duration-200 w-full",
                    isCollapsed ? "justify-center px-0 h-11" : "px-3.5 gap-x-3.5",
                    isActive
                      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30"
                      : "text-sidebar-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-sidebar-muted-foreground group-hover:text-primary-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                  {isActive && !isCollapsed && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
                  )}
                </Link>

                {/* Hover Tooltip when Collapsed — Escapes overflow clipping using fixed z-[9999] */}
                {isCollapsed && (
                  <div className="fixed left-24 ml-1 z-[9999] hidden group-hover:flex items-center bg-sidebar-accent text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl border border-sidebar-muted whitespace-nowrap pointer-events-none">
                    {item.name}
                  </div>
                )}
              </li>
            );
          })}

          {/* Configuración with expandable sub-menu */}
          <li className="group relative flex flex-col justify-center">
            <button
              onClick={() => {
                if (isCollapsed) setIsCollapsed(false);
                setSettingsOpen(!settingsOpen);
              }}
              className={cn(
                "w-full flex items-center rounded-xl py-3 text-sm font-semibold transition-all duration-200 cursor-pointer",
                isCollapsed ? "justify-center px-0 h-11" : "px-3.5 gap-x-3.5",
                isSettingsActive
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30"
                  : "text-sidebar-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
              )}
            >
              <Settings
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  isSettingsActive ? "text-primary-foreground" : "text-sidebar-muted-foreground group-hover:text-primary-foreground"
                )}
              />
              {!isCollapsed && <span>Configuración</span>}
              {!isCollapsed && (
                <span className="ml-auto">
                  {settingsOpen ? (
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  ) : (
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  )}
                </span>
              )}
            </button>

            {/* Hover Tooltip when Collapsed — Escapes overflow clipping using fixed z-[9999] */}
            {isCollapsed && (
              <div className="fixed left-24 ml-1 z-[9999] hidden group-hover:flex items-center bg-sidebar-accent text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl border border-sidebar-muted whitespace-nowrap pointer-events-none">
                Configuración (Clínicas, Profesionales, Tratamientos)
              </div>
            )}

            {/* Sub-menu when expanded */}
            {settingsOpen && !isCollapsed && (
              <ul className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-1">
                {settingsSubMenu.map((sub) => {
                  const isSubActive = pathname === sub.href;
                  return (
                    <li key={sub.name}>
                      <Link
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                          isSubActive
                            ? "bg-sidebar-muted text-primary-foreground"
                            : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <sub.icon className={cn("h-4 w-4 shrink-0", isSubActive ? "text-primary-foreground" : "text-sidebar-muted-foreground")} />
                        {sub.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>

        {/* Spacer to push user footer down */}
        <div className="mt-auto" />
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar/80">
        <div
          className={cn(
            "flex items-center justify-between rounded-xl bg-sidebar-accent/60 border border-sidebar-border/50 group relative",
            isCollapsed ? "p-2" : "p-2.5"
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm shadow-md">
                OM
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success ring-2 ring-sidebar" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">Dra. Osly Melo</p>
                <p className="text-xs text-sidebar-muted-foreground truncate">Oslysmile</p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          {!isCollapsed ? (
            <button
              onClick={handleLogout}
              className="h-8 w-8 rounded-lg bg-sidebar-muted/80 hover:bg-primary/20 text-sidebar-muted-foreground hover:text-primary-foreground border border-sidebar-border/50 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}

          {/* Hover Tooltip when Collapsed — Escapes overflow clipping using fixed z-[9999] */}
          {isCollapsed && (
            <div className="fixed left-24 ml-1 z-[9999] hidden group-hover:flex items-center gap-3 bg-sidebar-accent text-white text-xs px-3 py-2 rounded-xl shadow-2xl border border-sidebar-muted whitespace-nowrap">
              <div className="flex flex-col">
                <span className="font-bold">Dra. Osly Melo (Oslysmile)</span>
                <span className="text-[10px] text-sidebar-muted-foreground">Clic para cerrar sesión</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 rounded bg-primary/30 hover:bg-primary text-primary-foreground hover:text-white transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
