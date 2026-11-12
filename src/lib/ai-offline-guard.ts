/**
 * Detector de conectividad para funciones de Inteligencia Artificial.
 * Aplica advertencia/bloqueo dinámico si se ejecuta en desarrollo local sin conexión a Internet.
 */

export interface AIConnectionCheck {
  canExecute: boolean;
  message?: string;
}

export function checkAIConnection(): AIConnectionCheck {
  const isLocal = process.env.NODE_ENV === 'development';

  // Si estamos en entorno local y el navegador detecta que no hay conexión a Internet
  if (isLocal && typeof window !== 'undefined' && !navigator.onLine) {
    return {
      canExecute: false,
      message: '📶 Se requiere conexión a Internet para utilizar las funciones de Inteligencia Artificial en el entorno local. La base de datos local sigue disponible.'
    };
  }

  return { canExecute: true };
}
