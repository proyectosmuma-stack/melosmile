export type ReminderStage = 1 | 2 | 3;

export interface ReminderCopyParams {
  stage: ReminderStage;
  isConfirmed: boolean;
  isFirstMessage: boolean;
  firstName: string;
  fullDateLabel: string;
  timeStr: string;
  reason: string;
  confirmUrl: string;
  dayOfWeek: string;
}

/**
 * Retorna una variación de copy aleatoria y adecuada al estado de la cita,
 * garantizando que no haya emojis, manteniendo un tono profesional, 
 * sin marcas de género y aplicando un saludo de presentación si es el primer mensaje.
 */
export function resolveReminderCopy(params: ReminderCopyParams): string {
  const { stage, isConfirmed, isFirstMessage, firstName, fullDateLabel, timeStr, reason, confirmUrl, dayOfWeek } = params;

  // Presentación si es el primer mensaje que se envía al paciente
  const intro = isFirstMessage 
    ? `Hola ${firstName}, te escribimos de Melosmile. `
    : `Hola ${firstName}, `;

  const introSinHola = isFirstMessage 
    ? `Buenos días, ${firstName}. Te escribimos desde la clínica Melosmile. `
    : `Buenos días, ${firstName}. `;

  if (stage === 1) {
    const variations = [
      `${intro}te escribimos para recordarte que tienes cita de ${reason} programada para el ${fullDateLabel}.\n\nPor favor, confírmanos tu asistencia en el siguiente enlace para tenerlo todo preparado:\n${confirmUrl}\n\nSi necesitas cambiar el horario, avísanos por aquí para reorganizarlo. Un saludo.`,
      
      `${intro}pasamos a recordarte tu próxima cita para ${reason} el ${fullDateLabel}.\n\nTe agradeceríamos que confirmes tu asistencia a través de este enlace:\n${confirmUrl}\n\nSi no te viene bien en esa fecha, dínoslo por este mismo chat para buscar otra opción. Un saludo.`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  if (stage === 2) {
    if (isConfirmed) {
      const variations = [
        `${intro}ya tenemos tu cita confirmada para pasado mañana, ${fullDateLabel}.\n\nSi tienes cualquier duda antes de acudir o surge algún cambio imprevisto, escríbenos por aquí y lo gestionamos. Nos vemos pronto.`,
        
        `${intro}paso a recordarte tu cita confirmada de este ${dayOfWeek} (${fullDateLabel}).\n\nSi necesitas cualquier aclaración antes de la consulta, puedes avisarnos por este mensaje. Un saludo.`
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    } else {
      const variations = [
        `${intro}tu cita para ${reason} es en dos días (${fullDateLabel}) y todavía no tenemos tu confirmación.\n\nPor favor, confírmanos si vas a poder asistir en este enlace:\n${confirmUrl}\n\nSi no puedes venir, no te preocupes, pero avísanos para poder reagendar tu cita en otro momento que te venga mejor y liberar el horario. Un saludo.`,
        
        `${intro}te recordamos que tienes cita reservada para el ${fullDateLabel}. Aún no nos consta tu confirmación.\n\nPuedes confirmarla directamente aquí:\n${confirmUrl}\n\nSi te resulta imposible asistir, por favor dínoslo cuanto antes para ofrecerte un nuevo hueco y reorganizar la agenda. Gracias.`
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }
  }

  if (stage === 3) {
    if (isConfirmed) {
      const variations = [
        `${introSinHola}Te recordamos tu cita de hoy a las ${timeStr}.\n\nSi surge cualquier imprevisto de última hora, escríbenos por aquí y lo gestionamos. Hasta luego.`,
        
        `${introSinHola}Te esperamos hoy en la clínica para tu cita de las ${timeStr}.\n\nSi tienes algún inconveniente de última hora para llegar a tiempo, por favor avísanos por este chat. Un saludo.`
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    } else {
      const variations = [
        `${introSinHola}Tienes cita prevista para hoy a las ${timeStr}. Como no tenemos tu confirmación registrada, te pedimos por favor que si no puedes acudir nos avises por aquí lo antes posible para poder reorganizar la agenda de hoy. Gracias.`,
        
        `${introSinHola}Te escribimos respecto a tu cita programada para hoy a las ${timeStr}. Al no haber recibido confirmación previa, si no vas a poder asistir te rogamos que nos lo indiques por este medio a la mayor brevedad. Un saludo.`
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }
  }

  return "";
}
