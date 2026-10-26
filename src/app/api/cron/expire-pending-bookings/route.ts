import { NextResponse, type NextRequest } from 'next/server';

import { expireAbandonedPendingBookings } from '@/lib/services/checkout';
import { verifyCronAuthorization } from '@/lib/utils/cron-auth';

/**
 * Cron diario de caducidad de reservas `pending` abandonadas.
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
 * - 200 con el resumen `{ scanned, expired, skipped, failed }`. Los
 *   fallos por reserva van dentro del resumen, no como 500: se
 *   reintentan solos al día siguiente.
 * - 500 solo si falla la consulta inicial (BD caída).
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

  try {
    const summary = await expireAbandonedPendingBookings();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error('[cron/expire-pending-bookings] expiry sweep failed:', error);
    return NextResponse.json({ error: 'Expiry sweep failed.' }, { status: 500 });
  }
}
