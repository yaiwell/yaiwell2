import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Lectura de una reserva para la pantalla de confirmación.
 *
 * Va aparte del `checkout.service` porque no orquesta ningún cobro: sólo
 * responde "¿esta reserva es tuya y en qué estado está?" después de que
 * Stripe devuelva al usuario de un 3D Secure.
 */

/**
 * Datos mínimos que la confirmación necesita de la reserva. El resto
 * (nombre del centro, del servicio, precio) se resuelve reutilizando
 * `getProviderDetail`, que ya alimenta la ficha pública.
 */
export interface BookingConfirmationData {
  id: string;
  providerId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  status: string;
  /**
   * Importe congelado al crear la reserva, en céntimos. Es **el que se
   * cobra**, así que es el único que la confirmación debe enseñar: el
   * `Service.priceCents` que tiene el navegador puede haber cambiado
   * desde entonces o venir de una caché.
   */
  priceCents: number;
}

/**
 * Devuelve la reserva si pertenece al cliente indicado.
 *
 * La comprobación de titularidad es lo importante aquí: el `bookingId`
 * viaja en la query string de la URL de retorno de Stripe, así que
 * cualquiera podría probar ids ajenos. Devolvemos `null` (y la página
 * responde 404) en lugar de distinguir "no existe" de "no es tuya", para
 * no confirmar la existencia de reservas de terceros.
 *
 * @param bookingId — id que llega en la query de retorno.
 * @param clientUserId — `User.id` del usuario autenticado.
 */
export async function getBookingForConfirmation(
  bookingId: string,
  clientUserId: string,
): Promise<BookingConfirmationData | null> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, clientId: clientUserId },
    select: {
      id: true,
      providerId: true,
      serviceId: true,
      startAt: true,
      endAt: true,
      status: true,
      priceCents: true,
    },
  });
  return booking;
}
