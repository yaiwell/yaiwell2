import 'server-only';

// Ruta directa: el barrel de bloqueos arrastra `booking` y `availability`.
import {
  blockSlotForCentreIncident,
  readSlotForCentreIncident,
} from '@/lib/services/schedule-blocks/schedule-blocks.incident';
import { retireOfferOfCancelledBooking } from '@/lib/services/slot-offers';

import type { IncidentRefundRow } from './checkout.incident-refund.repository';
import type { IncidentSlotState } from './checkout.incident-refund.types';
import { reportCheckoutWarning } from './checkout.payment-intent';

/**
 * Lo que cuelga de cancelar por incidencia, aparte del dinero: el centro no
 * puede atender, así que la hora no se debe vender. Todo es best effort: un
 * fallo aquí va a log y a Sentry y nunca frena la devolución.
 *
 * Es repetible: al reanudar un reembolso se vuelve a pasar por aquí, porque
 * la caída pudo ocurrir antes de estos pasos.
 *
 * @returns qué ha pasado con la franja, para contárselo a soporte y al centro.
 */
export async function applyIncidentSideEffects(
  row: IncidentRefundRow,
  adminUserId: string,
  now: Date,
): Promise<IncidentSlotState> {
  if (row.slotOfferId) await retireOffer(row.slotOfferId, row.id, now);
  if (row.startAt.getTime() <= now.getTime()) return 'not_applicable';
  return blockSlot(row, adminUserId, now);
}

/** Sin retirarla, la hora volvería a anunciarse sola con descuento. */
async function retireOffer(slotOfferId: string, bookingId: string, now: Date): Promise<void> {
  try {
    await retireOfferOfCancelledBooking(slotOfferId, now);
  } catch (err) {
    console.error('[checkout/incident-refund] failed to retire offer:', bookingId, err);
    reportCheckoutWarning('Incident refund could not retire its offer.', bookingId, 'error');
  }
}

async function blockSlot(
  row: IncidentRefundRow,
  adminUserId: string,
  now: Date,
): Promise<IncidentSlotState> {
  try {
    const blocked = await blockSlotForCentreIncident({
      providerId: row.providerId,
      professionalId: row.professionalId,
      startAt: row.startAt,
      endAt: row.endAt,
      createdBy: adminUserId,
      now,
    });
    if (blocked) return 'blocked';
    // Hay un cliente con cita en una hora que el centro dice no poder atender.
    reportCheckoutWarning(
      'Incident slot taken by another booking with the same professional; review it.',
      row.id,
      'error',
    );
    return 'taken';
  } catch (err) {
    console.error('[checkout/incident-refund] failed to block slot:', row.id, err);
    reportCheckoutWarning('Incident refund could not block the slot.', row.id, 'error');
    return 'not_blocked';
  }
}

/**
 * Estado actual de la franja, sin escribir: al repetir los avisos no se vuelve a
 * bloquear, porque el centro pudo quitar el bloqueo a propósito. Si la lectura
 * falla no se afirma nada sobre la franja.
 */
export async function readIncidentSlotState(
  row: IncidentRefundRow,
  now: Date,
): Promise<IncidentSlotState> {
  if (row.startAt.getTime() <= now.getTime()) return 'not_applicable';
  try {
    return await readSlotForCentreIncident(row.professionalId, row.startAt, row.endAt, now);
  } catch (err) {
    console.error('[checkout/incident-refund] failed to read slot:', row.id, err);
    return 'not_applicable';
  }
}
