import { z } from 'zod';

/**
 * Validación del parámetro `?slot=ISO` de `/centro/{slug}-{id}/reservar`.
 *
 * Lo ponen las etiquetas «Hueco liberado · −20 % · 17:00» de búsqueda,
 * mapa y ficha para que el flujo abra en el día del hueco y lo deje
 * elegido. Es solo una preferencia de navegación: no fija precio ni
 * reserva nada, así que un valor inválido se ignora en vez de dar 404.
 */

/** Nombre del parámetro de query. */
export const SLOT_PARAM = 'slot';

/**
 * Instante ISO-8601 con zona (`Z` u offset). Rechaza fechas sueltas y
 * horas sin zona: «17:00» sin zona es ambiguo entre el navegador y el
 * centro.
 */
export const slotParamSchema = z.iso.datetime({ offset: true });

/**
 * Normaliza el `?slot=` crudo a un ISO UTC, o `null` si falta o no vale.
 *
 * Si llega repetido (`?slot=a&slot=b`) se toma el primero, igual que
 * el `serviceId` de la misma página.
 *
 * @param raw — valor tal y como lo entrega `searchParams`.
 */
export function parseSlotParam(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = slotParamSchema.safeParse(value);
  if (!parsed.success) return null;
  return new Date(parsed.data).toISOString();
}
