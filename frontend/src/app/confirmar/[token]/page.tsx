"use client";

import React, { useEffect, useState, use } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Loader2,
  Phone,
  MessageCircle,
  HelpCircle,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppointmentInfo {
  id: string;
  appointment_date: string;
  reason: string;
  status: string;
  patientName: string;
  clinicName: string;
  clinicAddress?: string | null;
  mapsUrl?: string | null;
  isExpired: boolean;
}

export default function AppointmentConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const resolvedParams = use(params as any) as { token: string };
  const appointmentId = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [cancelledSuccess, setCancelledSuccess] = useState(false);
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!appointmentId || appointmentId === "confirmar") {
        setErrorMsg("Identificador de cita no especificado o inválido.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/confirm`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success && data.appointment) {
          setAppointment(data.appointment);
          if (data.appointment.status === "Confirmada") {
            setConfirmedSuccess(true);
          } else if (data.appointment.status === "Cancelada") {
            setCancelledSuccess(true);
          }
        } else {
          setErrorMsg(data.error || "No pudimos encontrar la información de esta cita.");
        }
      } catch (err: any) {
        setErrorMsg("Error al conectar con el servidor. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [appointmentId]);

  const handleAction = async (action: "confirm" | "cancel") => {
    if (!appointment) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: cancelNotes }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success || res.ok) {
        if (action === "confirm") {
          setConfirmedSuccess(true);
          setCancelledSuccess(false);
        } else {
          setCancelledSuccess(true);
          setConfirmedSuccess(false);
        }
      }
      // Recarga automática de la página para refrescar el estado oficial en WhatsApp / móvil
      window.location.reload();
    } catch (err: any) {
      console.error("Error procesando acción de cita:", err);
      // Forzar recarga automática incluso ante problemas de conexión en el webview
      window.location.reload();
    } finally {
      // Si el reload tarda unos ms, asegurarse de mantener submitting
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Cargando detalles de tu cita...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !appointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Cita no disponible</h2>
          <p className="text-sm text-slate-600">{errorMsg || "No fue posible acceder a los datos de la cita."}</p>
          <div className="pt-2">
            <p className="text-xs text-slate-400">
              Si crees que esto es un error, por favor comunícate directamente con la clínica Melosmile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Comprobar si la cita ya expiró (pasó la hora de la cita)
  if (appointment.isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="h-16 w-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Enlace Expirado</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            La fecha y hora de esta cita ya han transcurrido, por lo que este enlace ya no se encuentra operativo.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 text-left space-y-1">
            <p className="font-semibold text-slate-700">¿Deseas agendar una nueva cita?</p>
            <p>Contáctanos directamente en la clínica para coordinar tu próxima visita.</p>
          </div>
        </div>
      </div>
    );
  }

  const apptDateObj = new Date(appointment.appointment_date);
  const dateFormatted = apptDateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFormatted = apptDateObj.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 flex flex-col justify-center items-center p-4 py-10">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header con marca MeloSmile oficial */}
        <div className="bg-gradient-to-r from-[#85348c] to-[#a044a8] p-6 text-white text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md mb-3 shadow-inner p-2">
            <Image
              src="/brand/logo-color.svg"
              alt="MeloSmile"
              width={48}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight">MeloSmile</h1>
          <p className="text-purple-200 text-xs font-medium">Clínica Dental &amp; Ortodoncia Avanzada</p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {confirmedSuccess ? (
            <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-800">¡Cita Confirmada!</h2>
                <p className="text-sm text-slate-600">
                  Muchas gracias, <strong className="text-slate-800">{appointment.patientName}</strong>. Hemos registrado tu confirmación en nuestro sistema.
                </p>
              </div>

              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                  <Calendar className="h-4 w-4 text-[#85348c]" />
                  <span className="capitalize">{dateFormatted}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                  <Clock className="h-4 w-4 text-[#85348c]" />
                  <span>{timeFormatted}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-purple-900 pt-1 border-t border-purple-200/60">
                  <MapPin className="h-4 w-4 text-[#85348c] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{appointment.clinicName}</span>
                    {appointment.clinicAddress && (
                      <p className="text-[11px] text-purple-700/90 font-normal">{appointment.clinicAddress}</p>
                    )}
                  </div>
                </div>
              </div>

              {appointment.mapsUrl && (
                <a
                  href={appointment.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-[#85348c] hover:bg-[#6d2974] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
                >
                  <Navigation className="h-4 w-4" />
                  Cómo llegar en Google Maps
                </a>
              )}

              <p className="text-xs text-slate-400">
                ¡Te esperamos con entusiasmo en la clínica! Si surge cualquier imprevisto, no dudes en escribirnos.
              </p>
            </div>
          ) : cancelledSuccess ? (
            <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="h-9 w-9" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-800">Cita Cancelada</h2>
                <p className="text-sm text-slate-600">
                  Hemos registrado la cancelación de tu cita para el <strong className="capitalize">{dateFormatted}</strong>.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 text-left">
                Nos pondremos en contacto contigo para ayudarte a encontrar una nueva fecha que te resulte más conveniente.
              </div>
            </div>
          ) : (
            <>
              {/* Resumen de la cita */}
              <div className="space-y-1 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-[#85348c]">Confirmación de Asistencia</p>
                <h2 className="text-xl font-black text-slate-900">Hola, {appointment.patientName}</h2>
                <p className="text-xs text-slate-500">Por favor indícanos si podrás asistir a tu cita programada:</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 text-[#85348c] flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fecha</p>
                    <p className="text-sm font-bold text-slate-800 capitalize">{dateFormatted}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 text-[#85348c] flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Hora</p>
                    <p className="text-sm font-bold text-slate-800">{timeFormatted}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 text-[#85348c] flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tratamiento / Motivo</p>
                    <p className="text-sm font-semibold text-slate-800">{appointment.reason}</p>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 text-[#85348c] flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Lugar</p>
                      <p className="text-xs font-bold text-slate-800">{appointment.clinicName}</p>
                      {appointment.clinicAddress && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{appointment.clinicAddress}</p>
                      )}
                    </div>
                  </div>
                  {appointment.mapsUrl && (
                    <a
                      href={appointment.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-200 shadow-xs transition-colors shrink-0 self-center no-underline cursor-pointer"
                    >
                      <Navigation className="h-3 w-3 text-teal-600" />
                      <span>Ver en Maps</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => handleAction("confirm")}
                  disabled={submitting}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Confirmar Asistencia
                    </>
                  )}
                </Button>

                {!showCancelReason ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => setShowCancelReason(true)}
                    className="w-full h-10 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  >
                    No podré asistir a esta cita
                  </Button>
                ) : (
                  <div className="space-y-2 p-3 bg-rose-50/60 rounded-xl border border-rose-100 animate-in fade-in">
                    <p className="text-xs font-semibold text-rose-800">
                      ¿Deseas indicarnos el motivo o preferencia de horario para reagendar?
                    </p>
                    <textarea
                      value={cancelNotes}
                      onChange={(e) => setCancelNotes(e.target.value)}
                      placeholder="Opcional: Motivo o disponibilidad para reagendar..."
                      rows={2}
                      className="w-full text-xs p-2 rounded-lg border border-rose-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCancelReason(false)}
                        className="text-xs text-slate-500 h-8 flex-1"
                      >
                        Atrás
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={submitting}
                        onClick={() => handleAction("cancel")}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-8 flex-1 rounded-lg"
                      >
                        Confirmar Cancelación
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <span>Melosmile Dental Care · Innovación Odontológica</span>
        </div>
      </div>
    </div>
  );
}
