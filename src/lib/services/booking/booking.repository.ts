/**
 * Repositorio de reservas.
 *
 * Capa fina sobre Prisma: solo lectura/escritura, ninguna regla de
 * negocio. La validación de antelación, autoría y estados vive en
 * `booking.service.ts`. Mantener este split simplifica los tests: el
 * service mockea este repositorio, el repositorio mockea Prisma.
 */

import { prisma } from '@/lib/db/prisma';

import type { BookingStatus } from './booking.types';

/**
 * Campos opcionales que acompañan a un cambio de estado.
 *
 * Mantenemos un set acotado para evitar que el repository acabe
 * recibiendo cualquier columna de la tabla; si en el futuro hace
 * falta otra (p. ej. `refundedAt`), se añade aquí explícitamente.
 */
export interface UpdateStatusExtraFields {
  cancelledAt?: Date;
  completedAt?: Date;
}

/**
 * Datos crudos para insertar una reserva. El status arranca siempre
 * en `pending`: el paso a `confirmed` lo dispara Stripe vía webhook
 * cuando confirma el pago.
 */
export interface CreateBookingData {
  clientId: string;
  serviceId: string;
  professionalId: string;
  providerId: string;
  startAt: Date;
  endAt: Date;
  priceCents: number;
  commissionCents: number;
  notes?: string;
}

export const bookingRepository = {
  /**
   * Localiza una reserva por id incluyendo el `provider` para que el
   * servicio pueda comprobar la titularidad sin un segundo round-trip.
   */
  async findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: { provider: true },
    });
  },

  /**
   * Busca reservas activas de un profesional cuyo rango temporal
   * solape con `[start, end)`. Solo se consideran `pending` y
   * `confirmed`: las `cancelled` y `refunded` liberan el slot.
   *
   * Condición de solape clásica: A.start < B.end && A.end > B.start.
   */
  async findOverlapping(professionalId: string, start: Date, end: Date) {
    return prisma.booking.findMany({
      where: {
        professionalId,
        status: { in: ['pending', 'confirmed'] },
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });
  },

  /**
   * Crea una reserva en estado `pending`. Stripe la pasará a
   * `confirmed` desde el webhook tras el pago.
   */
  async create(data: CreateBookingData) {
    return prisma.booking.create({
      data: {
        clientId: data.clientId,
        serviceId: data.serviceId,
        professionalId: data.professionalId,
        providerId: data.providerId,
        startAt: data.startAt,
        endAt: data.endAt,
        priceCents: data.priceCents,
        commissionCents: data.commissionCents,
        notes: data.notes,
        status: 'pending',
      },
    });
  },

  /**
   * Actualiza el estado de una reserva y, opcionalmente, marca
   * `cancelledAt` o `completedAt`. Mantener ambos en la misma
   * transacción evita estados inconsistentes (status cambiado pero
   * timestamp olvidado).
   */
  async updateStatus(id: string, status: BookingStatus, extraFields?: UpdateStatusExtraFields) {
    return prisma.booking.update({
      where: { id },
      data: {
        status,
        ...(extraFields?.cancelledAt ? { cancelledAt: extraFields.cancelledAt } : {}),
        ...(extraFields?.completedAt ? { completedAt: extraFields.completedAt } : {}),
      },
    });
  },
};
