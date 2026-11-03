// Import directo del archivo client-safe, nunca del barrel
// `@/lib/services/availability` (arrastraría Prisma al bundle).
import {
  AvailabilitySlotsRequestError,
  buildServiceSlotsUrl,
  type BookingSlot,
  type SlotsResponse,
} from '@/lib/services/availability/availability.client';

/**
 * Petición de huecos del SlotPicker con el profesional elegido.
 *
 * Envuelve `buildServiceSlotsUrl` (cliente de `availability`, que no es
 * de esta pieza) añadiendo `&professionalId=` cuando el cliente ha
 * elegido profesional: sin él, el endpoint devuelve la unión de huecos
 * del equipo («cualquiera disponible»). Mismo contrato de errores que
 * `fetchServiceSlots`: lista vacía = no hay hueco; excepción = no se
 * pudo consultar o (404) no se puede reservar con esa agenda.
 *
 * TODO: mover a `availability.client.ts` cuando esa pieza admita el
 * parámetro; aquí solo para no tocar el módulo de disponibilidad.
 */

/**
 * URL del endpoint de huecos para un día y, opcionalmente, un profesional.
 *
 * @param serviceId — servicio a consultar.
 * @param dateKey — día en formato `YYYY-MM-DD`.
 * @param professionalId — profesional elegido; `null` = «cualquiera».
 */
export function buildSlotsUrl(
  serviceId: string,
  dateKey: string,
  professionalId: string | null,
): string {
  const base = buildServiceSlotsUrl(serviceId, dateKey);
  return professionalId ? `${base}&professionalId=${encodeURIComponent(professionalId)}` : base;
}

/**
 * Pide los huecos de un día para el profesional elegido (o el equipo).
 *
 * @throws AvailabilitySlotsRequestError si la respuesta no es OK.
 */
export async function fetchSlotsForProfessional(
  serviceId: string,
  dateKey: string,
  professionalId: string | null,
  signal?: AbortSignal,
): Promise<BookingSlot[]> {
  const response = await fetch(buildSlotsUrl(serviceId, dateKey, professionalId), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new AvailabilitySlotsRequestError(
      payload?.error?.message ?? `Availability API responded ${response.status}`,
      response.status,
      payload?.error?.code,
    );
  }
  const json = (await response.json()) as SlotsResponse;
  return json.slots;
}

/**
 * Clave de caché de TanStack Query de los huecos de un día. El
 * profesional forma parte de la clave: cambiarlo pide (y cachea) otra
 * agenda en vez de reutilizar la del equipo.
 */
export function slotsQueryKey(serviceId: string, dateKey: string, professionalId: string | null) {
  return ['availability', serviceId, dateKey, professionalId ?? 'any'] as const;
}
