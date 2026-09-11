"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { CheckCircle2, RefreshCw, X, AlertCircle, Smartphone, ShieldCheck, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data?: any) => void;
}

export function WhatsAppQrModal({ isOpen, onClose, onSuccess }: WhatsAppQrModalProps) {
  const [status, setStatus] = useState<"loading" | "qr" | "success" | "error">("loading");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Iniciando conexión con WhatsApp...");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState<number>(30);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQr = useCallback(async () => {
    setStatus("loading");
    setStatusMessage("Generando código QR de WhatsApp...");
    setErrorMessage("");

    try {
      const res = await fetch("/api/whatsapp/qr");
      const data = await res.json();

      if (data.success && data.base64) {
        const src = data.base64.startsWith("data:")
          ? data.base64
          : `data:image/png;base64,${data.base64}`;
        setQrDataUrl(src);
        setPairingCode(data.pairingCode || null);
        setStatus("qr");
        setCountdown(30);

        // Iniciar temporizador de refresco discreto
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              fetchQr(); // Auto-refrescar QR tras 30s
              return 30;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "No se pudo obtener el código QR de WhatsApp");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Error de conexión con el servidor");
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();

      if (data.success && (data.isConnected || data.state === "open")) {
        // Detener polling y timer
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        setStatus("success");
        onSuccess(data);

        // Cerrar modal automáticamente tras 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch {
      // Polling silencioso
    }
  }, [onSuccess, onClose]);

  useEffect(() => {
    if (isOpen) {
      fetchQr();

      // Poll de estado cada 2.5 segundos
      pollIntervalRef.current = setInterval(checkStatus, 2500);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, fetchQr, checkStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden p-6 text-card-foreground">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Vincular WhatsApp</h3>
              <p className="text-xs text-muted-foreground">Evolution API v2 &middot; Instancia MeloSmile</p>
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
              <div className="w-12 h-12 rounded-full border-3 border-emerald-500/30 border-t-emerald-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{statusMessage}</p>
                <p className="text-xs text-muted-foreground">Generando sesión de WhatsApp...</p>
              </div>
            </div>
          )}

          {status === "qr" && qrDataUrl && (
            <div className="w-full flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
              {/* Contenedor del QR */}
              <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                <img
                  src={qrDataUrl}
                  alt="Código QR de WhatsApp"
                  className="w-64 h-64 object-contain rounded-xl"
                />
              </div>

              {/* Temporizador discreto */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 border border-border/50 text-[11px] text-muted-foreground font-mono transition-all">
                <RefreshCw className="w-3 h-3 text-emerald-500 animate-[spin_4s_linear_infinite]" />
                <span>Se actualiza en <strong className="text-foreground">{countdown}s</strong> si no se escanea</span>
              </div>

              {pairingCode && (
                <div className="px-3 py-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg text-xs font-mono">
                  Código de vinculación: <strong>{pairingCode}</strong>
                </div>
              )}

              {/* Instrucciones paso a paso */}
              <div className="w-full mt-2 bg-muted/40 rounded-xl p-3.5 text-left border border-border/40 text-xs space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pasos para vincular desde tu teléfono:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-0.5">
                  <li>Abre <strong className="text-foreground">WhatsApp</strong> en el teléfono de la clínica.</li>
                  <li>Toca en <strong className="text-foreground">Ajustes</strong> (o tres puntos) ➔ <strong className="text-foreground">Dispositivos vinculados</strong>.</li>
                  <li>Toca en <strong className="text-foreground">Vincular un dispositivo</strong> y escanea este código QR.</li>
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
                <h4 className="text-lg font-bold text-foreground">¡WhatsApp conectado con éxito!</h4>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  Sesión activa lista para enviar recordatorios
                </p>
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
              <Button onClick={fetchQr} variant="outline" size="sm" className="gap-2 mt-2 rounded-xl">
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
            <span>Evolution API v2 &middot; Cifrado seguro</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs rounded-lg">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
