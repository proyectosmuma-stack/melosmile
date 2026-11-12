import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import bigInt from "big-integer";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export interface SendTelegramDirectOptions {
  phone: string;
  firstName?: string;
  lastName?: string;
  message: string;
}

export interface SendTelegramDirectResult {
  success: boolean;
  messageId?: number;
  telegramUserId?: string;
  error?: string;
}

/**
 * Normaliza el número de teléfono eliminando espacios y caracteres no numéricos
 * excepto el signo '+' inicial.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^\d+]/g, "");
  if (!clean.startsWith("+")) {
    // Si no tiene prefijo pero tiene 9 dígitos (España)
    if (clean.length === 9) {
      clean = `+34${clean}`;
    } else {
      clean = `+${clean}`;
    }
  }
  return clean;
}

/**
 * Envía un mensaje directo a través de Telegram MTProto (cuenta de usuario de la clínica)
 * directamente al número de teléfono del paciente, sin exigir bot ni chat_id previo.
 */
export async function sendTelegramDirectMessage(
  options: SendTelegramDirectOptions
): Promise<SendTelegramDirectResult> {
  const { phone, firstName, lastName, message } = options;

  if (!phone) {
    return { success: false, error: "El paciente no tiene un número de teléfono registrado." };
  }

  // 1. Obtener credenciales y sesión desde messaging_settings o entorno
  const { data: settings } = await (supabase as any)
    .from("messaging_settings")
    .select("telegram_enabled, telegram_phone, telegram_api_id, telegram_api_hash, telegram_session_string")
    .eq("id", 1)
    .single();

  const apiId = Number(settings?.telegram_api_id || process.env.TELEGRAM_API_ID || 31158011);
  const apiHash = settings?.telegram_api_hash || process.env.TELEGRAM_API_HASH || "9258407c8ea67b1e5d97bd04214ed6f8";
  const sessionString = settings?.telegram_session_string || process.env.TELEGRAM_SESSION_STRING || "";

  if (!sessionString) {
    return {
      success: false,
      error: "La sesión MTProto de Telegram no está autenticada. Ejecuta 'npm run telegram:auth' para vincular la línea de la clínica.",
    };
  }

  const cleanPhone = normalizePhoneNumber(phone);
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 3,
  });

  try {
    await client.connect();

    const isAuthorized = await client.isUserAuthorized();
    if (!isAuthorized) {
      await client.disconnect();
      return {
        success: false,
        error: "La sesión de Telegram ha expirado o no está autorizada. Requiere reautenticación.",
      };
    }

    // 2. Importar contacto temporalmente por número telefónico para obtener InputPeer
    const importResult = await client.invoke(
      new Api.contacts.ImportContacts({
        contacts: [
          new Api.InputPhoneContact({
            clientId: bigInt(Date.now()),
            phone: cleanPhone,
            firstName: firstName || "Paciente",
            lastName: lastName || "",
          }),
        ],
      })
    );

    const users = (importResult as any).users;
    if (!users || users.length === 0) {
      await client.disconnect();
      return {
        success: false,
        error: `El número ${cleanPhone} no está registrado en Telegram o tiene privacidad restrictiva.`,
      };
    }

    const targetUser = users[0];

    // Reemplazar URLs locales de desarrollo por el dominio de la app (agenda.melosmile.com)
    // para que Telegram en móviles reconozca el TLD (.com) y active el enlace clicable
    const formattedMessage = message.replace(
      /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi,
      "https://agenda.melosmile.com"
    );

    // 3. Enviar mensaje directo con vista previa de enlaces habilitada
    const sent = await client.sendMessage(targetUser, {
      message: formattedMessage,
      linkPreview: true,
    });

    await client.disconnect();

    return {
      success: true,
      messageId: sent.id,
      telegramUserId: targetUser.id?.toString(),
    };
  } catch (error: any) {
    console.error("Error al enviar mensaje MTProto directo:", error);
    try {
      await client.disconnect();
    } catch {}

    let userFriendlyError = error.message || "Error desconocido al enviar mensaje Telegram";
    if (userFriendlyError.includes("FLOOD_WAIT")) {
      userFriendlyError = "Límite temporal de Telegram (FLOOD_WAIT). Espera unos minutos antes de reenviar.";
    } else if (userFriendlyError.includes("PHONE_NOT_OCCUPIED")) {
      userFriendlyError = `El teléfono ${cleanPhone} no tiene cuenta en Telegram.`;
    }

    return {
      success: false,
      error: userFriendlyError,
    };
  }
}
