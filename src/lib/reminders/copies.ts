export type ReminderStage = 1 | 2 | 3;

export interface ReminderCopyParams {
  stage: ReminderStage;
  isConfirmed: boolean;
  isFirstMessage: boolean;
  firstName: string;
  fullDateLabel: string;
  timeStr: string;
  dayOfWeek: string;
  clinicName: string;
  clinicAddress?: string | null;
  confirmUrl: string;
}

/**
 * Retorna una variación de copy aleatoria y adecuada al estado de la cita.
 * Sin emojis, tono profesional y cercano, sin marcas de género, registro informal (tú) consistente.
 * NUNCA incluye el motivo de la cita (LOPD). Incluye siempre el nombre de la clínica y su dirección.
 * Sin redundancias: la marca "Melosmile" solo se menciona en el primer mensaje y el cuerpo nunca repite el verbo de contacto.
 */
export function resolveReminderCopy(params: ReminderCopyParams): string {
  const { stage, isConfirmed, isFirstMessage, firstName, fullDateLabel, timeStr, dayOfWeek, clinicName, confirmUrl } = params;

  const address = (params.clinicAddress || "").trim();
  const clinicLine = address
    ? `La cita tendrá lugar en ${clinicName}, ${address}.`
    : `La cita tendrá lugar en ${clinicName}.`;

  // Presentación de marca solo en el primer mensaje; el cuerpo evita repetir "te escribimos".
  const intro = isFirstMessage
    ? `Hola ${firstName}, te escribimos desde la clínica Melosmile. `
    : `Hola ${firstName}, `;

  if (stage === 1) {
    const variations = [
      `${intro}pasamos a recordarte que tienes tu próxima cita programada para el ${fullDateLabel}.\n\n${clinicLine}\n\nPor favor, confírmanos tu asistencia en el siguiente enlace para tenerlo todo preparado:\n${confirmUrl}\n\nSi necesitas cambiar el horario, avísanos por aquí para reorganizarlo. Un saludo.`,
      `${intro}te recordamos que tu próxima cita está programada para el ${fullDateLabel}.\n\n${clinicLine}\n\nTe agradeceríamos que confirmes tu asistencia a través de este enlace:\n${confirmUrl}\n\nSi no te viene bien en esa fecha, dínoslo por este mismo chat para buscar otra opción. Un saludo.`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  if (stage === 2) {
    if (isConfirmed) {
      const variations = [
        `${intro}ya tenemos tu cita confirmada para pasado mañana, ${fullDateLabel}.\n\n${clinicLine}\n\nSi tienes cualquier duda antes de acudir o surge algún cambio imprevisto, escríbenos por aquí y lo gestionamos. Nos vemos pronto.`,
        `${intro}pasamos a recordarte tu cita confirmada de este ${dayOfWeek} (${fullDateLabel}).\n\n${clinicLine}\n\nSi necesitas cualquier aclaración antes de la cita, puedes avisarnos por este mensaje. Un saludo.`
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    } else {
      const variations = [
        `${intro}tu cita es en dos días (${fullDateLabel}) y todavía no tenemos tu confirmación.\n\n${clinicLine}\n\nPor favor, confírmanos si vas a poder asistir en este enlace:\n${confirmUrl}\n\nSi no puedes venir, no te preocupes, pero avísanos para poder reagendar tu cita en otro momento que te venga mejor y liberar el horario. Un saludo.`,
        `${intro}te recordamos que tienes tu cita reservada para el ${fullDateLabel}. Aún no nos consta tu confirmación.\n\n${clinicLine}\n\nPuedes confirmarla directamente aquí:\n${confirmUrl}\n\nSi te resulta imposible asistir, por favor dínoslo cuanto antes para ofrecerte un nuevo hueco y reorganizar la agenda. Gracias.`
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }
  }

  if (stage === 3) {
    if (isConfirmed) {
      const variations = [
        `${intro}te recordamos tu cita de hoy a las ${timeStr}.\n\n${clinicLine}\n\nSi surge cualquier imprevisto de última hora, escríbenos por aquí y lo gestionamos. Hasta luego.`,
        `${intro}te esperamos hoy para tu cita de las ${timeStr}.\n\n${clinicLine}\n\nSi tienes algún inconveniente de última hora para llegar a tiempo, por favor avísanos por este chat. Un saludo.`
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    } else {
      const variations = [
        `${intro}tienes tu cita prevista para hoy a las ${timeStr}.\n\n${clinicLine}\n\nComo no tenemos tu confirmación registrada, te pedimos por favor que si no puedes acudir nos avises por aquí lo antes posible para poder reorganizar la agenda de hoy. Gracias.`,
        `${intro}nos falta tu confirmación para tu cita de hoy a las ${timeStr}.\n\n${clinicLine}\n\nAl no haber recibido confirmación previa, si no vas a poder asistir te rogamos que nos lo indiques por este medio a la mayor brevedad. Un saludo.`
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }
  }

  return "";
}