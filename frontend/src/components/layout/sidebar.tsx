"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Calendar, 
  Users, 
  Receipt, 
  Settings, 
  Sparkles, 
  Building2, 
  ChevronDown, 
  ChevronRight,
  Bot,
  Activity,
  CheckCircle2,
  Stethoscope,
  FlaskConical,
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
  const [selectedClinic, setSelectedClinic] = useState("all");
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  return (
    <aside className="flex h-full w-72 flex-col bg-slate-950 text-slate-100 shadow-2xl relative z-20 border-r border-slate-800/80">
      {/* Header / Brand */}
      <div className="flex h-20 shrink-0 items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/25 ring-1 ring-white/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Melosmile
              <span className="inline-block text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Gestión Odontológica</p>
          </div>
        </div>
      </div>

      {/* Clinic Selector */}
      <div className="px-4 pt-5 pb-3">
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
          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
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
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-4 space-y-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1 block">
          Menú Principal
        </span>
        <ul role="list" className="space-y-1">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-x-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200",
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
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              </li>
            );
          })}

          {/* Configuración with expandable sub-menu */}
          <li>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={cn(
                "w-full group relative flex items-center gap-x-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200",
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
              <span>Configuración</span>
              <span className="ml-auto">
                {settingsOpen
                  ? <ChevronDown className="h-4 w-4 opacity-70" />
                  : <ChevronRight className="h-4 w-4 opacity-70" />
                }
              </span>
            </button>

            {/* Sub-menu */}
            {settingsOpen && (
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

        {/* AI & Automation Status Widget */}
        <div className="pt-6 mt-auto">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 space-y-3 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                <Sparkles className="h-4 w-4 animate-spin text-rose-400" style={{ animationDuration: '4s' }} />
                <span>Agente IA n8n</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Activo
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Parseando lenguaje natural y procesando facturas cada 6h.
            </p>
          </div>
        </div>
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/50">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              OM
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">Dra. Osly Melo</p>
            <p className="text-xs text-slate-400 truncate">gestion@melosmile.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
