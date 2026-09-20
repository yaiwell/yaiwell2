import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Repositorio de las reservas vistas desde el lado del cliente.
 *
 * Solo acceso a datos: ninguna regla de negocio vive aquí (§6.bis).
 */
export const customerBookingsRepository = {
  /**
   * Devuelve todas las reservas de un cliente con las relaciones que
   * necesita la vista ya resueltas.
   *
   * Un único `findMany` con `select` anidado en lugar de N consultas
   * por reserva: la página pinta las tres secciones a la vez, así que
   * un cliente con 40 reservas generaría 120 viajes extra a BD.
   *
   * `review` se pide solo como `{ id }` — únicamente interesa saber si
   * existe, no su contenido.
   *
   * @param clientId — `User.id` del cliente autenticado. El filtro por
   *   `clientId` es la frontera de seguridad de esta pantalla.
   */
  async findByClientId(clientId: string) {
    return prisma.booking.findMany({
      where: { clientId },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        priceCents: true,
        notes: true,
        serviceId: true,
        service: { select: { name: true } },
        professional: { select: { name: true } },
        provider: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            address: true,
            photos: true,
          },
        },
        review: { select: { id: true } },
      },
      orderBy: { startAt: 'desc' },
    });
  },
};
