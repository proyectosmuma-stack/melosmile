"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  Calendar as CalendarIcon, 
  FileText, 
  Mic, 
  Camera, 
  FileSpreadsheet, 
  Edit3, 
  ArrowLeft, 
  Sparkles,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

interface Clinic {
  id: string;
  name: string;
  color_hex?: string;
  base_commission_pct?: number;
  lab_discount_pct?: number;
  tracks_payments?: boolean;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function NewBillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryClinicId = searchParams.get("clinic_id") || "";
  const queryMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : new Date().getMonth() + 1;
  const queryYear = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>(queryClinicId);
  const [month, setMonth] = useState<number>(queryMonth);
  const [year, setYear] = useState<number>(queryYear);

  const [sourceType, setSourceType] = useState<"text" | "audio" | "image" | "excel" | "manual">("excel");
  const [rawText, setRawText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadClinics() {
      try {
        const res = await fetch("/api/ai-context");
        if (res.ok) {
          const data = await res.json();
          if (data.clinics) {
            setClinics(data.clinics);
            if (!selectedClinicId && data.clinics.length > 0) {
              // Match "Daniel Bustamante" if queryClinicId is not present
              const bustamante = data.clinics.find((c: Clinic) => c.name.toLowerCase().includes("bustamante"));
              setSelectedClinicId(bustamante ? bustamante.id : data.clinics[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading clinics:", err);
      }
    }
    loadClinics();
  }, []);

  const selectedClinic = clinics.find(c => c.id === selectedClinicId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedClinicId) {
      setErrorMessage("Por favor, selecciona una clínica obligatoria.");
      return;
    }

    setIsProcessing(true);

    try {
      if (sourceType === "manual") {
        const res = await fetch("/api/billing/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinic_id: selectedClinicId,
            month,
            year,
            source_type: "manual",
            lines: []
          })
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Error al crear la sesión.");
        }

        router.push(`/billing/${data.session.id}`);
        return;
      }

      let parsedLines: any[] = [];
      let fileBase64 = "";

      // Client side Excel parsing if file is selected
      if (selectedFile && sourceType === "excel") {
        const buffer = await selectedFile.arrayBuffer();
        fileBase64 = Buffer.from(buffer).toString("base64");

        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let headerIdx = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const rowStr = JSON.stringify(rows[i] || []).toLowerCase();
          if (rowStr.includes("nombre") || rowStr.includes("tratamiento")) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx !== -1) {
          const headers = (rows[headerIdx] as any[]).map(h => String(h || "").trim().toLowerCase());
          const dateCol = headers.findIndex(h => h.includes("fecha"));
          const nameCol = headers.findIndex(h => h.includes("nombre"));
          const lastNameCol = headers.findIndex(h => h.includes("apellido"));
          const treatmentCol = headers.findIndex(h => h.includes("tratamiento") || h.includes("tratmiento"));
          const obsCol = headers.findIndex(h => h.includes("observaci") || h.includes("obs"));
          const qtyCol = headers.findIndex(h => h.includes("cant"));
          const priceCol = headers.findIndex(h => h === "precio");
          const altPriceCol = headers.findIndex(h => h.includes("otro precio"));

          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const nameVal = nameCol !== -1 ? String(row[nameCol] || "").trim() : "";
            const lastNameVal = lastNameCol !== -1 ? String(row[lastNameCol] || "").trim() : "";

            if (!nameVal && !lastNameVal) continue;
            const fullName = `${nameVal} ${lastNameVal}`.trim();
            if (fullName.toUpperCase().includes("#N/A #N/A")) continue;

            let rowDateStr = null;
            if (dateCol !== -1 && row[dateCol]) {
              const d = new Date(row[dateCol]);
              if (!isNaN(d.getTime())) {
                rowDateStr = d.toISOString().split("T")[0];
              }
            }

            parsedLines.push({
              session_date: rowDateStr || `${year}-${String(month).padStart(2, "0")}-01`,
              patient_name: fullName,
              treatment_name: treatmentCol !== -1 ? String(row[treatmentCol] || "").trim() : "Tratamiento",
              observation: obsCol !== -1 ? String(row[obsCol] || "").trim() : "",
              quantity: qtyCol !== -1 && row[qtyCol] !== undefined ? parseFloat(row[qtyCol]) || 0 : 1,
              unit_price: priceCol !== -1 && row[priceCol] !== undefined ? parseFloat(row[priceCol]) || 0 : 0,
              alt_price: altPriceCol !== -1 && row[altPriceCol] !== undefined ? parseFloat(row[altPriceCol]) || 0 : 0
            });
          }
        }
      }

      // Call Extract API
      const res = await fetch("/api/billing/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: selectedClinicId,
          month,
          year,
          source_type: sourceType,
          raw_text: rawText,
          file_base64: fileBase64,
          lines: parsedLines
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error durante el procesamiento.");
      }

      router.push(`/billing/${data.session.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar los datos.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link href="/billing">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
            <ArrowLeft className="w-4 h-4" />
            Volver a Contabilidad
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Contabilidad Mensual</h1>
          <p className="text-sm text-slate-500 mt-1">
            Selecciona la clínica, el período y el método de entrada de datos
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Paso 1 — Clínica */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              1. Selecciona la Clínica (Obligatorio)
            </label>

            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-base font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="" disabled>-- Elige una clínica de la base de datos --</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Comisión: {c.base_commission_pct || 60}% | Lab: {c.lab_discount_pct || 50}%)
                </option>
              ))}
            </select>

            {selectedClinic && (
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <div>
                  Configuración aplicada: <strong>{selectedClinic.base_commission_pct || 60}% comisión</strong> | <strong>{selectedClinic.lab_discount_pct || 50}% descuento lab</strong>
                </div>
                {selectedClinic.tracks_payments && (
                  <span className="font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                    Controla pagos de pacientes
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Paso 2 — Período (Mes/Año) */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              2. Selecciona el Período
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">Mes</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">Año</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Paso 3 — Origen de los datos */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              3. Origen e Entrada de Datos
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet },
                { id: "text", label: "Texto / Email", icon: FileText },
                { id: "audio", label: "Audio Dictado", icon: Mic },
                { id: "image", label: "Foto / Manuscrito", icon: Camera },
                { id: "manual", label: "Tabla Manual", icon: Edit3 }
              ].map(src => {
                const Icon = src.icon;
                const active = sourceType === src.id;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setSourceType(src.id as any)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                      active 
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 font-bold" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                    <span className="text-xs">{src.label}</span>
                  </button>
                );
              })}
            </div>

            {sourceType === "text" && (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold text-slate-700">Pega aquí el texto, email o notas dictadas:</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Ejemplo: Pedro García, obturación simple 68€, lab 15€. Maria Lopez control 90€..."
                  className="w-full h-36 p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {(sourceType === "audio" || sourceType === "image" || sourceType === "excel") && (
              <div className="mt-4 p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 text-center space-y-3">
                <input
                  type="file"
                  id="fileUpload"
                  className="hidden"
                  accept={
                    sourceType === "audio" ? "audio/*" :
                    sourceType === "image" ? "image/*" : ".xlsx,.xls"
                  }
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="fileUpload" className="cursor-pointer inline-flex flex-col items-center">
                  <span className="text-sm font-semibold text-emerald-700 hover:underline">
                    {selectedFile ? selectedFile.name : `Haz clic para seleccionar archivo (${sourceType})`}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">Formatos soportados: mp3, wav, png, jpg, xlsx</span>
                </label>
              </div>
            )}

            {sourceType === "manual" && (
              <div className="mt-4 p-4 bg-slate-100 rounded-xl text-xs text-slate-600">
                Se creará una sesión contable limpia con tabla manual interactiva para añadir líneas una a una.
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <Button
              type="submit"
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl shadow-md gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Procesando datos...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Crear y Revisar Contabilidad
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewBillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 p-12 text-center text-slate-500">
        Cargando formulario de contabilidad...
      </div>
    }>
      <NewBillingContent />
    </Suspense>
  );
}
