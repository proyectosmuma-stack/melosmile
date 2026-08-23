"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Building2,
  Stethoscope,
  Bell,
  Calendar as CalendarIcon,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  Mail,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AppointmentEvent, Clinic, DEFAULT_CLINICS } from "@/components/calendar/calendar-view";
import { format, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import {
  isImageDocument,
  resolveDocumentUrl,
  formatBytes,
  DOC_TYPE_LABELS,
} from "@/lib/utils/document-utils";
import { PhotoLightbox } from "@/components/patients/photo-lightbox";

type AppointmentDetailDrawerProps = {
  event: AppointmentEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEvent: (updated: AppointmentEvent) => void;
  clinics?: Clinic[];
};

type DrawerDoc = {
  id: string;
  file_name: string;
  document_type: string | null;
  file_url: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string | null;
  description?: string | null;
  url: string | null;
  is_image: boolean;
};

function getStatusMeta(raw?: string) {
  const s = (raw ?? "Confirmada").trim();
  const lower = s.toLowerCase();
  if (lower === "confirmada" || lower === "confirmed") {
    return { label: "Confirmada", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  }
  if (lower === "pendiente" || lower === "pending") {
    return { label: "Pendiente", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  }
  if (lower === "realizada" || lower === "completada" || lower === "completed" || lower === "done") {
    return { label: "Realizada", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
  }
  if (lower === "cancelada" || lower === "cancelled" || lower === "canceled") {
    return { label: "Cancelada", cls: "bg-red-500/10 text-red-600 border-red-500/20" };
  }
  return { label: s.charAt(0).toUpperCase() + s.slice(1), cls: "bg-muted text-muted-foreground border-border" };
}

export function AppointmentDetailDrawer({
  event,
  isOpen,
  onClose,
  onUpdateEvent,
  clinics,
}: AppointmentDetailDrawerProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [docs, setDocs] = useState<DrawerDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Fetch adjuntos al abrir
  useEffect(() => {
    if (!isOpen || !event?.id) {
      if (!isOpen) {
        setDocs([]);
        setLightboxIndex(null);
      }
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingDocs(true);
      try {
        const { data, error } = await (supabase as any)
          .from("documents")
          .select("id, file_name, document_type, file_url, file_path, mime_type, file_size_bytes, created_at, description")
          .eq("appointment_id", event!.id)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) {
          console.warn("No se pudieron cargar adjuntos de la cita:", error.message);
          setDocs([]);
        } else if (Array.isArray(data)) {
          const resolved: DrawerDoc[] = (data as any[]).map((d: any) => {
            const url = resolveDocumentUrl({ file_url: d.file_url ?? null, file_path: d.file_path ?? null });
            const isImg = isImageDocument({
              file_name: d.file_name ?? null,
              document_type: d.document_type ?? null,
              mime_type: d.mime_type ?? null,
            });
            return {
              id: d.id,
              file_name: d.file_name ?? "Documento",
              document_type: d.document_type ?? null,
              file_url: d.file_url ?? null,
              file_path: d.file_path ?? null,
              mime_type: d.mime_type ?? null,
              file_size_bytes: d.file_size_bytes ?? null,
              created_at: d.created_at ?? null,
              description: d.description ?? null,
              url,
              is_image: isImg,
            };
          });
          setDocs(resolved);
        }
      } catch (e: any) {
        if (!cancelled) console.warn("Error silencioso al cargar adjuntos drawer:", e?.message ?? e);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, event?.id]);

  if (!event) return null;

  const resolvedClinics = clinics && clinics.length > 0 ? clinics : DEFAULT_CLINICS;
  const clinic = resolvedClinics.find((c) => c.id === event.clinicId) || resolvedClinics[0] || DEFAULT_CLINICS[0];

  const endDate = addMinutes(event.date, event.durationMinutes || 45);
  const endTimeStr = format(endDate, "HH:mm");
  const formattedDateStr = format(event.date, "EEEE, d 'de' MMMM", { locale: es });
  const statusMeta = getStatusMeta(event.status);

  // Fotos para lightbox: solo imagenes con url
  const imageDocs = docs.filter((d) => d.is_image && !!d.url);
  const photosForLightbox = imageDocs.map((d) => ({
    id: d.id,
    url: d.url,
    file_name: d.file_name,
    document_type: d.document_type,
    file_size_bytes: d.file_size_bytes,
    mime_type: d.mime_type,
    description: d.description ?? null,
    created_at: d.created_at,
  }));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      onClose();
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase.from("appointments").delete().eq("id", event.id);
      if (error) throw error;

      window.dispatchEvent(new CustomEvent("appointment-created"));
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      console.error("Error eliminando cita:", err);
      alert(err.message || "Error al eliminar la cita.");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-background border border-border/90 shadow-2xl text-foreground max-h-[92vh] overflow-y-auto">
          {/* Top Header Action Buttons */}
          <div className="flex items-center justify-end gap-1 pr-6 mb-2">
            <button
              onClick={() => {
                onClose();
                router.push(`/appointments/${event.id}`);
              }}
              className="p-2 text-muted-foreground hover:text-info hover:bg-info/10 rounded-full transition-colors cursor-pointer"
              title="Modificar Cita"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer"
              title="Eliminar cita"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              onClick={() => alert(`Enviando recordatorio por correo para ${event.patient}`)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
              title="Enviar correo"
            >
              <Mail className="h-4 w-4" />
            </button>
          </div>

          {/* Delete Confirmation Alert Banner */}
          {showDeleteConfirm && (
            <div className="mb-4 p-3.5 bg-destructive/10 border border-destructive/30 rounded-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-destructive text-xs font-bold">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span>¿Eliminar la cita de {event.patient}?</span>
              </div>
              <p className="text-[11px] text-destructive/80">Esta acción es permanente y eliminará la cita de la agenda.</p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1 text-xs font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirmar y Eliminar
                </button>
              </div>
            </div>
          )}

          {/* Event Title & Subtitle */}
          <div className="flex items-start gap-3 mt-1">
            <span className={cn("w-3.5 h-3.5 mt-1.5 rounded-sm shrink-0 shadow-xs", clinic.color)} />
            <div>
              <h3 className="text-xl font-medium text-foreground leading-snug">{event.patient}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-0.5 capitalize">
                {formattedDateStr} · {event.startTime} – {endTimeStr}
              </p>
            </div>
          </div>

          {/* Google Calendar Details List */}
          <div className="space-y-3.5 pt-4 mt-4 border-t border-border/60 text-xs text-muted-foreground">
            {/* Notification Row */}
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-foreground">10 minutos antes, en un correo</p>
                <p className="text-muted-foreground text-[11px]">Paciente avisado por WhatsApp</p>
              </div>
            </div>

            {/* Organizer / Patient Row */}
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{event.patient}</span>
                {(event.patientHistoriaId || event.patientId) && (
                  <button
                    onClick={() => {
                      onClose();
                      const ref = event.patientHistoriaId || event.patientId;
                      router.push(`/patients/${ref}`);
                    }}
                    className="text-[11px] font-bold text-info hover:underline cursor-pointer"
                  >
                    (Ver Expediente)
                  </button>
                )}
              </div>
            </div>

            {/* Clinic & Doctor Row */}
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-foreground">{clinic.name}</p>
                <p className="text-muted-foreground text-[11px]">Doctora: {event.doctor}</p>
              </div>
            </div>

            {/* Treatment / Reason Row */}
            <div className="flex items-center gap-3">
              <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-foreground">{event.title}</p>
                <span
                  className={cn(
                    "inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                    statusMeta.cls
                  )}
                >
                  Estado: {statusMeta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Sección Adjuntos */}
          {loadingDocs ? (
            <div className="mt-5 pt-4 border-t border-border/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                Adjuntos
              </div>
              <div className="space-y-2">
                <div className="h-14 rounded-xl bg-muted animate-pulse border border-border/40" />
                <div className="h-14 rounded-xl bg-muted animate-pulse border border-border/40" />
              </div>
            </div>
          ) : docs.length > 0 ? (
            <div className="mt-5 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  Adjuntos ({docs.length})
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {imageDocs.length > 0 ? `${imageDocs.length} fotos` : ""}{" "}
                  {imageDocs.length > 0 && docs.length - imageDocs.length > 0 ? "·" : ""}{" "}
                  {docs.length - imageDocs.length > 0 ? `${docs.length - imageDocs.length} docs` : ""}
                </span>
              </div>

              <div className="space-y-2">
                {docs.map((doc) => {
                  const label = doc.document_type ? (DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type) : "Documento";
                  const sizeLabel = formatBytes(doc.file_size_bytes);
                  const isImg = doc.is_image;
                  const thumbIdx = isImg && doc.url ? imageDocs.findIndex((x) => x.id === doc.id) : -1;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors group"
                    >
                      {/* Thumb / Icon */}
                      {isImg && doc.url ? (
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(thumbIdx >= 0 ? thumbIdx : 0)}
                          className="h-10 w-10 rounded-lg overflow-hidden bg-muted border border-border/40 shrink-0 relative cursor-pointer hover:opacity-90 transition-opacity"
                          title="Ver imagen ampliada"
                        >
                          <img
                            src={doc.url}
                            alt={doc.file_name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted border border-border/40 flex items-center justify-center shrink-0">
                          {isImg ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {label} · {sizeLabel}
                          {doc.created_at ? ` · ${format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}` : ""}
                        </p>
                      </div>

                      {doc.url ? (
                        isImg ? (
                          <button
                            type="button"
                            onClick={() => setLightboxIndex(thumbIdx >= 0 ? thumbIdx : 0)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                            title="Ampliar"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-2.5 inline-flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Abrir documento"
                          >
                            Abrir
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60 shrink-0">Sin URL</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <Link
                href={`/appointments/${event.id}`}
                onClick={onClose}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-info hover:underline"
              >
                Ver ficha completa de la cita
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : null}

          {/* Footer Actions */}
          <div className="mt-6 pt-3 border-t border-border/60 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                const ref = event.patientHistoriaId || event.patientId;
                if (ref) {
                  router.push(`/patients/${ref}`);
                } else {
                  alert("No se encontró la ficha del paciente para esta cita.");
                }
              }}
              className="text-xs rounded-xl border-border bg-card cursor-pointer"
            >
              <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Ver Paciente
            </Button>

            <Button
              onClick={() => {
                onClose();
                router.push(`/appointments/${event.id}`);
              }}
              className="bg-info hover:bg-info/90 text-info-foreground text-xs font-semibold rounded-xl px-4 shadow-sm cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Modificar Cita
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox reutilizado */}
      {photosForLightbox.length > 0 && (
        <PhotoLightbox photos={photosForLightbox} index={lightboxIndex} onIndexChange={setLightboxIndex} />
      )}
    </>
  );
}
