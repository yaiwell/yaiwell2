/**
 * Cliente HTTP tipado para `GET /api/availability/services/{serviceId}`.
 *
 * Lo consume el `SlotPicker` (Client Component) y se reutilizará tal
 * cual desde la app móvil de Fase 2 cambiando la base URL.
 *
 * IMPORTANTE — punto de entrada client-safe:
 * este archivo se importa **directamente**, nunca a través de
 * `@/lib/services/availability` (el `index.ts` del módulo). Ese barrel
 * reexporta el service, que arrastra Prisma y con él `pg → dns/fs/net/tls`
 * al bundle del navegador y rompe el build. Por eso aquí no se importa
 * nada del service ni del repositorio: solo `fetch`, el DTO y la
 * constante de zona horaria (que es un string puro).
 *
 * Decisiones:
 *  - No exponemos `fetch` desnudo: una función tipada arma la URL para
 *    que el caller no manipule query strings a mano y el `queryKey` de
 *    TanStack Query pueda derivarse de los mismos argumentos.
 *  - Lanzamos `AvailabilitySlotsRequestError` con `status` y `code` para
 *    que la UI distinga un fallo real de un día sin huecos. Confundir
 *    ambas cosas es justo el bug que motivó este módulo.
 */

import { BUSINESS_TIMEZONE } from './availability.constants';

export { BUSINESS_TIMEZONE };

/**
 * Slot tal y como viaja por la API: instantes serializados a ISO para
 * poder cruzar la frontera Server/Client Component sin perder tipo.
 *
 * `available` es hoy siempre `true` porque el motor solo devuelve
 * huecos libres, pero lo mantenemos en el contrato para poder ofrecer
 * un día los ocupados (en gris, tachados) sin romper consumidores.
 */
export interface BookingSlot {
  /** ISO string del inicio del slot. */
  startAtIso: string;
  /** ISO string del fin (incluye la duración real del servicio). */
  endAtIso: string;
  /** `true` si el hueco es reservable. */
  available: boolean;
}

/** Respuesta OK del endpoint de slots. */
export interface SlotsResponse {
  slots: BookingSlot[];
  took: number;
}

/** Respuesta de error del endpoint de slots. */
interface SlotsErrorResponse {
  error: { code: string; message: string };
}

/**
 * Error de transporte o de servidor al pedir los huecos de un día.
 *
 * Tiparlo permite a la UI decidir (reintentar, avisar a soporte) sin
 * parsear el mensaje, y deja claro en el `catch` que un fallo aquí NO
 * significa "este centro no tiene hueco".
 */
export class AvailabilitySlotsRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status: number, code = 'AVAILABILITY_REQUEST_FAILED') {
    super(message);
    this.name = 'AvailabilitySlotsRequestError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Construye la URL del endpoint público de disponibilidad.
 *
 * Centralizada para que la URL de fetch y la `queryKey` de TanStack
 * Query se deriven de los mismos argumentos y no se desincronicen.
 *
 * @param serviceId — identificador del servicio a consultar.
 * @param dateKey — día en formato `YYYY-MM-DD`.
 */
export function buildServiceSlotsUrl(serviceId: string, dateKey: string): string {
  return `/api/availability/services/${encodeURIComponent(serviceId)}?date=${dateKey}`;
}

/**
 * Pide los huecos disponibles de un servicio para un día concreto.
 *
 * Devuelve lista vacía cuando el día no tiene huecos (respuesta 200 con
 * `slots: []`) y lanza cuando la petición falla. Esa distinción es la
 * que permite a la UI no mentir: vacío = "no hay hueco", excepción =
 * "no hemos podido consultarlo".
 *
 * @param serviceId — identificador del servicio.
 * @param dateKey — día en formato `YYYY-MM-DD`.
 * @param signal — señal de aborto que inyecta TanStack Query.
 * @throws AvailabilitySlotsRequestError si la respuesta no es OK.
 */
export async function fetchServiceSlots(
  serviceId: string,
  dateKey: string,
  signal?: AbortSignal,
): Promise<BookingSlot[]> {
  const response = await fetch(buildServiceSlotsUrl(serviceId, dateKey), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as SlotsErrorResponse | null;
    throw new AvailabilitySlotsRequestError(
      payload?.error?.message ?? `Availability API responded ${response.status}`,
      response.status,
      payload?.error?.code,
    );
  }

  const json = (await response.json()) as SlotsResponse;
  return json.slots;
}
