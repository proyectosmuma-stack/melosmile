import https from "node:https";
import dns from "node:dns";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

const EVOLUTION_DEFAULT_URL = process.env.EVOLUTION_API_URL || "https://evolution.mumaweb.com";
const EVOLUTION_DEFAULT_KEY = process.env.EVOLUTION_API_KEY || "7cb3d919a032c8ff76d8c29dd02cc1768c5a778595a3c01b";
const EVOLUTION_DEFAULT_INSTANCE = process.env.EVOLUTION_INSTANCE || "melosmile";

// Agent con fallback de resolución DNS directa a la IP del VPS en caso de que la propagación local esté en curso
const customAgent = new https.Agent({
  lookup: (hostname, options, callback) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (hostname === "evolution.mumaweb.com") {
      if (options && (options as any).all) {
        return (callback as any)(null, [{ address: "94.143.139.120", family: 4 }]);
      }
      return (callback as any)(null, "94.143.139.120", 4);
    }
    return dns.lookup(hostname, options, callback);
  },
});

/**
 * Obtiene la configuración activa de Evolution API desde Supabase o variables de entorno
 */
export async function getEvolutionConfig() {
  try {
    const { data } = await (supabase as any)
      .from("messaging_settings")
      .select("evolution_api_url, evolution_api_key, evolution_instance, whatsapp_phone")
      .eq("id", 1)
      .maybeSingle();

    return {
      apiUrl: data?.evolution_api_url || EVOLUTION_DEFAULT_URL,
      apiKey: data?.evolution_api_key || EVOLUTION_DEFAULT_KEY,
      instance: data?.evolution_instance || EVOLUTION_DEFAULT_INSTANCE,
      phone: data?.whatsapp_phone || null,
    };
  } catch {
    return {
      apiUrl: EVOLUTION_DEFAULT_URL,
      apiKey: EVOLUTION_DEFAULT_KEY,
      instance: EVOLUTION_DEFAULT_INSTANCE,
      phone: null,
    };
  }
}

/**
 * Cliente HTTP resiliente para Evolution API v2
 */
export async function evolutionRequest<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    apiKey?: string;
    apiUrl?: string;
  } = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const config = await getEvolutionConfig();
  const baseUrl = (options.apiUrl || config.apiUrl).replace(/\/$/, "");
  const apiKey = options.apiKey || config.apiKey;
  const method = options.method || "GET";
  const url = new URL(`${baseUrl}${endpoint}`);

  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : null;
    const req = https.request(
      url,
      {
        method,
        agent: customAgent,
        headers: {
          apikey: apiKey,
          ...(postData
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
              }
            : {}),
        },
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => (rawData += chunk));
        res.on("end", () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            ok: (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300,
            status: res.statusCode || 500,
            data: parsed,
          });
        });
      }
    );

    req.on("error", (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

/**
 * Consulta el estado de conexión de la instancia de WhatsApp
 */
export async function getWhatsAppStatus(instanceName?: string) {
  const config = await getEvolutionConfig();
  const instance = instanceName || config.instance;

  try {
    const res = await evolutionRequest(`/instance/connectionState/${instance}`);
    if (res.ok && res.data) {
      const state = res.data?.instance?.state || "close";
      return {
        success: true,
        instance,
        state,
        isConnected: state === "open",
      };
    }

    // Si la instancia aún no existe
    return {
      success: true,
      instance,
      state: "close",
      isConnected: false,
    };
  } catch (err: any) {
    return {
      success: false,
      instance,
      state: "close",
      isConnected: false,
      error: err.message,
    };
  }
}

/**
 * Obtiene o genera el código QR para vincular WhatsApp Web
 */
export async function getWhatsAppQr(instanceName?: string) {
  const config = await getEvolutionConfig();
  const instance = instanceName || config.instance;

  try {
    // 1. Intentar conectar directamente
    let res = await evolutionRequest(`/instance/connect/${instance}`);

    // Si la instancia no existe (404), la creamos
    if (res.status === 404 || !res.ok) {
      const createRes = await evolutionRequest("/instance/create", {
        method: "POST",
        body: {
          instanceName: instance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        },
      });

      if (createRes.ok && createRes.data?.qrcode?.base64) {
        return {
          success: true,
          base64: createRes.data.qrcode.base64,
          pairingCode: createRes.data.qrcode.pairingCode || null,
          count: createRes.data.qrcode.count || 1,
        };
      }

      // Reintentar connect
      res = await evolutionRequest(`/instance/connect/${instance}`);
    }

    if (res.ok && res.data) {
      return {
        success: true,
        base64: res.data.base64 || null,
        pairingCode: res.data.pairingCode || null,
        count: res.data.count || 1,
        state: res.data.state || "connecting",
      };
    }

    return {
      success: false,
      error: res.data?.response?.message || "No se pudo generar el código QR de WhatsApp.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Desconecta la sesión activa de WhatsApp
 */
export async function disconnectWhatsApp(instanceName?: string) {
  const config = await getEvolutionConfig();
  const instance = instanceName || config.instance;

  try {
    const res = await evolutionRequest(`/instance/logout/${instance}`, {
      method: "DELETE",
    });
    return {
      success: res.ok,
      message: res.data?.response?.message || "Sesión de WhatsApp desconectada.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

// ─── Cola de Despacho con Retardo Humano Aleatorio (30s a 60s) ───
let lastWhatsAppSentTimestamp = 0;
let dispatchQueuePromise: Promise<any> = Promise.resolve();

/**
 * Calcula un retardo aleatorio en milisegundos entre min y max segundos
 */
export function getRandomHumanDelayMs(minSeconds = 30, maxSeconds = 60): number {
  const minMs = minSeconds * 1000;
  const maxMs = maxSeconds * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Envío individual de mensaje de WhatsApp a Evolution API
 */
async function _sendSingleWhatsAppMessage(options: {
  phone: string;
  message: string;
  instanceName?: string;
}) {
  const { phone, message, instanceName } = options;
  if (!phone) {
    return { success: false, error: "El paciente no tiene número de teléfono registrado." };
  }

  // 1. Limpiar y normalizar el número (sólo dígitos, con prefijo 34 para España por defecto si tiene 9 dígitos)
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 9) {
    clean = `34${clean}`;
  }

  // 2. Normalizar enlaces de desarrollo por el dominio de la app
  const formattedMessage = message.replace(
    /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi,
    "https://agenda.melosmile.com"
  );

  const config = await getEvolutionConfig();
  const instance = instanceName || config.instance;

  // Verificar estado de conexión previo para evitar bloqueos
  const status = await getWhatsAppStatus(instance);
  if (!status.isConnected) {
    return {
      success: false,
      error: "WhatsApp no está vinculado. Escanea el código QR en Ajustes > Mensajería.",
    };
  }

  try {
    // delay: 2000 simula que el usuario está escribiendo durante 2 segundos antes de enviar
    const res = await evolutionRequest(`/message/sendText/${instance}`, {
      method: "POST",
      body: {
        number: clean,
        text: formattedMessage,
        linkPreview: true,
        delay: 2000,
      },
    });

    if (res.ok && res.data) {
      return {
        success: true,
        messageId: res.data?.key?.id || res.data?.id,
        status: res.data?.status || "PENDING",
      };
    }

    const errMsg = res.data?.response?.message || res.data?.message || `Error HTTP ${res.status} en Evolution API`;
    return {
      success: false,
      error: errMsg,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Error al conectar con el servidor de WhatsApp",
    };
  }
}

/**
 * Envía un mensaje directo de WhatsApp al paciente asegurando un intervalo
 * de entre 30 y 60 segundos de forma aleatoria respecto al último mensaje enviado
 * para simular comportamiento humano y evitar detecciones/baneos por parte de Meta.
 */
export async function sendWhatsAppMessage(options: {
  phone: string;
  message: string;
  instanceName?: string;
}): Promise<{ success: boolean; messageId?: string; status?: string; error?: string; delayAppliedSeconds?: number }> {
  return new Promise((resolve) => {
    dispatchQueuePromise = dispatchQueuePromise
      .then(async () => {
        const now = Date.now();
        let waitMs = 0;

        if (lastWhatsAppSentTimestamp > 0) {
          const elapsed = now - lastWhatsAppSentTimestamp;
          const targetDelayMs = getRandomHumanDelayMs(30, 60);

          if (elapsed < targetDelayMs) {
            waitMs = targetDelayMs - elapsed;
            console.log(`[Anti-Ban WhatsApp] Aplicando retardo humano de ${(waitMs / 1000).toFixed(1)}s antes del siguiente mensaje...`);
            await new Promise((r) => setTimeout(r, waitMs));
          }
        }

        const result = await _sendSingleWhatsAppMessage(options);
        lastWhatsAppSentTimestamp = Date.now();
        resolve({
          ...result,
          delayAppliedSeconds: waitMs > 0 ? Math.round(waitMs / 1000) : 0,
        });
      })
      .catch((err) => {
        resolve({
          success: false,
          error: err?.message || "Error en la cola de envío de WhatsApp",
        });
      });
  });
}

/**
 * Consulta la configuración de proxy de la instancia de WhatsApp en Evolution API
 */
export async function getWhatsAppProxy(instanceName?: string) {
  const config = await getEvolutionConfig();
  const instance = instanceName || config.instance;

  try {
    const res = await evolutionRequest(`/proxy/find/${instance}`);
    return {
      success: true,
      proxy: res.data || null,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Configura o actualiza el Proxy para la instancia de WhatsApp en Evolution API
 */
export async function setWhatsAppProxy(
  proxyConfig: {
    enabled: boolean;
    host: string;
    port: number;
    protocol: "http" | "https" | "socks4" | "socks5";
    username?: string;
    password?: string;
  },
  instanceName?: string
) {
  const config = await getEvolutionConfig();
  const instance = instanceName || config.instance;

  try {
    const res = await evolutionRequest(`/proxy/set/${instance}`, {
      method: "POST",
      body: proxyConfig,
    });

    return {
      success: res.ok,
      data: res.data,
      error: res.ok ? null : res.data?.response?.message || "No se pudo actualizar el proxy",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}
