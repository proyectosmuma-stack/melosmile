"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Stethoscope, FlaskConical, ChevronRight, Settings, Palette } from "lucide-react";
import { ThemeToggle } from "@/components/settings/theme-toggle";

const sections = [
  {
    title: "Clínicas",
    description: "Gestiona las sedes, datos de contacto y reglas de comisión por familia de tratamiento.",
    href: "/settings/clinics",
    icon: Building2,
    color: "bg-info/10 text-info",
    badge: "3 sedes configuradas",
  },
  {
    title: "Profesionales",
    description: "Alta y edición de doctoras y profesionales con sus especialidades y comisiones base.",
    href: "/settings/professionals",
    icon: Stethoscope,
    color: "bg-success/10 text-success",
    badge: "4 profesionales",
  },
  {
    title: "Tratamientos",
    description: "Catálogo completo de tratamientos organizado por familias, con precios y costes de laboratorio.",
    href: "/settings/treatments",
    icon: FlaskConical,
    color: "bg-(--brand-ai-from)/10 text-(--brand-ai-from)",
    badge: "50+ tratamientos",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center">
          <Settings className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona clínicas, profesionales y el catálogo de tratamientos de Melosmile.
          </p>
        </div>
      </div>

      {/* Apariencia */}
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Apariencia</h2>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                Elige entre modo claro y oscuro
              </p>
            </div>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="h-full rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-200 group-hover:-translate-y-0.5">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-xl ${s.color} flex items-center justify-center`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary/80 transition-colors mt-1" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{s.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                </div>
                <span className="inline-block text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full w-fit">
                  {s.badge}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}