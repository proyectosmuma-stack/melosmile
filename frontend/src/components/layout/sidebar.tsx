"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const clinics = [
  { id: "all", name: "Todas las Clínicas", color: "bg-rose-500" },
  { id: "goya", name: "Clínica Goya", color: "bg-blue-500" },
  { id: "rozas", name: "Clínica Las Rozas", color: "bg-purple-500" },
  { id: "rya", name: "Clínica RyA", color: "bg-emerald-500" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true); // Collapsed by default as requested
  const [selectedClinic, setSelectedClinic] = useState("all");
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-slate-950 text-slate-100 shadow-2xl relative z-30 border-r border-slate-800/80 transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header / Brand & Collapse Toggle */}
      <div
        className={cn(
          "flex h-20 shrink-0 items-center border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/25 ring-1 ring-white/20 shrink-0">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="animate-in fade-in duration-200 truncate">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  Melosmile
                  <span className="inline-block text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    PRO
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium truncate">Gestión Odontológica</p>
              </div>
            </div>

            <button
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Colapsar menú sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="h-10 w-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer shadow-md"
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
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2 block">
              Sede Activa
            </label>
            <Select value={selectedClinic} onValueChange={(val) => val && setSelectedClinic(val)}>
              <SelectTrigger className="w-full bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-900 transition-colors focus:ring-rose-500 h-11 rounded-xl">
                <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis">
                  <Building2 className="h-4 w-4 text-rose-400 shrink-0" />
                  <SelectValue placeholder="Seleccionar clínica" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 z-50">
                {clinics.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="focus:bg-slate-800 focus:text-white cursor-pointer py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", c.color)} />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          /* Compact Clinic Icon in Collapsed State with Unclipped Floating Tooltip */
          <div className="group relative flex justify-center">
            <div className="h-11 w-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 cursor-pointer hover:bg-slate-800 transition-colors">
              <Building2 className="h-5 w-5" />
            </div>
            {/* Escapes overflow clipping using fixed z-[9999] */}
            <div className="fixed left-24 ml-1 z-[9999] hidden group-hover:flex items-center bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap pointer-events-none">
              Sede: {clinics.find((c) => c.id === selectedClinic)?.name || "Todas las Clínicas"}
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4 space-y-1">
        {!isCollapsed && (
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1 block">
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
                      ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-600/30"
                      : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-100"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-rose-400"
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
                  <div className="fixed left-24 ml-1 z-[9999] hidden group-hover:flex items-center bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap pointer-events-none">
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
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-600/30"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-100"
              )}
            >
              <Settings
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  isSettingsActive ? "text-white" : "text-slate-400 group-hover:text-rose-400"
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
              <div className="fixed left-24 ml-1 z-[9999] hidden group-hover:flex items-center bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap pointer-events-none">
                Configuración (Clínicas, Profesionales, Tratamientos)
              </div>
            )}

            {/* Sub-menu when expanded */}
            {settingsOpen && !isCollapsed && (
              <ul className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
                {settingsSubMenu.map((sub) => {
                  const isSubActive = pathname === sub.href;
                  return (
                    <li key={sub.name}>
                      <Link
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                          isSubActive
                            ? "bg-slate-800 text-rose-400"
                            : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
                        )}
                      >
                        <sub.icon className={cn("h-4 w-4 shrink-0", isSubActive ? "text-rose-400" : "text-slate-500")} />
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
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
        <div
          className={cn(
            "flex items-center rounded-xl bg-slate-900/60 border border-slate-800/50 group relative",
            isCollapsed ? "justify-center p-2" : "gap-3 p-2"
          )}
        >
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              OM
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">Dra. Osly Melo</p>
              <p className="text-xs text-slate-400 truncate">gestion@melosmile.com</p>
            </div>
          )}

          {/* Hover Tooltip when Collapsed — Escapes overflow clipping using fixed z-[9999] */}
          {isCollapsed && (
            <div className="fixed left-24 ml-1 z-[9999] hidden group-hover:flex flex-col bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap pointer-events-none">
              <span className="font-bold">Dra. Osly Melo</span>
              <span className="text-[10px] text-slate-400">gestion@melosmile.com</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
