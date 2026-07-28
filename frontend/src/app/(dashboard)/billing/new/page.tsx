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
import { addSystemNotification } from "@/components/layout/notification-center";

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
  const [day, setDay] = useState<number | "">("");

  const [sourceType, setSourceType] = useState<"text" | "excel" | "image" | "audio">("excel");
  const [rawText, setRawText] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [clearExisting, setClearExisting] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("Iniciando agente de Inteligencia Artificial...");
  const [currentFileName, setCurrentFileName] = useState<string>("");
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

    if (sourceType !== "text" && selectedFiles.length === 0) {
      setErrorMessage("Por favor, sube uno o varios documentos/imágenes para procesar.");
      return;
    }

    if (sourceType === "text" && !rawText.trim()) {
      setErrorMessage("Por favor, introduce el texto a procesar.");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("1/3 Enviando documento(s) al Agente de IA en n8n...");

    try {
      let totalCreatedCount = 0;

      if (sourceType === "text") {
        setProcessingStep("2/3 Procesando texto con modelo LLM...");
        const res = await fetch("/api/billing/document-cleaner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinic_id: selectedClinicId,
            month,
            year,
            day: day !== "" ? day : undefined,
            source_type: "text",
            content: rawText,
            clear_existing: clearExisting
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Error al procesar el texto.");
        totalCreatedCount = data.count || 0;
      } else {
        // Process each file in selectedFiles sequentially
        for (let idx = 0; idx < selectedFiles.length; idx++) {
          const file = selectedFiles[idx];
          setCurrentFileName(file.name);
          setProcessingStep(`2/3 Ejecutando Visión OCR y extracción de tratamientos en ${file.name} (${idx + 1}/${selectedFiles.length})...`);
          
          const buffer = await file.arrayBuffer();
          const fileBase64 = Buffer.from(buffer).toString("base64");
          const isFileImg = file.name.match(/\.(jpg|jpeg|png|webp)$/i);

          const res = await fetch("/api/billing/document-cleaner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clinic_id: selectedClinicId,
              month,
              year,
              day: day !== "" ? day : undefined,
              source_type: isFileImg ? "image" : sourceType,
              content: fileBase64,
              filename: file.name,
              clear_existing: idx === 0 ? clearExisting : false
            })
          });

          const data = await res.json();
          if (!res.ok || data.error) {
            console.warn(`Error procesando archivo ${file.name}:`, data.error);
          } else {
            totalCreatedCount += (data.count || 0);
          }
        }
      }

      setProcessingStep("3/3 Guardando citas y expidiendo notificación...");

      if (totalCreatedCount > 0) {
        const msg = `¡Procesamiento exitoso! Se han generado ${totalCreatedCount} citas contables para ${selectedClinic?.name || "la clínica"} en la agenda.`;
        setSuccessMessage(msg);

        // Disparar Notificación a la campana
        addSystemNotification({
          title: "¡Ingesta de Documento Completada!",
          message: `Se han extraído e ingresado ${totalCreatedCount} citas contables para ${selectedClinic?.name || "la sede"} en ${MONTH_NAMES[month - 1]} ${year}.`,
          type: "success",
        });

        setTimeout(() => {
          router.push("/billing");
        }, 3000);
      } else {
        setErrorMessage("El agente no pudo extraer citas legibles del archivo o imagen. Por favor, comprueba que las imágenes contengan texto claro de las notas de tratamientos.");
      }

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
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                Día del Mes <span className="text-xs font-normal text-slate-400">(Opcional)</span>
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value ? parseInt(e.target.value) : "")}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Auto (o día 15)</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>Día {d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Modo de Ingesta (Acumular o Limpiar) */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-amber-900">
                  🧹 Limpiar / Borrar citas anteriores de esta sede y mes antes de cargar
                </span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Si dejas esta casilla desmarcada (por defecto), el sistema <b>sumará y complementará</b> las nuevas imágenes a lo que ya tenías guardado sin borrar tus datos anteriores.
                </p>
              </div>
            </label>
          </div>

          {/* Source Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Origen de los datos</h3>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant={sourceType === "excel" ? "default" : "outline"} onClick={() => setSourceType("excel")} className={sourceType === "excel" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                Excel
              </Button>
              <Button type="button" variant={sourceType === "image" ? "default" : "outline"} onClick={() => setSourceType("image")} className={sourceType === "image" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                Imágenes (Fotos de notas / Varias a la vez)
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
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-emerald-50/30 transition-colors">
                <UploadCloud className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700 mb-1">
                  Sube uno o varios documentos / imágenes
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Puedes seleccionar múltiples archivos a la vez (ej: foto 1, foto 2, excel de notas)
                </p>

                {selectedFiles.length > 0 && (
                  <div className="mb-4 flex flex-wrap justify-center gap-2">
                    {selectedFiles.map((file, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold">
                        📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  multiple
                  accept={sourceType === "excel" ? ".xlsx,.xls,.csv" : ".jpg,.jpeg,.png,.pdf,.webp"}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setSelectedFiles(files);
                    if (files.some(f => f.name.match(/\.(jpg|jpeg|png|webp)$/i)) && sourceType === "excel") {
                      setSourceType("image");
                    }
                  }}
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

      {/* Modal de Carga Interactiva con Progreso */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6 text-center">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
              <Sparkles className="w-8 h-8 text-emerald-600 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">
                Procesando Documento con IA
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                El Agente de IA está analizando los tratamientos, pacientes y horas de tus notas.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-slate-700">Estado del Proceso:</span>
              </div>
              <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                {processingStep}
              </p>
              {currentFileName && (
                <p className="text-[11px] text-slate-500 font-mono">
                  📄 Archivo activo: {currentFileName}
                </p>
              )}
            </div>

            <div className="text-[11px] text-slate-400">
              Al finalizar, se emitirá una notificación en la campana y serás redirigido automáticamente al Hub Contable.
            </div>
          </div>
        </div>
      )}
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
