/** Ruta del calendario del panel. */
export const CALENDAR_PATH = '/panel/calendario';

/** Destino de un enlace del calendario, en el formato del `Link` de next-intl. */
export interface CalendarHref {
  pathname: typeof CALENDAR_PATH;
  query: Record<string, string>;
}

/**
 * Enlace al calendario conservando el estado de la URL: la semana viaja
 * en `?semana=` (clave del lunes) y el profesional del filtro en
 * `?pro=`. Lo que no se pasa no se escribe: la URL limpia es «semana
 * actual, todo el equipo».
 */
export function calendarHref({
  week,
  professionalId,
}: {
  week?: string | null;
  professionalId?: string | null;
}): CalendarHref {
  const query: Record<string, string> = {};
  if (week) query.semana = week;
  if (professionalId) query.pro = professionalId;
  return { pathname: CALENDAR_PATH, query };
}
