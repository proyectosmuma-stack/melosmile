"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Stethoscope, FlaskConical, ChevronRight, Settings } from "lucide-react";

const sections = [
  {
    title: "Clínicas",
    description: "Gestiona las sedes, datos de contacto y reglas de comisión por familia de tratamiento.",
    href: "/settings/clinics",
    icon: Building2,
    color: "bg-blue-50 text-blue-600",
    badge: "3 sedes configuradas",
  },
  {
    title: "Profesionales",
    description: "Alta y edición de doctoras y profesionales con sus especialidades y comisiones base.",
    href: "/settings/professionals",
    icon: Stethoscope,
    color: "bg-emerald-50 text-emerald-600",
    badge: "4 profesionales",
  },
  {
    title: "Tratamientos",
    description: "Catálogo completo de tratamientos organizado por familias, con precios y costes de laboratorio.",
    href: "/settings/treatments",
    icon: FlaskConical,
    color: "bg-violet-50 text-violet-600",
    badge: "50+ tratamientos",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Settings className="h-6 w-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona clínicas, profesionales y el catálogo de tratamientos de Melosmile.
          </p>
        </div>
      </div>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-rose-200 transition-all duration-200 group-hover:-translate-y-0.5">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-xl ${s.color} flex items-center justify-center`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-rose-400 transition-colors mt-1" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{s.title}</h2>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{s.description}</p>
                </div>
                <span className="inline-block text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit">
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
