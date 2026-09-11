"use client";

import React, { useEffect, useState, useRef } from "react";
import { CheckCircle2, RefreshCw, X, AlertCircle, Smartphone, ShieldCheck, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TelegramQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: { id: string; name: string; phone?: string; username?: string }) => void;
}

export function TelegramQrModal({ isOpen, onClose, onSuccess }: TelegramQrModalProps) {
  const [status, setStatus] = useState<"loading" | "qr" | "success" | "error">("loading");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Iniciando conexión segura...");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState<number>(30);
  const [authenticatedUser, setAuthenticatedUser] = useState<{ name: string; phone?: string } | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startConnection = () => {
    setStatus("loading");
    setStatusMessage("Conectando con servidores de Telegram...");
    setQrDataUrl(null);
    setErrorMessage("");

    // Limpiar temporizador previo
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Cerrar EventSource previo si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource("/api/telegram/qr");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "status") {
          setStatusMessage(data.message);
        } else if (data.type === "qr") {
          setQrDataUrl(data.qrDataUrl);
          setStatus("qr");
          const expiresSeconds = Number(data.expires) || 30;
          setCountdown(expiresSeconds);

          // Reiniciar cuenta regresiva en segundos para el temporizador discreto
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                return 30; // Esperando nuevo QR del servidor
              }
              return prev - 1;
            });
          }, 1000);
        } else if (data.type === "success") {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          es.close();
          setStatus("success");
          setAuthenticatedUser({
            name: data.user.name,
            phone: data.user.phone,
          });

          onSuccess(data.user);

          // Cerrar modal automáticamente tras 2.5 segundos de confirmación
          setTimeout(() => {
            onClose();
          }, 2500);
        } else if (data.type === "error") {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          es.close();
          setStatus("error");
          setErrorMessage(data.message || "No se pudo conectar con Telegram");
        }
      } catch (err) {
        console.error("Error parseando evento SSE:", err);
      }
    };

    es.onerror = () => {
      // Si ya está en éxito, ignorar desconexión natural
      if (status === "success") return;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      es.close();
      setStatus("error");
      setErrorMessage("La conexión en tiempo real con Telegram se ha interrumpido.");
    };
  };

  useEffect(() => {
    if (isOpen) {
      startConnection();
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden p-6 text-card-foreground">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Vincular Telegram</h3>
              <p className="text-xs text-muted-foreground">Acceso seguro MTProto para la clínica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido según estado */}
        <div className="py-6 flex flex-col items-center text-center">
          {status === "loading" && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-3 border-sky-500/30 border-t-sky-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{statusMessage}</p>
                <p className="text-xs text-muted-foreground">Generando sesión cifrada...</p>
              </div>
            </div>
          )}

          {status === "qr" && qrDataUrl && (
            <div className="w-full flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
              {/* Contenedor del QR */}
              <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                <img
                  src={qrDataUrl}
                  alt="Código QR de Telegram"
                  className="w-64 h-64 object-contain rounded-xl"
                />
              </div>

              {/* Temporizador discreto solicitado por el usuario */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 border border-border/50 text-[11px] text-muted-foreground font-mono transition-all">
                <RefreshCw className="w-3 h-3 text-sky-500 animate-[spin_4s_linear_infinite]" />
                <span>Se actualiza en <strong className="text-foreground">{countdown}s</strong> si no se escanea</span>
              </div>

              {/* Instrucciones paso a paso */}
              <div className="w-full mt-2 bg-muted/40 rounded-xl p-3.5 text-left border border-border/40 text-xs space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-500" />
                  <span>Pasos para vincular desde tu móvil:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-0.5">
                  <li>Abre <strong className="text-foreground">Telegram</strong> en el teléfono de la clínica o doctor.</li>
                  <li>Ve a <strong className="text-foreground">Ajustes</strong> ➔ <strong className="text-foreground">Dispositivos</strong>.</li>
                  <li>Toca en <strong className="text-foreground">Vincular dispositivo</strong> y apunta al código.</li>
                </ol>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="py-8 flex flex-col items-center gap-4 animate-in zoom-in-90 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-foreground">¡Cuenta vinculada con éxito!</h4>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  {authenticatedUser?.name || "Sesión activa"}
                </p>
                {authenticatedUser?.phone && (
                  <p className="text-xs text-muted-foreground font-mono">{authenticatedUser.phone}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Guardando cambios y cerrando ventana...</p>
            </div>
          )}

          {status === "error" && (
            <div className="py-8 flex flex-col items-center gap-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">No se pudo generar el código QR</h4>
                <p className="text-xs text-muted-foreground max-w-xs">{errorMessage}</p>
              </div>
              <Button onClick={startConnection} variant="outline" size="sm" className="gap-2 mt-2 rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </Button>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cifrado de extremo a extremo</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs rounded-lg">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
