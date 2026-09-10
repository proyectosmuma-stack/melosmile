"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = {
  loading: boolean;
  saving: boolean;
  whatsapp_enabled: boolean;
  whatsapp_phone: string;
  whatsapp_api_token: string;
  whatsapp_template_name: string;
  telegram_enabled: boolean;
  telegram_bot_token: string;
  email_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  email_from: string;
  email_from_name: string;
};

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
        setSettings((prev) => ({ ...prev, ...data, loading: false }));
      } catch (error) {
        console.error("Failed to fetch messaging settings:", error);
        alert("Error al cargar la configuración de mensajería.");
        setSettings((prev) => ({ ...prev, loading: false }));
      }
    }
    fetchSettings();
  }, []);

  const updateSetting = (field: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettings((prev) => ({ ...prev, saving: true }));

    try {
      const res = await fetch("/api/settings/messaging", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error("Error al guardar la configuración.");
      }

      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...data, saving: false }));
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
                    value={settings.whatsapp_phone}
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
                    value={settings.whatsapp_api_token}
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
                    value={settings.whatsapp_template_name}
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
              Envía notificaciones a los pacientes a través de tu bot de Telegram.
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
                <div className="grid gap-2">
                  <Label htmlFor="telegram-bot-token">Token del Bot</Label>
                  <Input
                    id="telegram-bot-token"
                    type="password"
                    placeholder="123456:ABC-DEF1234ghIJKLMnoPQRSTuVwXYZ"
                    value={settings.telegram_bot_token}
                    onChange={(e) => updateSetting("telegram_bot_token", e.target.value)}
                    className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Los mensajes se envían al chat del paciente (contacto individual), no a grupos. El paciente vinculará su Telegram con el bot al iniciar conversación.
                </p>
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
                      value={settings.smtp_host}
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
                      value={settings.smtp_port}
                      onChange={(e) => updateSetting("smtp_port", parseInt(e.target.value))}
                      className="bg-muted rounded-xl focus-visible:ring-offset-0 focus-visible:ring-primary/60"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="smtp-user">Usuario SMTP</Label>
                    <Input
                      id="smtp-user"
                      type="text"
                      placeholder="usuario@example.com"
                      value={settings.smtp_user}
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
                      value={settings.smtp_password}
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
                      value={settings.email_from}
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
                      value={settings.email_from_name}
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
      </form>
    </div>
  );
}