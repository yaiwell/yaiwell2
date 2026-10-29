import { NextResponse, type NextRequest } from 'next/server';

import {
  expireAbandonedPendingBookings,
  type BookingTransitionResult,
} from '@/lib/services/checkout';
import {
  notifyBookingConfirmed,
  notifyLatePaymentRefunded,
  scheduleNotification,
  sendTomorrowReminders,
} from '@/lib/services/notifications';
import { verifyCronAuthorization } from '@/lib/utils/cron-auth';

/**
 * Margen para los recordatorios, que se envían con pausa entre correos.
 * 60 s es el máximo del plan Hobby.
 */
export const maxDuration = 60;

/**
 * Cron diario: caducidad de reservas `pending` abandonadas y recordatorio
 * de las citas de mañana.
 *
 * El plan Hobby solo permite un cron al día, así que los dos trabajos
 * comparten ejecución (y ruta: cambiarla obligaría a tocar `vercel.json`).
 * Son independientes: si uno falla, el otro se ejecuta igual. El
 * recordatorio sale de madrugada, el día anterior a la cita.
 *
 * Programado en `vercel.json` con `0 3 * * *` (UTC): 04:00 en Madrid en
 * horario de invierno (CET) y 05:00 en verano (CEST). Madrugada en ambos
 * casos, con el tráfico de reservas en mínimos. En plan Hobby Vercel
 * solo permite una ejecución diaria y puede dispararla en cualquier
 * minuto de esa hora; no importa, porque las `pending` caducadas ya
 * dejan de bloquear franjas en el acto (ver `booking.hold.ts`) y esto
 * es solo limpieza.
 *
 * **Política de respuestas**:
 * - 501 si falta `CRON_SECRET`: sin secreto no hay forma segura de
 *   distinguir a Vercel de cualquier otro. El cuerpo es genérico para no
 *   revelar configuración; el detalle va solo al log.
 * - 401 si la cabecera `Authorization: Bearer <CRON_SECRET>` no coincide.
 * - 200 con el resumen `{ scanned, expired, settled, skipped, failed, reminders }`.
 *   Los fallos por reserva van dentro del resumen, no como 500: se
 *   reintentan solos al día siguiente.
 * - 500 solo si falla la consulta inicial de alguno de los dos (BD caída).
 *
 * GET porque es el método con el que invoca Vercel Cron. Al leer
 * cabeceras de la petición el handler es dinámico y nunca se cachea.
 */
export async function GET(request: NextRequest) {
  const auth = verifyCronAuthorization(request.headers.get('authorization'));
  if (auth === 'unconfigured') {
    console.error('[cron/expire-pending-bookings] CRON_SECRET is not configured.');
    return NextResponse.json({ error: 'Not implemented.' }, { status: 501 });
  }
  if (auth === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const [expiry, reminders] = await Promise.allSettled([
    expireAbandonedPendingBookings(),
    sendTomorrowReminders(),
  ]);
  if (expiry.status === 'rejected') {
    console.error('[cron/expire-pending-bookings] expiry sweep failed:', expiry.reason);
  }
  if (reminders.status === 'rejected') {
    console.error('[cron/expire-pending-bookings] reminder sweep failed:', reminders.reason);
  }
  if (expiry.status === 'rejected' || reminders.status === 'rejected') {
    return NextResponse.json({ error: 'Daily sweep failed.' }, { status: 500 });
  }
  // Las transiciones van a los avisos, no a la respuesta: el resumen es
  // solo recuento.
  const { settlements, ...expirySummary } = expiry.value;
  notifySettlements(settlements);
  return NextResponse.json({ ...expirySummary, reminders: reminders.value }, { status: 200 });
}

/**
 * Avisa al cliente de los pagos que el barrido ha asentado por haberse
 * perdido su webhook, con los mismos correos y criterios que el webhook
 * `payment_intent.succeeded`.
 *
 * Por qué un webhook que llegue después no repite el correo: hay dos
 * ventanas de 24 h encadenadas.
 *  - Durante 24 h, Stripe devuelve la respuesta cacheada de la clave
 *    `booking_refund_<id>` (`issued` otra vez, y por tanto `lateRefund`),
 *    pero Resend también recuerda 24 h la clave del aviso
 *    (`<kind>/<bookingId>`) y descarta el duplicado.
 *  - Pasadas las 24 h, la clave de Stripe ha caducado: un refund nuevo
 *    responde `charge_already_refunded` → `already_refunded`, que no
 *    lleva `lateRefund`, así que no se programa ningún aviso.
 * Si alguna de las dos ventanas cambia (otra clave de idempotencia en
 * los reembolsos o en los correos), revisar este razonamiento.
 * La confirmación no depende de esto: solo avisa con `changed: true`.
 */
function notifySettlements(settlements: BookingTransitionResult[]): void {
  for (const result of settlements) {
    if (result.changed && result.status === 'confirmed') {
      scheduleNotification(() => notifyBookingConfirmed(result.bookingId));
    }
    const { lateRefund } = result;
    if (lateRefund) {
      scheduleNotification(() => notifyLatePaymentRefunded(result.bookingId, lateRefund));
    }
  }
}
