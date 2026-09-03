/**
 * Dynamic Action Suggestions for Musly AI
 * Persisted in the Melosmile Knowledge Base (`agent_learnings` table in Supabase).
 * Adapts to professional usage, frequency, and time of day.
 */

export interface LearnedAction {
  text: string;
  count: number;
  lastUsed?: number;
  isLearned?: boolean;
}

const STORAGE_KEY = "melosmile_learned_actions_v1";

/**
 * Returns contextual default suggestions based on current time (Europe/Madrid).
 */
export function getContextualDefaults(): string[] {
  const now = new Date();
  const madridHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Madrid",
    }).format(now),
    10
  );
  const dayOfWeek = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday

  const suggestions: string[] = [];

  // Friday afternoon or Weekend:
  if (dayOfWeek === 0 || dayOfWeek === 6 || (dayOfWeek === 5 && madridHour >= 15)) {
    suggestions.push("agenda de la próxima semana");
    suggestions.push("cuales son las proximas citas agendadas?");
    suggestions.push("¿Cobros pendientes de esta semana?");
    suggestions.push("revisa las citas de mañana");
  } else if (madridHour < 14) {
    // Morning: Focus on today's appointments
    suggestions.push("revisa las citas de hoy");
    suggestions.push("cuales son las proximas citas agendadas?");
    suggestions.push("Cita a Munir mañana a las 14:00 para revisión en Goya");
    suggestions.push("¿Cobros pendientes de esta semana?");
  } else {
    // Afternoon: Focus on tomorrow & upcoming
    suggestions.push("revisa las citas de mañana");
    suggestions.push("cuales son las proximas citas agendadas?");
    suggestions.push("telefono de Munir callaos");
    suggestions.push("¿Cobros pendientes de esta semana?");
  }

  return suggestions;
}

/**
 * Loads learned actions from localStorage (fast client-side cache).
 */
export function getStoredLearnedActions(): LearnedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn("[DynamicSuggestions] Error loading cache", e);
  }
  return [];
}

/**
 * Saves a prompt to the persistent Knowledge Base (`agent_learnings` in Supabase)
 * and updates client cache.
 */
export async function trackUserAction(promptText: string, intent?: string): Promise<void> {
  const clean = promptText.trim();
  if (clean.length < 6 || clean.length > 80) return;
  if (/^(hola|buenas|adios|chao|si|no|ok|gracias|prueba|test)$/i.test(clean)) return;

  // 1. Update localStorage cache immediately for zero latency
  if (typeof window !== "undefined") {
    try {
      const current = getStoredLearnedActions();
      const idx = current.findIndex((a) => a.text.toLowerCase() === clean.toLowerCase());
      if (idx >= 0) {
        current[idx].count += 1;
        current[idx].lastUsed = Date.now();
      } else {
        current.push({ text: clean, count: 1, lastUsed: Date.now(), isLearned: true });
      }
      current.sort((a, b) => b.count - a.count);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, 20)));
    } catch (_) {}
  }

  // 2. Persist to Supabase Cloud Knowledge Base (agent_learnings)
  try {
    await fetch("/api/ai/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: clean, intent }),
    });
  } catch (err) {
    console.warn("[DynamicSuggestions] Could not persist to knowledge base:", err);
  }
}

/**
 * Computes dynamic suggestions by blending:
 * 1. Persistent learned actions from the Knowledge Base (agent_learnings)
 * 2. Recent client-side cache
 * 3. Contextual time-of-day defaults
 */
export function computeDynamicSuggestions(
  dbLearnings: Array<{ text: string; count?: number; isLearned?: boolean }> = []
): Array<{ text: string; isLearned?: boolean }> {
  const result: Array<{ text: string; isLearned?: boolean }> = [];
  const seen = new Set<string>();

  const add = (text: string, isLearned = false) => {
    const norm = text.toLowerCase().trim();
    if (!seen.has(norm) && result.length < 4) {
      seen.add(norm);
      result.push({ text, isLearned });
    }
  };

  // 1. Actions from Supabase Knowledge Base
  if (Array.isArray(dbLearnings) && dbLearnings.length > 0) {
    for (const item of dbLearnings) {
      if (result.length >= 3) break;
      add(item.text, true);
    }
  }

  // 2. Top actions from local cache (if not already added)
  const cached = getStoredLearnedActions();
  for (const item of cached) {
    if (result.length >= 3) break;
    add(item.text, true);
  }

  // 3. Complete with contextual defaults
  const defaults = getContextualDefaults();
  for (const def of defaults) {
    add(def, false);
  }

  return result;
}
