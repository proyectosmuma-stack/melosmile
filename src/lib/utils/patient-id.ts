/**
 * lib/utils/patient-id.ts
 *
 * Utility centralizado para generar el siguiente historia_id secuencial (PAC-001, PAC-002...).
 * Centraliza la lógica que estaba duplicada en 4 rutas:
 *   - appointments/create/route.ts
 *   - appointments/update/route.ts
 *   - billing/extract/route.ts
 *   - patients/create/route.ts
 *
 * Usa ORDER BY + LIMIT 1 para máxima eficiencia y evitar race conditions con limit(N).
 */

import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Devuelve el siguiente historia_id disponible en formato PAC-XXX.
 * Obtiene el máximo actual con una sola query ordenada y le suma 1.
 *
 * @param client - Opcional: cliente de Supabase a usar. Por defecto supabaseAdmin.
 * @returns Promise<string> - Ej: "PAC-007"
 */
export async function getNextHistoriaId(
  client: typeof supabaseAdmin = supabaseAdmin
): Promise<string> {
  const { data } = await (client as any)
    .from("patients")
    .select("historia_id")
    .ilike("historia_id", "PAC-%")
    .order("historia_id", { ascending: false })
    .limit(1);

  let maxNum = 0;
  if (data && data.length > 0 && data[0].historia_id) {
    const match = data[0].historia_id.match(/PAC-(\d+)/);
    if (match) {
      maxNum = parseInt(match[1], 10);
    }
  }

  return `PAC-${String(maxNum + 1).padStart(3, "0")}`;
}
