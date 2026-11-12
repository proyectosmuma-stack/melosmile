"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Megaphone,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useClinic } from "@/context/clinic-context";
import { MiniCalendar } from "@/components/calendar/mini-calendar";




const mainNavigation = [
  { name: "Agenda & Citas", href: "/", icon: Calendar },
  { name: "Fichas Pacientes", href: "/patients", icon: Users },
  { name: "Notificaciones", href: "/reminders", icon: Megaphone },
  { name: "Cálculo Facturación", href: "/billing", icon: Receipt },
];

const settingsSubMenu = [
  { name: "General", href: "/settings", icon: Settings },
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

  const [isCollapsed, setIsCollapsed] = useState(true); // Collapsed by default as requested
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    window.addEventListener("close-mobile-sidebar", handleClose);
    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("close-mobile-sidebar", handleClose);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  
  // Try to use clinic context if available (it might only be provided in some routes, but layout should have it)
  // We'll wrap it in a try-catch or safe component if needed, but context is usually safe if wrapped at root.
  let clinics: any[] = [];
  let selectedClinicId = "all";
  let setSelectedClinicId = (id: string) => {};
  try {
    const clinicContext = useClinic();
    if (clinicContext) {
      clinics = clinicContext.clinics || [];
      selectedClinicId = clinicContext.selectedClinicId;
      setSelectedClinicId = clinicContext.setSelectedClinicId;
    }
  } catch (e) {
    // Context might not be available in some generic pages
  }

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
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground shadow-2xl z-50 md:z-30 border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0",
          "fixed md:relative inset-y-0 left-0",
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
          !mobileOpen && (isCollapsed ? "md:w-20" : "md:w-72")
        )}
      >
        {/* Header / Brand & Collapse Toggle */}
        <div
          className={cn(
            "flex h-20 shrink-0 items-center border-b border-sidebar-border bg-sidebar/60 backdrop-blur-md px-4",
            isCollapsed && !mobileOpen ? "justify-center" : "justify-between"
          )}
        >
          {/* Mobile close button when mobileOpen is true */}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-sidebar-muted-foreground hover:text-white hover:bg-sidebar-accent mr-2 cursor-pointer"
              title="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              {/* Isotipo MeloSmile */}
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shadow-lg ring-1 ring-white/20 shrink-0 p-1.5">
                <Image
                  src="/brand/logo-color.svg"
                  alt="MeloSmile"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="animate-in fade-in duration-200 truncate">
                {/* Logotipo completo */}
                <Image
                  src="/brand/full-logo-color.svg"
                  alt="MeloSmile"
                  width={140}
                  height={36}
                  className="object-contain max-h-9"
                  priority
                />
                <p className="text-xs text-sidebar-muted-foreground font-medium truncate mt-0.5">Gestión Odontológica</p>
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
            className="h-10 w-10 rounded-xl hover:bg-sidebar-accent border border-transparent hover:border-sidebar-border text-sidebar-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Expandir menú sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
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
                  title={isCollapsed ? item.name : undefined}
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
              title={isCollapsed ? "Configuración" : undefined}
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

        {/* Mini Calendar when expanded */}
        {!isCollapsed && (
          <div className="mt-6 flex flex-col gap-4 px-1 animate-in fade-in duration-300">
            {/* Mini Calendar */}
            <div className="px-1 mt-2">
              <MiniCalendar 
                onSelectDate={(date) => {
                  if (typeof window !== "undefined") {
                    // Dispatch event for CalendarView to catch and navigate to Day View
                    const event = new CustomEvent("sidebar-date-select", { detail: { date } });
                    window.dispatchEvent(event);
                  }
                }}
              />
            </div>
          </div>
        )}

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
          ) : (
            <button
              onClick={handleLogout}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Cerrar sesión: Dra. Osly Melo"
            />
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
