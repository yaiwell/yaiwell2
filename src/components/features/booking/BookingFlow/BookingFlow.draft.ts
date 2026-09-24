'use client';

import { isSlotStillBookable } from '@/lib/utils/booking-lead-time';

import type { BookingDraft, PersistedBookingDraft } from './BookingFlow.types';

/**
 * Persistencia del borrador de reserva en `sessionStorage`.
 *
 * Existe por un agujero de embudo concreto: el usuario anónimo elegía
 * hueco, escribía notas y **sólo en el paso de pago** descubría que
 * necesitaba cuenta. Al volver de `/entrar` el flujo arrancaba en blanco
 * y había que rehacerlo todo. Ahora el trabajo sobrevive al viaje.
 *
 * Mismo criterio que el wizard de onboarding (`onboarding.draft.ts`):
 * `sessionStorage` y no `localStorage`, porque un borrador debe morir al
 * cerrar la ventana y no puede quedar visible para la siguiente persona
 * que use el mismo navegador.
 *
 * **No se persiste el `bookingId`**: es estado de servidor y pertenece a
 * un cliente concreto. Restaurarlo tras autenticarse con otra cuenta
 * haría al flujo apuntar a una reserva ajena. El hueco y las notas son
 * intención del usuario; la reserva la vuelve a crear el servidor.
 */

/** Clave única del borrador. El sufijo `.v1` permite migrar el formato. */
export const BOOKING_DRAFT_STORAGE_KEY = 'yaiwell.booking.draft.v1';

/** Retardo del debounce de escritura, en milisegundos. */
const SAVE_DEBOUNCE_MS = 300;

/** Handle del `setTimeout` pendiente del debounce. */
let pendingSaveHandle: ReturnType<typeof setTimeout> | null = null;

/**
 * Resultado de intentar restaurar un borrador.
 *
 * `slotExpired` distingue "no había nada guardado" de "había un hueco y
 * ya no sirve", que es lo que la UI necesita para avisar en vez de
 * devolver al usuario al calendario sin explicación.
 */
export interface RestoredBookingDraft {
  draft: BookingDraft;
  slotExpired: boolean;
}

/**
 * Lee el borrador guardado para un servicio concreto.
 *
 * @param serviceId — servicio del flujo actual. Un borrador de otro
 *   servicio se descarta: su hueco y sus notas no aplican aquí.
 * @returns el borrador, o `null` si no hay, no es del mismo servicio o
 *   el JSON está corrupto.
 */
export function loadBookingDraft(serviceId: string): PersistedBookingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedBookingDraft>;
    if (parsed?.serviceId !== serviceId) return null;
    return {
      serviceId,
      slotStartIso: typeof parsed.slotStartIso === 'string' ? parsed.slotStartIso : null,
      slotEndIso: typeof parsed.slotEndIso === 'string' ? parsed.slotEndIso : null,
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    };
  } catch {
    // Storage bloqueado (incógnito estricto, cuota) o JSON inválido: lo
    // tratamos como ausencia de borrador.
    return null;
  }
}

/**
 * Restaura el borrador ya saneado contra el reloj.
 *
 * Entre que el usuario se va a registrarse y vuelve pueden pasar
 * minutos, así que el hueco guardado puede haber caducado. Lo
 * descartamos aquí —conservando las notas, que sí siguen valiendo— para
 * que la UI pueda avisar en lugar de mandar al servidor una reserva
 * condenada y devolver un error genérico.
 *
 * Ojo con lo que este chequeo **no** cubre: que otro cliente haya
 * cogido el hueco. Eso sólo lo sabe el servidor, y llega como
 * `SLOT_UNAVAILABLE` al abrir el checkout.
 *
 * @param serviceId — servicio del flujo actual.
 * @param now — momento de referencia; parametrizable para tests.
 */
export function restoreBookingDraft(
  serviceId: string,
  now: Date = new Date(),
): RestoredBookingDraft | null {
  const persisted = loadBookingDraft(serviceId);
  if (!persisted) return null;

  const hasSlot = persisted.slotStartIso !== null && persisted.slotEndIso !== null;
  const slotUsable = hasSlot && isSlotStillBookable(persisted.slotStartIso as string, now);

  return {
    draft: {
      slotStartIso: slotUsable ? persisted.slotStartIso : null,
      slotEndIso: slotUsable ? persisted.slotEndIso : null,
      notes: persisted.notes,
      bookingId: null,
    },
    slotExpired: hasSlot && !slotUsable,
  };
}

/**
 * Guarda el borrador con debounce: las llamadas dentro de
 * `SAVE_DEBOUNCE_MS` se colapsan en una sola escritura (el textarea de
 * notas dispara una por pulsación).
 */
export function saveBookingDraft(serviceId: string, draft: BookingDraft): void {
  if (typeof window === 'undefined') return;
  if (pendingSaveHandle !== null) {
    clearTimeout(pendingSaveHandle);
  }
  const payload: PersistedBookingDraft = {
    serviceId,
    slotStartIso: draft.slotStartIso,
    slotEndIso: draft.slotEndIso,
    notes: draft.notes,
  };
  pendingSaveHandle = setTimeout(() => {
    pendingSaveHandle = null;
    try {
      window.sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Silencioso: como mucho se pierde el borrador al refrescar, que
      // es exactamente el comportamiento anterior a esta pieza.
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Borra el borrador. Se llama al alcanzar la confirmación: a partir de
 * ahí la reserva vive en BD y arrastrar el borrador haría que volver a
 * `/reservar` reabriera un hueco ya comprado.
 */
export function clearBookingDraft(): void {
  if (typeof window === 'undefined') return;
  if (pendingSaveHandle !== null) {
    clearTimeout(pendingSaveHandle);
    pendingSaveHandle = null;
  }
  try {
    window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
  } catch {
    // Mismo razonamiento que en `saveBookingDraft`.
  }
}
