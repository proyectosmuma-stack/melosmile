/**
 * Dynamic Action Suggestions for Musly AI
 * Learns from the professional's frequent prompts, time of day, and clinic history.
 */

export interface LearnedAction {
  text: string;
  count: number;
  lastUsed: number;
  intent?: string;
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
 * Loads learned actions from localStorage.
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
    console.warn("[DynamicSuggestions] Error loading from storage", e);
  }
  return [];
}

/**
 * Records a user prompt so Musly learns the professional's favorite actions.
 */
export function trackUserAction(promptText: string, intent?: string): void {
  if (typeof window === "undefined") return;
  const clean = promptText.trim();
  // Filter out greetings or super short/long texts
  if (clean.length < 5 || clean.length > 80) return;
  if (/^(hola|buenas|adios|chao|si|no|ok|gracias|prueba)$/i.test(clean)) return;

  try {
    const current = getStoredLearnedActions();
    const existingIndex = current.findIndex(
      (a) => a.text.toLowerCase() === clean.toLowerCase()
    );

    if (existingIndex >= 0) {
      current[existingIndex].count += 1;
      current[existingIndex].lastUsed = Date.now();
      if (intent) current[existingIndex].intent = intent;
    } else {
      current.push({
        text: clean,
        count: 1,
        lastUsed: Date.now(),
        intent,
      });
    }

    // Keep top 20 actions sorted by frequency and recency
    current.sort((a, b) => {
      const scoreA = a.count * 2 + (Date.now() - a.lastUsed < 86400000 ? 3 : 0);
      const scoreB = b.count * 2 + (Date.now() - b.lastUsed < 86400000 ? 3 : 0);
      return scoreB - scoreA;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, 20)));
  } catch (e) {
    console.warn("[DynamicSuggestions] Error saving action", e);
  }
}

/**
 * Computes dynamic suggestions by blending:
 * 1. Frequent/recent learned actions by this professional
 * 2. Real clinic trends from backend (if provided)
 * 3. Contextual time-of-day defaults
 */
export function computeDynamicSuggestions(
  apiTrends: string[] = []
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

  // 1. Top learned actions from localStorage (used at least once)
  const learned = getStoredLearnedActions();
  for (const item of learned) {
    if (result.length >= 2) break; // Leave room for contextual/trending actions
    add(item.text, true);
  }

  // 2. Add API trends from clinic conversation history
  for (const trend of apiTrends) {
    if (result.length >= 3) break;
    add(trend, true);
  }

  // 3. Fill remaining slots with contextual defaults
  const defaults = getContextualDefaults();
  for (const def of defaults) {
    add(def, false);
  }

  return result;
}
