/**
 * Avisos por email de Yaiwell. Todas las funciones **nunca lanzan**:
 * se llaman tras un cambio de estado ya guardado y un correo perdido no
 * debe convertirse en un error para quien pulsó el botón (ni en un 500
 * que haga a Stripe reintentar un webhook ya aplicado).
 */
import 'server-only';

import type { BookingStatus } from '@prisma/client';

import {
  buildBookingCancelledEmail,
  buildBookingConfirmedEmail,
  buildLatePaymentRefundedEmail,
  buildProviderNewBookingEmail,
  buildReviewInviteEmail,
} from './notifications.booking-templates';
import { deliverEmail, reportNotificationFailure } from './notifications.delivery';
import {
  buildBookingReminderEmail,
  buildRefundCompletedEmail,
} from './notifications.followup-templates';
import { notificationsRepository } from './notifications.repository';
import type {
  BookingEmailContext,
  CancellationRefundState,
  ProviderEmailContext,
} from './notifications.types';
import {
  buildProviderApprovedEmail,
  buildProviderRejectedEmail,
} from './notifications.verification-templates';

/**
 * Carga la reserva y ejecuta el envío; si la lectura falla o la reserva
 * no existe, lo registra y no hace nada más.
 */
async function withBooking(
  kind: string,
  bookingId: string,
  expected: BookingStatus[],
  send: (ctx: BookingEmailContext) => Promise<unknown>,
): Promise<void> {
  try {
    const ctx = await notificationsRepository.findBookingContext(bookingId);
    if (!ctx) {
      reportNotificationFailure(kind, bookingId, new Error('booking not found'));
      return;
    }
    // El correo sale tras responder: si entre medias otra acción movió la
    // reserva (el centro canceló justo al confirmarse el pago), contar el
    // estado viejo confundiría al cliente.
    if (!expected.includes(ctx.status)) {
      console.warn(`[notifications] ${kind} skipped for ${bookingId}: status ${ctx.status}`);
      return;
    }
    await send(ctx);
  } catch (err) {
    reportNotificationFailure(kind, bookingId, err);
  }
}

/**
 * Reserva pagada y confirmada: recibo al cliente y aviso al negocio.
 *
 * @param bookingId — reserva que acaba de pasar a `confirmed`.
 */
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  await withBooking('booking-confirmed', bookingId, ['confirmed'], (ctx) =>
    Promise.all([
      deliverEmail(
        'booking-confirmed-client',
        bookingId,
        ctx.client,
        buildBookingConfirmedEmail(ctx),
      ),
      deliverEmail('booking-new-provider', bookingId, ctx.owner, buildProviderNewBookingEmail(ctx)),
    ]),
  );
}

/**
 * El centro canceló la reserva: aviso al cliente con el estado del reembolso.
 *
 * @param refund — resultado del reembolso al cancelar.
 */
export async function notifyBookingCancelledByProvider(
  bookingId: string,
  refund: CancellationRefundState,
): Promise<void> {
  await withBooking('booking-cancelled', bookingId, ['cancelled', 'refunded'], (ctx) =>
    deliverEmail(
      'booking-cancelled',
      bookingId,
      ctx.client,
      buildBookingCancelledEmail(ctx, refund),
    ),
  );
}

/** Cita finalizada: invitación a valorar (desbloqueada por `completed`). */
export async function notifyBookingCompleted(bookingId: string): Promise<void> {
  await withBooking('review-invite', bookingId, ['completed'], (ctx) =>
    deliverEmail('review-invite', bookingId, ctx.client, buildReviewInviteEmail(ctx)),
  );
}

/**
 * Pago tardío reembolsado: la reserva no se confirmó y el dinero vuelve.
 *
 * @param refund — desenlace del reembolso emitido en ese webhook.
 */
export async function notifyLatePaymentRefunded(
  bookingId: string,
  refund: 'issued' | 'failed',
): Promise<void> {
  await withBooking('late-payment-refund', bookingId, ['cancelled', 'refunded'], (ctx) =>
    deliverEmail(
      'late-payment-refund',
      bookingId,
      ctx.client,
      buildLatePaymentRefundedEmail(ctx, refund === 'issued' ? 'refunded' : 'refund_pending'),
    ),
  );
}

/**
 * Reembolso completado después de quedarse en la cola de fallidos. Lo
 * normal es que el cliente tuviera un aviso de «en trámite»; si el fallo
 * fue asíncrono tras un «te devolvemos», le llega como confirmación.
 *
 * @param bookingId — reserva cuyo reembolso acaba de salir.
 */
export async function notifyRefundCompleted(bookingId: string): Promise<void> {
  // Tras un reintento desde /admin la reserva sigue `cancelled` hasta que
  // llega `charge.refunded`; ambos caminos comparten clave y no duplican.
  await withBooking('refund-completed', bookingId, ['cancelled', 'refunded'], (ctx) =>
    deliverEmail('refund-completed', bookingId, ctx.client, buildRefundCompletedEmail(ctx)),
  );
}

/**
 * Recordatorio de la cita del día siguiente (lo lanza el cron diario).
 *
 * @param bookingId — reserva confirmada que empieza mañana.
 */
export async function notifyBookingReminder(bookingId: string): Promise<void> {
  await withBooking('booking-reminder', bookingId, ['confirmed'], (ctx) =>
    deliverEmail('booking-reminder', bookingId, ctx.client, buildBookingReminderEmail(ctx)),
  );
}

/** Igual que `withBooking`, para los avisos sobre un negocio. */
async function withProvider(
  kind: string,
  providerId: string,
  send: (ctx: ProviderEmailContext) => Promise<unknown>,
): Promise<void> {
  try {
    const ctx = await notificationsRepository.findProviderContext(providerId);
    if (!ctx) {
      reportNotificationFailure(kind, providerId, new Error('provider not found'));
      return;
    }
    await send(ctx);
  } catch (err) {
    reportNotificationFailure(kind, providerId, err);
  }
}

/**
 * Negocio aprobado en la cola de verificación.
 *
 * @param decisionId — `VerificationRequest` de esta decisión: la clave de
 *   idempotencia va por decisión, así que una nueva aprobación tras un
 *   rechazo sí llega aunque sea el mismo día.
 */
export async function notifyProviderApproved(
  providerId: string,
  decisionId: string,
): Promise<void> {
  await withProvider('provider-approved', providerId, (ctx) =>
    deliverEmail('provider-approved', decisionId, ctx.owner, buildProviderApprovedEmail(ctx)),
  );
}

/**
 * Negocio rechazado, con el motivo. La clave va por decisión: un segundo
 * rechazo (aunque repita el motivo) sí debe llegar.
 */
export async function notifyProviderRejected(
  providerId: string,
  decisionId: string,
  notes: string,
): Promise<void> {
  await withProvider('provider-rejected', providerId, (ctx) =>
    deliverEmail(
      'provider-rejected',
      decisionId,
      ctx.owner,
      buildProviderRejectedEmail(ctx, notes),
    ),
  );
}
