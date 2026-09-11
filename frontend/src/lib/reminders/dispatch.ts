import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export interface DispatchReminderResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Despacha un recordatorio de inmediato por su canal configurado (Telegram MTProto, WhatsApp, Email, etc.)
 * y actualiza el estado en Supabase ('enviado' o 'error') junto con su evento en reminder_events.
 */
export async function dispatchReminder(reminderId: string): Promise<DispatchReminderResult> {
  try {
    if (!reminderId) {
      return { success: false, error: "reminderId es requerido." };
    }

    // 1. Obtener recordatorio con datos de paciente y cita
    const { data: reminder, error: fetchErr } = await (supabase as any)
      .from("reminders")
      .select(`
        *,
        patients ( first_name, last_name, phone, email, historia_id, telegram_chat_id ),
        appointments ( appointment_date, reason, status, clinics(name) )
      `)
      .eq("id", reminderId)
      .single();

    if (fetchErr || !reminder) {
      return { success: false, error: "Recordatorio no encontrado en la base de datos." };
    }

    if (reminder.status === "cancelado") {
      return { success: false, error: "El recordatorio ya está cancelado." };
    }

    const patient = reminder.patients;
    const appointment = reminder.appointments;

    if (appointment?.status === "Cancelada") {
      await (supabase as any)
        .from("reminders")
        .update({ status: "cancelado", error_message: "Cita cancelada previamente" })
        .eq("id", reminder.id);
      return {
        success: false,
        error: "La cita asociada ha sido cancelada, por lo que el recordatorio fue cancelado y no se enviará.",
      };
    }

    const { data: msg } = await (supabase as any)
      .from("messaging_settings")
      .select("*")
      .eq("id", 1)
      .single();

    let telegramChatId = patient?.telegram_chat_id || null;

    // Auto-detección: Si no tiene chat_id pero el bot tiene token
    if (reminder.channel === "telegram" && !telegramChatId && msg?.telegram_bot_token) {
      try {
        const upRes = await fetch(`https://api.telegram.org/bot${msg.telegram_bot_token}/getUpdates`);
        const upData = await upRes.json();
        if (upData.ok && upData.result && upData.result.length > 0) {
          const latest = upData.result[upData.result.length - 1];
          const detectedChatId = latest.message?.chat?.id ? String(latest.message.chat.id) : null;
          if (detectedChatId) {
            telegramChatId = detectedChatId;
            await (supabase as any)
              .from("patients")
              .update({ telegram_chat_id: detectedChatId })
              .eq("id", reminder.patient_id);
          }
        }
      } catch (checkErr: any) {
        console.warn("Notice: auto-fetch telegram updates warning:", checkErr.message);
      }
    }

    const payload = {
      reminder_id: reminder.id,
      patient_id: reminder.patient_id,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Paciente",
      patient_phone: patient?.phone || "",
      patient_email: patient?.email || "",
      historia_id: patient?.historia_id || "",
      channel: reminder.channel,
      reminder_type: reminder.reminder_type,
      subject: reminder.subject,
      message: reminder.message,
      appointment_date: appointment?.appointment_date || null,
      appointment_reason: appointment?.reason || null,
      clinic_name: appointment?.clinics?.name || null,
      timestamp: new Date().toISOString(),
      messaging_config: {
        whatsapp: { enabled: msg?.whatsapp_enabled, phone: msg?.whatsapp_phone, template_name: msg?.whatsapp_template_name },
        telegram: { enabled: msg?.telegram_enabled, bot_token: msg?.telegram_bot_token, sender_phone: msg?.telegram_phone },
        email: { enabled: msg?.email_enabled, from: msg?.email_from, from_name: msg?.email_from_name },
      },
      telegram_chat_id: telegramChatId,
    };

    const n8nBaseUrl = process.env.N8N_WEBHOOK_BASE_URL || "https://n8nv2.mumaweb.com";
    const n8nWebhookUrl = process.env.N8N_REMINDERS_WEBHOOK || `${n8nBaseUrl}/webhook/melosmile-reminders-dispatcher`;

    let n8nExecutionId = null;
    let dispatchError: string | null = null;

    const hasTelegramSession = Boolean(msg?.telegram_session_string || process.env.TELEGRAM_SESSION_STRING);

    // Despacho directo vía WhatsApp (Evolution API v2)
    if (reminder.channel === "whatsapp") {
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp/evolution");
      const waResult = await sendWhatsAppMessage({
        phone: patient?.phone || "",
        message: reminder.message,
      });

      if (waResult.success) {
        const nowIso = new Date().toISOString();
        await (supabase as any)
          .from("reminders")
          .update({
            status: "enviado",
            sent_at: nowIso,
            error_message: null,
          })
          .eq("id", reminder.id);

        await (supabase as any).from("reminder_events").insert({
          reminder_id: reminder.id,
          event_type: "sent",
          description: `Recordatorio enviado directamente por WhatsApp (Evolution API) al teléfono ${patient?.phone}`,
          metadata: { messageId: waResult.messageId, status: waResult.status },
        });

        return {
          success: true,
          message: `Recordatorio enviado directamente a WhatsApp del paciente (${patient?.phone})`,
        };
      } else {
        dispatchError = waResult.error || "Fallo en el despacho de WhatsApp";
      }
    }
    // Despacho directo vía Telegram MTProto (cuenta clínica a teléfono de paciente)
    else if (reminder.channel === "telegram" && hasTelegramSession) {
      const { sendTelegramDirectMessage } = await import("@/lib/telegram/mtproto");
      const mtprotoResult = await sendTelegramDirectMessage({
        phone: patient?.phone || "",
        firstName: patient?.first_name || "",
        lastName: patient?.last_name || "",
        message: reminder.message,
      });

      if (mtprotoResult.success) {
        const nowIso = new Date().toISOString();
        await (supabase as any)
          .from("reminders")
          .update({
            status: "enviado",
            sent_at: nowIso,
            error_message: null,
          })
          .eq("id", reminder.id);

        await (supabase as any).from("reminder_events").insert({
          reminder_id: reminder.id,
          event_type: "sent",
          description: `Recordatorio enviado directamente por Telegram MTProto al teléfono ${patient?.phone}`,
          metadata: { messageId: mtprotoResult.messageId, telegramUserId: mtprotoResult.telegramUserId },
        });

        return {
          success: true,
          message: `Recordatorio enviado directamente a Telegram del paciente (${patient?.phone})`,
        };
      } else {
        dispatchError = mtprotoResult.error || "Fallo en el despacho directo de Telegram MTProto";
      }
    } else {
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const resJson = await response.json().catch(() => ({}));

        if (!response.ok || resJson.success === false) {
          dispatchError = resJson.error || `Error en el servicio de mensajería (HTTP ${response.status})`;
        } else {
          n8nExecutionId = resJson.execution_id || resJson.id || null;
        }
      } catch (n8nErr: any) {
        dispatchError = `No se pudo conectar con el despachador de mensajes: ${n8nErr.message}`;
      }
    }

    if (dispatchError) {
      // Registrar evento de fallo
      await (supabase as any).from("reminder_events").insert({
        reminder_id: reminder.id,
        event_type: "error",
        description: `Fallo al enviar por ${reminder.channel}: ${dispatchError}`,
      });

      // Dejar reminder en estado de error
      await (supabase as any)
        .from("reminders")
        .update({
          status: "error",
          error_message: dispatchError,
        })
        .eq("id", reminder.id);

      return {
        success: false,
        error: dispatchError,
      };
    }

    // Marcar como enviado exitosamente
    const nowIso = new Date().toISOString();
    await (supabase as any)
      .from("reminders")
      .update({
        status: "enviado",
        sent_at: nowIso,
        n8n_execution_id: n8nExecutionId,
        error_message: null,
      })
      .eq("id", reminder.id);

    await (supabase as any).from("reminder_events").insert({
      reminder_id: reminder.id,
      event_type: "sent",
      description: `Recordatorio enviado a través de canal ${reminder.channel}`,
      metadata: { n8nExecutionId },
    });

    return {
      success: true,
      message: `Recordatorio enviado correctamente por ${reminder.channel}`,
    };
  } catch (error: any) {
    console.error("Error en dispatchReminder:", error);
    return {
      success: false,
      error: error.message || "Error al despachar recordatorio",
    };
  }
}
