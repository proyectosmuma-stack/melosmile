/**
 * lib/utils/parse-body.ts
 *
 * Parser tolerante de cuerpos de petición para rutas API.
 *
 * Contexto: los nodos toolHttpRequest de flujos n8n (specifyBody:keypair sin
 * contentType explícito) envían POST con body "application/x-www-form-urlencoded".
 * Las rutas que solo hacen `await req.json()` reciben un objeto vacío, lo que
 * provoca errores 400 y falsos éxitos reportados por el agente IA.
 */

/**
 * Lee el cuerpo de una Request una sola vez y devuelve un objeto plano,
 * soportando tanto JSON como application/x-www-form-urlencoded.
 *
 * Reglas:
 * 1. Lee el raw text una sola vez.
 * 2. Si Content-Type incluye "application/json" o el raw empieza por "{"
 *    se intenta JSON.parse.
 * 3. Si el parseo JSON falla, o si el Content-Type es
 *    "application/x-www-form-urlencoded", se parsea con URLSearchParams
 *    construyendo un objeto plano { [k]: v } (todos los valores como string).
 * 4. Si el raw está vacío devuelve {} (comportamiento preservado).
 */
export async function parseRequestBody(req: Request): Promise<Record<string, any>> {
  const raw = await req.text();

  if (!raw) {
    return {};
  }

  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const shouldTryJson =
    contentType.includes("application/json") || raw.trimStart().startsWith("{");

  if (shouldTryJson) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
      // JSON válido pero no objeto plano (número, string, array): caer al parseo urlencoded
    } catch (_err) {
      // JSON inválido: caer al parseo urlencoded
    }
  }

  const obj: Record<string, any> = {};
  const params = new URLSearchParams(raw);
  for (const [key, value] of params.entries()) {
    obj[key] = value;
  }
  return obj;
}
