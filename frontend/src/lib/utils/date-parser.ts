/**
 * lib/utils/date-parser.ts
 *
 * Función centralizada de parsing de fechas en lenguaje natural (español + ISO).
 * Utilizada por appointments/create, appointments/update y cualquier ruta que
 * necesite interpretar fechas. Timezone base: Europe/Madrid.
 */

export interface DateRange {
  startISO: string;
  endISO: string;
  dateLabel: string;
}

const SPANISH_MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

const SPANISH_WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2,
  miércoles: 3, miercoles: 3,
  jueves: 4, viernes: 5,
  sábado: 6, sabado: 6,
};

const DAYS_OF_WEEK_EN: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6, sunday: 0,
};

/** Returns current date components anchored to Europe/Madrid timezone */
export function getMadridDate(): { yyyy: number; mm: number; dd: number; isoToday: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // Format: "YYYY-MM-DD"

  const [yyyy, mm, dd] = parts.split("-").map(Number);
  return { yyyy, mm, dd, isoToday: parts };
}

/** Format a Date as time string in Europe/Madrid timezone (HH:MM) */
export function formatTimeMadrid(date: Date): string {
  return date.toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a Date as date string in Europe/Madrid timezone (YYYY-MM-DD) */
export function formatDateMadrid(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Matches inputs that already carry an explicit UTC designator or numeric offset (e.g. "...Z", "...+02:00", "...-0300", "...UTC") */
const EXPLICIT_TZ_RE = /(?:[zZ]|utc|[+-]\d{2}:?\d{2})$/;

/**
 * Converts a Europe/Madrid wall-clock date/time into the correct UTC instant.
 * Uses a two-pass Intl offset lookup so DST transitions are handled correctly.
 *
 * Example: 2026-08-24 13:00 Madrid (CEST, UTC+2) -> "2026-08-24T11:00:00.000Z"
 */
export function madridWallTimeToUtcIso(
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number
): string {
  const guessMs = Date.UTC(year, monthIndex, day, hours, minutes, 0, 0);

  const madridOffsetMinutes = (instantMs: number): number => {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Madrid",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(instantMs));
    const get = (type: string): number =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    const hour = get("hour") % 24; // guarda contra "24:00" en algunas versiones de ICU
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      hour,
      get("minute"),
      get("second")
    );
    return Math.round((asUtc - instantMs) / 60000);
  };

  const firstPassMs = guessMs - madridOffsetMinutes(guessMs) * 60000;
  const finalMs = guessMs - madridOffsetMinutes(firstPassMs) * 60000;
  return new Date(finalMs).toISOString();
}

/**
 * Converts a date + optional time input string into a UTC ISO-8601 string.
 * Supports: ISO dates, relative keywords (mañana, ayer, pasado mañana),
 * Spanish weekday names, and HH:MM time extraction.
 *
 * Used by: appointments/create, appointments/update
 */
export function parseAppointmentDate(inputDate?: string, inputTime?: string): string {
  let combined = inputDate || "";
  if (inputTime && !combined.includes(inputTime)) {
    combined += ` ${inputTime}`;
  }

  const str = combined.toLowerCase().trim();

  if (!str) {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
  }

  // 1. Standard ISO / parseable date
  const direct = new Date(combined);
  if (!isNaN(direct.getTime()) && (str.includes("-") || str.includes("/"))) {
    // Input already carries an explicit timezone/offset (Z, ±HH:MM, UTC):
    // honor it verbatim (behavior preserved).
    if (EXPLICIT_TZ_RE.test(combined.trim())) {
      return direct.toISOString();
    }

    // ISO-style date WITH clock time but WITHOUT explicit zone:
    // interpret the wall-clock time in Europe/Madrid
    // (e.g. "2026-08-24 13:00" -> "2026-08-24T11:00:00.000Z" in summer).
    const isoParts = combined.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (isoParts && isoParts[4] !== undefined) {
      return madridWallTimeToUtcIso(
        Number(isoParts[1]),
        Number(isoParts[2]) - 1,
        Number(isoParts[3]),
        Number(isoParts[4]),
        Number(isoParts[5])
      );
    }

    // Date-only or other parseable format without explicit zone:
    // keep legacy UTC behavior.
    return direct.toISOString();
  }

  // 2. Use Madrid as base date
  const madrid = getMadridDate();
  let targetYear = madrid.yyyy;
  let targetMonth = madrid.mm - 1; // 0-indexed for Date constructor
  let targetDay = madrid.dd;
  let hours = 10;
  let minutes = 0;

  // Extract time (HH:MM or HHhMM)
  const timeMatch = str.match(/(\d{1,2})[:h](\d{2})?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  }

  const dateOnlyStr = str.replace(/(\d{1,2})[:h](\d{2})?/gi, "").trim();

  // 3. Relative keywords
  if (dateOnlyStr.includes("pasado mañana") || dateOnlyStr.includes("pasado manana")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd);
    d.setDate(d.getDate() + 2);
    targetYear = d.getFullYear(); targetMonth = d.getMonth(); targetDay = d.getDate();
  } else if (dateOnlyStr.includes("mañana") || dateOnlyStr.includes("manana")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd);
    d.setDate(d.getDate() + 1);
    targetYear = d.getFullYear(); targetMonth = d.getMonth(); targetDay = d.getDate();
  } else if (dateOnlyStr.includes("ayer")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd);
    d.setDate(d.getDate() - 1);
    targetYear = d.getFullYear(); targetMonth = d.getMonth(); targetDay = d.getDate();
  } else {
    // 4. Weekday names (Spanish + English)
    const allWeekdays = { ...SPANISH_WEEKDAYS, ...DAYS_OF_WEEK_EN };
    let matchedWeekday: number | null = null;
    for (const [wName, wNum] of Object.entries(allWeekdays)) {
      if (dateOnlyStr.includes(wName)) { matchedWeekday = wNum; break; }
    }

    if (matchedWeekday !== null) {
      const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd);
      let diff = matchedWeekday - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      targetYear = d.getFullYear(); targetMonth = d.getMonth(); targetDay = d.getDate();
    } else {
      // 5. "DD de mes" or numeric day
      const dayMatch = dateOnlyStr.match(/(\d{1,2})\s*(?:de|\/|-)?\s*([a-záéíóú]+)?/i);
      if (dayMatch) {
        const parsedDay = parseInt(dayMatch[1], 10);
        if (parsedDay >= 1 && parsedDay <= 31) {
          targetDay = parsedDay;
          if (dayMatch[2] && SPANISH_MONTHS[dayMatch[2].toLowerCase()] !== undefined) {
            targetMonth = SPANISH_MONTHS[dayMatch[2].toLowerCase()];
          }
        }
      }
    }
  }

  // Round minutes to nearest 15
  const roundedMins = Math.round(minutes / 15) * 15;
  if (roundedMins === 60) {
    hours = hours + 1;
    minutes = 0;
  } else {
    minutes = roundedMins;
  }

  // Interpret the resolved wall-clock time in Europe/Madrid and store the
  // correct UTC instant (fixes appointments saved as if Madrid time were UTC).
  return madridWallTimeToUtcIso(targetYear, targetMonth, targetDay, hours, minutes);
}

/**
 * Parses natural language date strings into an ISO UTC range.
 * Supports: hoy, mañana, semana, mes, weekday names, Spanish month names, ISO dates.
 *
 * Used by: appointments/list
 */
export function getDateRange(dateStr: string): DateRange {
  let clean = dateStr.replace(/^["']|["']$/g, "").toLowerCase().trim();
  try { clean = decodeURIComponent(clean); } catch (_) {}

  const madrid = getMadridDate();

  const pad = (n: number) => String(n).padStart(2, "0");
  const isoDay = (y: number, m: number, d: number) =>
    `${y}-${pad(m)}-${pad(d)}`;

  const weekRange = (startDate: Date): DateRange => {
    const monday = new Date(startDate);
    const dow = monday.getDay();
    monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const s = isoDay(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());
    const e = isoDay(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate());
    return { startISO: `${s}T00:00:00.000Z`, endISO: `${e}T23:59:59.999Z`, dateLabel: `${s} al ${e}` };
  };

  if (clean.includes("semana pasada") || clean.includes("last week")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd - 7);
    const r = weekRange(d);
    return { ...r, dateLabel: `la semana pasada (${r.dateLabel})` };
  }
  if (clean.includes("proxima semana") || clean.includes("próxima semana") || clean.includes("semana que viene") || clean.includes("next week")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd + 7);
    const r = weekRange(d);
    return { ...r, dateLabel: `la próxima semana (${r.dateLabel})` };
  }
  if (clean.includes("esta semana") || clean.includes("semana") || clean.includes("this week")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd);
    const r = weekRange(d);
    return { ...r, dateLabel: `esta semana (${r.dateLabel})` };
  }

  // Bare Spanish month name -> full calendar month range (e.g. "agosto", "el mes de septiembre").
  // Skipped when the input already pairs a day with a month (e.g. "26 de agosto"),
  // so the single-day resolution below keeps handling those cases as before.
  const dayMonthRef = clean.match(/(\d{1,2})\s*(?:de|\/|-)?\s*([a-záéíóú]+)/i);
  const hasDayWithMonth = !!(dayMonthRef && SPANISH_MONTHS[dayMonthRef[2].toLowerCase()] !== undefined);
  if (!hasDayWithMonth) {
    for (const [mName, mIdx] of Object.entries(SPANISH_MONTHS)) {
      if (new RegExp(`\\b${mName}\\b`).test(clean)) {
        const year = mIdx >= madrid.mm - 1 ? madrid.yyyy : madrid.yyyy + 1;
        const first = new Date(year, mIdx, 1);
        const last = new Date(year, mIdx + 1, 0);
        const s = isoDay(first.getFullYear(), first.getMonth() + 1, first.getDate());
        const e = isoDay(last.getFullYear(), last.getMonth() + 1, last.getDate());
        return { startISO: `${s}T00:00:00.000Z`, endISO: `${e}T23:59:59.999Z`, dateLabel: `${mName} (${s} al ${e})` };
      }
    }
  }

  if (clean.includes("mes pasado") || clean.includes("last month")) {
    const first = new Date(madrid.yyyy, madrid.mm - 2, 1);
    const last = new Date(madrid.yyyy, madrid.mm - 1, 0);
    const s = isoDay(first.getFullYear(), first.getMonth() + 1, first.getDate());
    const e = isoDay(last.getFullYear(), last.getMonth() + 1, last.getDate());
    return { startISO: `${s}T00:00:00.000Z`, endISO: `${e}T23:59:59.999Z`, dateLabel: `el mes pasado (${s} al ${e})` };
  }
  if (clean.includes("proximo mes") || clean.includes("próximo mes") || clean.includes("mes que viene") || clean.includes("next month")) {
    const first = new Date(madrid.yyyy, madrid.mm, 1);
    const last = new Date(madrid.yyyy, madrid.mm + 1, 0);
    const s = isoDay(first.getFullYear(), first.getMonth() + 1, first.getDate());
    const e = isoDay(last.getFullYear(), last.getMonth() + 1, last.getDate());
    return { startISO: `${s}T00:00:00.000Z`, endISO: `${e}T23:59:59.999Z`, dateLabel: `el próximo mes (${s} al ${e})` };
  }
  if (clean.includes("este mes") || clean.includes("mes") || clean.includes("this month")) {
    const first = new Date(madrid.yyyy, madrid.mm - 1, 1);
    const last = new Date(madrid.yyyy, madrid.mm, 0);
    const s = isoDay(first.getFullYear(), first.getMonth() + 1, first.getDate());
    const e = isoDay(last.getFullYear(), last.getMonth() + 1, last.getDate());
    return { startISO: `${s}T00:00:00.000Z`, endISO: `${e}T23:59:59.999Z`, dateLabel: `este mes (${s} al ${e})` };
  }

  // Explicit range "YYYY-MM-DD/YYYY-MM-DD" (built by the n8n agent).
  // Must be checked before the single-day ISO match below.
  const rangeMatch = clean.match(/^(\d{4}-\d{2}-\d{2})\s*\/\s*(\d{4}-\d{2}-\d{2})$/);
  if (rangeMatch) {
    const s = rangeMatch[1];
    const e = rangeMatch[2];
    return { startISO: `${s}T00:00:00.000Z`, endISO: `${e}T23:59:59.999Z`, dateLabel: `${s} al ${e}` };
  }

  // Single-day resolution
  let targetY = madrid.yyyy;
  let targetM = madrid.mm;
  let targetD = madrid.dd;

  if (clean.includes("pasado mañana") || clean.includes("pasado manana")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd + 2);
    targetY = d.getFullYear(); targetM = d.getMonth() + 1; targetD = d.getDate();
  } else if (clean.includes("mañana") || clean.includes("manana")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd + 1);
    targetY = d.getFullYear(); targetM = d.getMonth() + 1; targetD = d.getDate();
  } else if (clean.includes("ayer") || clean.includes("yesterday")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd - 1);
    targetY = d.getFullYear(); targetM = d.getMonth() + 1; targetD = d.getDate();
  } else if (clean.includes("hoy") || clean.includes("today")) {
    // keep today
  } else {
    // ISO date YYYY-MM-DD
    const isoMatch = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      targetY = parseInt(isoMatch[1]); targetM = parseInt(isoMatch[2]); targetD = parseInt(isoMatch[3]);
    } else {
      // Weekday
      const allWeekdays = { ...SPANISH_WEEKDAYS, ...DAYS_OF_WEEK_EN };
      let matched: number | null = null;
      for (const [wName, wNum] of Object.entries(allWeekdays)) {
        if (clean.includes(wName)) { matched = wNum; break; }
      }
      if (matched !== null) {
        const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd);
        let diff = matched - d.getDay();
        if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
        targetY = d.getFullYear(); targetM = d.getMonth() + 1; targetD = d.getDate();
      } else {
        // "DD de mes" or "DD/MM"
        const dayMonthMatch = clean.match(/(\d{1,2})\s*(?:de|\/|-)?\s*([a-záéíóú]+|\d{1,2})/i);
        if (dayMonthMatch) {
          const parsedDay = parseInt(dayMonthMatch[1], 10);
          if (parsedDay >= 1 && parsedDay <= 31) {
            targetD = parsedDay;
            const monthPart = dayMonthMatch[2].toLowerCase();
            if (SPANISH_MONTHS[monthPart] !== undefined) {
              targetM = SPANISH_MONTHS[monthPart] + 1;
            } else {
              const numMonth = parseInt(monthPart, 10);
              if (!isNaN(numMonth) && numMonth >= 1 && numMonth <= 12) targetM = numMonth;
            }
          }
        }
      }
    }
  }

  const dateStr2 = isoDay(targetY, targetM, targetD);
  return {
    startISO: `${dateStr2}T00:00:00.000Z`,
    endISO: `${dateStr2}T23:59:59.999Z`,
    dateLabel: dateStr2,
  };
}

/** Date keywords that signal a date context (not a patient name) */
export const DATE_KEYWORDS = [
  "mañana", "manana", "tomorrow", "pasado mañana",
  "hoy", "today", "ayer", "yesterday", "semana",
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function isDateKeyword(term: string): boolean {
  const lower = term.toLowerCase();
  if (DATE_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  const allWeekdays = { ...SPANISH_WEEKDAYS, ...DAYS_OF_WEEK_EN };
  if (Object.keys(allWeekdays).some((d) => lower.includes(d))) return true;
  if (/\d{4}-\d{2}-\d{2}/.test(lower)) return true;
  if (/\d{1,2}\s*(?:de|\/|-)\s*(?:[a-z]+|\d{1,2})/i.test(lower)) return true;
  return false;
}
