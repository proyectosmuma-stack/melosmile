export function isValidStatus(status: string): boolean {
  const allowedStatuses = ['pendiente', 'enviado', 'error', 'leido', 'cancelado'];
  return allowedStatuses.includes(status.toLowerCase());
}

export function validateDateRange(targetDate: Date, referenceDate: Date = new Date()): boolean {
  const nextWeek = new Date(referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  return targetDate >= referenceDate && targetDate <= nextWeek;
}
