"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, Loader2, QrCode, Unlink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TelegramQrModal } from "@/components/settings/TelegramQrModal";

type Settings = {
  loading: boolean;
  saving: boolean;
  whatsapp_enabled: boolean;
  whatsapp_phone: string;
  whatsapp_api_token: string;
  whatsapp_template_name: string;
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_phone: string;
  telegram_api_id: string;
  telegram_api_hash: string;
  telegram_session_string: string;
  email_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  email_from: string;
  email_from_name: string;
};

function sanitizeSettings(data: any): Partial<Settings> {
  if (!data) return {};
  return {
    whatsapp_enabled: Boolean(data.whatsapp_enabled),
    whatsapp_phone: data.whatsapp_phone ?? "",
    whatsapp_api_token: data.whatsapp_api_token ?? "",
    whatsapp_template_name: data.whatsapp_template_name ?? "",
    telegram_enabled: Boolean(data.telegram_enabled),
    telegram_bot_token: data.telegram_bot_token ?? "",
    telegram_phone: data.telegram_phone ?? "",
    telegram_api_id: data.telegram_api_id ?? "",
    telegram_api_hash: data.telegram_api_hash ?? "",
    telegram_session_string: data.telegram_session_string ?? "",
    email_enabled: Boolean(data.email_enabled),
    smtp_host: data.smtp_host ?? "",
    smtp_port: data.smtp_port ? Number(data.smtp_port) : 587,
    smtp_user: data.smtp_user ?? "",
    smtp_password: data.smtp_password ?? "",
    smtp_secure: data.smtp_secure !== undefined ? Boolean(data.smtp_secure) : true,
    email_from: data.email_from ?? "",
    email_from_name: data.email_from_name ?? "",
  };
}

export default function MessagingSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    loading: true,
    saving: false,
    whatsapp_enabled: false,
    whatsapp_phone: "",
    whatsapp_api_token: "",
    whatsapp_template_name: "",
    telegram_enabled: false,
    telegram_bot_token: "",
    telegram_phone: "",
    telegram_api_id: "",
    telegram_api_hash: "",
    telegram_session_string: "",
    email_enabled: false,
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_secure: true,
    email_from: "",
    email_from_name: "",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings/messaging");
        const data = await res.json();
        if (data?.data) {
          setSettings((prev) => ({ ...prev, ...sanitizeSettings(data.data), loading: false }));
        } else {
          setSettings((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Failed to fetch messaging settings:", error);
        alert("Error al cargar la configuración de mensajería.");
        setSettings((prev) => ({ ...prev, loading: false }));
      }
    }
    fetchSettings();
  }, []);

  const [isTelegramQrModalOpen, setIsTelegramQrModalOpen] = useState(false);
  const [isUnlinkingTelegram, setIsUnlinkingTelegram] = useState(false);

  const updateSetting = (field: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm("¿Seguro que deseas desvincular la cuenta de Telegram actual? Los recordatorios directos por Telegram se pausarán hasta que vincules una nueva cuenta.")) return;
    setIsUnlinkingTelegram(true);
    try {
      const res = await fetch("/api/telegram/unlink", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setSettings((prev) => ({ ...prev, telegram_session_string: "" }));
      } else {
        alert("Error al desvincular: " + (json.error || "Error desconocido"));
      }
    } catch (err: any) {
      alert("Error de red al desvincular: " + err.message);
    } finally {
      setIsUnlinkingTelegram(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettings((prev) => ({ ...prev, saving: true }));

    try {
      const payload = {
        whatsapp_enabled: settings.whatsapp_enabled,
        whatsapp_phone: settings.whatsapp_phone,
        whatsapp_api_token: settings.whatsapp_api_token,
        whatsapp_template_name: settings.whatsapp_template_name,
        telegram_enabled: settings.telegram_enabled,
        telegram_bot_token: settings.telegram_bot_token,
        telegram_phone: settings.telegram_phone,
        telegram_api_id: settings.telegram_api_id,
        telegram_api_hash: settings.telegram_api_hash,
        telegram_session_string: settings.telegram_session_string,
        email_enabled: settings.email_enabled,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_password: settings.smtp_password,
        smtp_secure: settings.smtp_secure,
        email_from: settings.email_from,
        email_from_name: settings.email_from_name,
      };

      const res = await fetch("/api/settings/messaging", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error al guardar la configuración.");
      }

      if (data?.data) {
        setSettings((prev) => ({ ...prev, ...sanitizeSettings(data.data), saving: false }));
      } else {
        setSettings((prev) => ({ ...prev, saving: false }));
      }
      alert("Configuración guardada correctamente.");
    } catch (error: any) {
      console.error("Failed to save messaging settings:", error);
      alert(`Error al guardar la configuración: ${error.message}`);
      setSettings((prev) => ({ ...prev, saving: false }));
    }
  };

  if (settings.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <MessageCircle className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Mensajería</h1>
          <p className="text-muted-foreground">
            Configura los canales para enviar recordatorios y confirmaciones a tus pacientes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* WhatsApp Card */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription>
              Envía recordatorios y confirmaciones automáticas vía WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="whatsapp-enabled"
                checked={settings.whatsapp_enabled}
                onChange={(e) => updateSetting("whatsapp_enabled", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <Label htmlFor="whatsapp-enabled">Habilitar WhatsApp</Label>
            </div>

            {settings.whatsapp_enabled && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="whatsapp-phone">Número de Teléfono</Label>
                  <Input
                    id="whatsapp-phone"
                    type="text"
                    placeholder="+34 600 000 000"
                    value={settings.whatsapp_phone ?? ""}
                    onChange={(e) => updateSetting("whatsapp_phone", e.target.value)}
                    className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="whatsapp-api-token">Token de API</Label>
                  <Input
                    id="whatsapp-api-token"
                    type="password"
                    placeholder="Token de Meta Cloud API"
                    value={settings.whatsapp_api_token ?? ""}
                    onChange={(e) => updateSetting("whatsapp_api_token", e.target.value)}
                    className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="whatsapp-template-name">Nombre de Plantilla (Opcional)</Label>
                  <Input
                    id="whatsapp-template-name"
                    type="text"
                    placeholder="template_recordatorio_cita"
                    value={settings.whatsapp_template_name ?? ""}
                    onChange={(e) => updateSetting("whatsapp_template_name", e.target.value)}
                    className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telegram Card */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Telegram</CardTitle>
            <CardDescription>
              Envía recordatorios directos al número de teléfono de los pacientes vinculando la línea de la clínica con Código QR.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="telegram-enabled"
                checked={settings.telegram_enabled}
                onChange={(e) => updateSetting("telegram_enabled", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <Label htmlFor="telegram-enabled">Habilitar Telegram</Label>
            </div>

            {settings.telegram_enabled && (
              <div className="space-y-4">
                {settings.telegram_session_string ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-base">
                        <span>✅</span> Conectado a Telegram MTProto
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Línea activa: <strong className="text-foreground font-mono">{settings.telegram_phone || "+34 605 01 19 78"}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Los recordatorios saldrán automáticamente desde este número directo al teléfono del paciente.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTelegramQrModalOpen(true)}
                        className="gap-1.5 h-8 text-xs rounded-xl border-emerald-500/30 hover:bg-emerald-500/15"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Re-vincular QR
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isUnlinkingTelegram}
                        onClick={handleUnlinkTelegram}
                        className="gap-1.5 h-8 text-xs rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {isUnlinkingTelegram ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlink className="w-3.5 h-3.5" />
                        )}
                        Desvincular
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-600 dark:text-amber-400 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-base">
                        <span>⚠️</span> Sin línea vinculada
                      </div>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80 max-w-md">
                        Escanea el código QR desde la app de Telegram de la clínica para activar el envío de recordatorios automáticos.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setIsTelegramQrModalOpen(true)}
                      className="gap-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-sm self-start sm:self-center shrink-0 h-10 px-4 font-medium"
                    >
                      <QrCode className="w-4 h-4" />
                      Vincular con Código QR
                    </Button>
                  </div>
                )}

                {/* Opciones técnicas avanzadas (colapsadas) */}
                <details className="pt-2 text-xs text-muted-foreground group">
                  <summary className="cursor-pointer font-medium hover:text-foreground list-none flex items-center gap-1.5">
                    <span className="text-muted-foreground group-open:rotate-90 transition-transform">▸</span>
                    Configuración técnica avanzada (Opcional / Desarrollador)
                  </summary>
                  <div className="mt-4 p-4 border border-border/40 rounded-xl space-y-4 bg-muted/20">
                    <div className="grid gap-2">
                      <Label htmlFor="telegram-phone">Número de Teléfono (Remitente manual)</Label>
                      <Input
                        id="telegram-phone"
                        type="text"
                        placeholder="+34 600 000 000"
                        value={settings.telegram_phone ?? ""}
                        onChange={(e) => updateSetting("telegram_phone", e.target.value)}
                        className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="telegram-api-id">App api_id (my.telegram.org)</Label>
                        <Input
                          id="telegram-api-id"
                          type="text"
                          placeholder="31158011"
                          value={settings.telegram_api_id ?? ""}
                          onChange={(e) => updateSetting("telegram_api_id", e.target.value)}
                          className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="telegram-api-hash">App api_hash</Label>
                        <Input
                          id="telegram-api-hash"
                          type="password"
                          placeholder="9258407c8ea67b1e5d97bd04214ed6f8"
                          value={settings.telegram_api_hash ?? ""}
                          onChange={(e) => updateSetting("telegram_api_hash", e.target.value)}
                          className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2 pt-2 border-t border-border/40">
                      <Label htmlFor="telegram-bot-token">Token del Bot (Legacy / Alternativo)</Label>
                      <Input
                        id="telegram-bot-token"
                        type="password"
                        placeholder="123456:ABC-DEF1234ghIJKLMnoPQRSTuVwXYZ"
                        value={settings.telegram_bot_token ?? ""}
                        onChange={(e) => updateSetting("telegram_bot_token", e.target.value)}
                        className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                      />
                    </div>
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Card */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>
              Configura el envío de correos electrónicos transaccionales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="email-enabled"
                checked={settings.email_enabled}
                onChange={(e) => updateSetting("email_enabled", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <Label htmlFor="email-enabled">Habilitar Email</Label>
            </div>

            {settings.email_enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="smtp-host">Servidor SMTP</Label>
                    <Input
                      id="smtp-host"
                      type="text"
                      placeholder="smtp.example.com"
                      value={settings.smtp_host ?? ""}
                      onChange={(e) => updateSetting("smtp_host", e.target.value)}
                      className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="smtp-port">Puerto SMTP</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      placeholder="587"
                      value={settings.smtp_port ?? 587}
                      onChange={(e) => updateSetting("smtp_port", e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="smtp-user">Usuario SMTP</Label>
                    <Input
                      id="smtp-user"
                      type="text"
                      placeholder="usuario@example.com"
                      value={settings.smtp_user ?? ""}
                      onChange={(e) => updateSetting("smtp_user", e.target.value)}
                      className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="smtp-password">Contraseña SMTP</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      placeholder="********"
                      value={settings.smtp_password ?? ""}
                      onChange={(e) => updateSetting("smtp_password", e.target.value)}
                      className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                    />
                  </div>
                  <div className="flex items-center space-x-2 md:col-span-2">
                    <input
                      type="checkbox"
                      id="smtp-secure"
                      checked={settings.smtp_secure}
                      onChange={(e) => updateSetting("smtp_secure", e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    <Label htmlFor="smtp-secure">Usar conexión segura (SSL/TLS)</Label>
                  </div>
                  <div className="grid gap-2 md:col-span-1">
                    <Label htmlFor="email-from">Email de Remitente</Label>
                    <Input
                      id="email-from"
                      type="email"
                      placeholder="info@example.com"
                      value={settings.email_from ?? ""}
                      onChange={(e) => updateSetting("email_from", e.target.value)}
                      className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-1">
                    <Label htmlFor="email-from-name">Nombre del Remitente</Label>
                    <Input
                      id="email-from-name"
                      type="text"
                      placeholder="Clínica Dental Ejemplo"
                      value={settings.email_from_name ?? ""}
                      onChange={(e) => updateSetting("email_from_name", e.target.value)}
                      className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="border-success/30 text-success hover:bg-success/10 rounded-xl"
          disabled={settings.saving}
        >
          {settings.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar configuración
        </Button>

        <TelegramQrModal
          isOpen={isTelegramQrModalOpen}
          onClose={() => setIsTelegramQrModalOpen(false)}
          onSuccess={(userData) => {
            setSettings((prev) => ({
              ...prev,
              telegram_enabled: true,
              telegram_phone: userData.phone || prev.telegram_phone,
              telegram_session_string: "session_active",
            }));
          }}
        />
      </form>
    </div>
  );
}