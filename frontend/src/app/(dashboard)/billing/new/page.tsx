"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  Calendar as CalendarIcon, 
  FileText, 
  ArrowLeft, 
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Clinic {
  id: string;
  name: string;
  color_hex?: string;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function DocumentCleanerPortal() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryClinicId = searchParams.get("clinic_id") || "";
  const queryMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : new Date().getMonth() + 1;
  const queryYear = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>(queryClinicId);
  const [month, setMonth] = useState<number>(queryMonth);
  const [year, setYear] = useState<number>(queryYear);

  const [sourceType, setSourceType] = useState<"text" | "excel" | "image" | "audio">("excel");
  const [rawText, setRawText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadClinics() {
      try {
        const res = await fetch("/api/ai-context");
        if (res.ok) {
          const data = await res.json();
          if (data.clinics) {
            setClinics(data.clinics);
            if (!selectedClinicId && data.clinics.length > 0) {
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
  }, [selectedClinicId]);

  const selectedClinic = clinics.find(c => c.id === selectedClinicId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedClinicId) {
      setErrorMessage("Por favor, selecciona una clínica obligatoria.");
      return;
    }

    if (sourceType !== "text" && !selectedFile) {
      setErrorMessage("Por favor, sube un documento para procesar.");
      return;
    }

    if (sourceType === "text" && !rawText.trim()) {
      setErrorMessage("Por favor, introduce el texto a procesar.");
      return;
    }

    setIsProcessing(true);

    try {
      let fileBase64 = "";
      if (selectedFile) {
        const buffer = await selectedFile.arrayBuffer();
        fileBase64 = Buffer.from(buffer).toString("base64");
      }

      // Enviar a la API proxy del webhook n8n
      const res = await fetch("/api/billing/document-cleaner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: selectedClinicId,
          month,
          year,
          source_type: sourceType,
          content: sourceType === "text" ? rawText : fileBase64,
          filename: selectedFile?.name
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al procesar el documento.");
      }

      setSuccessMessage("Documento procesado. Citas generadas exitosamente. Puedes regresar al Hub Contable y generar la sesión.");
      
      // Navigate back after a bit
      setTimeout(() => {
        router.push("/billing");
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error de red o procesamiento.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Top Bar */}
        <div className="flex items-center gap-4">
          <Link href="/billing">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
              <ArrowLeft className="w-4 h-4" />
              Volver al Hub Contable
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Portal Limpiador de Documentos
            </h1>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2 font-medium">
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Clínica de Destino
              </label>
              <select
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Seleccionar Clínica --</option>
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                Mes Contable
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                Año
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Source Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Origen de los datos</h3>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant={sourceType === "excel" ? "default" : "outline"} onClick={() => setSourceType("excel")} className={sourceType === "excel" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                Excel
              </Button>
              <Button type="button" variant={sourceType === "image" ? "default" : "outline"} onClick={() => setSourceType("image")} className={sourceType === "image" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                Imagen (Foto de notas)
              </Button>
              <Button type="button" variant={sourceType === "text" ? "default" : "outline"} onClick={() => setSourceType("text")} className={sourceType === "text" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                Texto Libre (WhatsApp / Email)
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            {sourceType === "text" ? (
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Pega aquí los mensajes de WhatsApp, el email con el resumen, o las notas transcritas..."
                className="w-full min-h-[250px] bg-slate-50 border border-slate-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-slate-50 hover:bg-emerald-50/30 transition-colors">
                <UploadCloud className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-slate-700 mb-2">Sube el documento</h4>
                <p className="text-sm text-slate-500 mb-6">Formatos soportados: .xlsx, .pdf, .jpg, .png</p>
                <input
                  type="file"
                  accept={sourceType === "excel" ? ".xlsx,.xls,.csv" : ".jpg,.jpeg,.png,.pdf"}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mx-auto block text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Procesando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Procesar y Generar Citas
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
    <Suspense fallback={<div className="p-12 text-center">Cargando...</div>}>
      <DocumentCleanerPortal />
    </Suspense>
  );
}
