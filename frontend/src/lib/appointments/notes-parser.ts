export interface ParsedProcedure {
  id?: string;
  name: string;
  toothRef?: string;
  price?: number;
}

export interface ParsedAppointmentNotes {
  clinicalNotes: string;
  procedures: ParsedProcedure[];
}

/**
 * Extracts human-readable clinical notes and parses any structured [Procedimientos: [...]]
 * tag stored in appointment notes, removing raw JSON and internal metadata tags.
 */
export function parseAppointmentNotes(rawNotes?: string | null): ParsedAppointmentNotes {
  if (!rawNotes || typeof rawNotes !== "string") {
    return { clinicalNotes: "", procedures: [] };
  }

  let text = rawNotes;
  const procedures: ParsedProcedure[] = [];

  // Match and extract [Procedimientos: ...]
  const procTagIndex = text.indexOf("[Procedimientos:");
  if (procTagIndex !== -1) {
    let depth = 0;
    let endIdx = -1;
    for (let i = procTagIndex; i < text.length; i++) {
      if (text[i] === "[") depth++;
      else if (text[i] === "]") {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (endIdx !== -1) {
      const fullTag = text.substring(procTagIndex, endIdx + 1);
      const jsonStart = fullTag.indexOf("[", 15);
      if (jsonStart !== -1) {
        const jsonCandidate = fullTag.substring(jsonStart, fullTag.length - 1).trim();
        try {
          const parsed = JSON.parse(jsonCandidate);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (typeof item === "string") {
                if (item.trim()) procedures.push({ name: item.trim() });
              } else if (item && typeof item === "object") {
                const name =
                  item.serviceName ||
                  item.treatment_name ||
                  item.treatmentName ||
                  item.name ||
                  item.title;
                if (name) {
                  procedures.push({
                    id: item.id || item.treatmentId,
                    name: String(name).trim(),
                    toothRef: item.toothRef ? String(item.toothRef).trim() : undefined,
                    price:
                      typeof item.dbPrice === "number"
                        ? item.dbPrice
                        : typeof item.price === "number"
                        ? item.price
                        : undefined,
                  });
                }
              }
            });
          }
        } catch {
          // Fallback regex if JSON was malformed
          const matches = fullTag.match(/"(?:serviceName|treatment_name|name)":"([^"]+)"/g);
          if (matches) {
            matches.forEach((m) => {
              const nameMatch = m.match(/:"([^"]+)"/);
              if (nameMatch && nameMatch[1]) {
                procedures.push({ name: nameMatch[1] });
              }
            });
          }
        }
      }
      text = text.substring(0, procTagIndex) + text.substring(endIdx + 1);
    } else {
      text = text.replace(/\[Procedimientos:[\s\S]*?\]?$/i, "");
    }
  }

  // Strip other internal metadata tags
  text = text
    .replace(/\[Odontograma:\s*[\s\S]*?\]/gi, "")
    .replace(/\[DoctorInvitado:\s*[\s\S]*?\]/gi, "")
    .replace(/\[Fotos:\s*[\s\S]*?\]/gi, "")
    .replace(/\[Archivos:\s*[\s\S]*?\]/gi, "")
    .trim();

  return {
    clinicalNotes: text,
    procedures,
  };
}

/**
 * Returns a clean, concise single-line preview of notes for calendar event cards.
 */
export function getCleanNotesPreview(rawNotes?: string | null): string {
  const { clinicalNotes, procedures } = parseAppointmentNotes(rawNotes);
  if (clinicalNotes) return clinicalNotes;
  if (procedures.length > 0) {
    return procedures.map((p) => p.name).join(", ");
  }
  return "";
}
