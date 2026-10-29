/**
 * Repositorio de reservas.
 *
 * Capa fina sobre Prisma: solo lectura/escritura, ninguna regla de
 * negocio. La validación de antelación, autoría y estados vive en
 * `booking.service.ts`. Mantener este split simplifica los tests: el
 * service mockea este repositorio, el repositorio mockea Prisma.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import { activeBookingWhere } from './booking.hold';
import type { BookingStatus } from './booking.types';

/**
 * Campos opcionales que acompañan a un cambio de estado.
 *
 * Mantenemos un set acotado para evitar que el repository acabe
 * recibiendo cualquier columna de la tabla; si en el futuro hace
 * falta otra, se añade aquí explícitamente.
 */
export interface UpdateStatusExtraFields {
  cancelledAt?: Date;
  completedAt?: Date;
  /** Confirmación del reembolso por Stripe (`charge.refunded`). */
  refundedAt?: Date;
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
  /** Hueco liberado con el que se reserva y descuento congelado. */
  slotOfferId?: string | null;
  originalPriceCents?: number | null;
  discountPct?: number | null;
  /** Instante de creación; lo fija el servicio para usar un solo reloj. */
  createdAt?: Date;
}

/** Cliente de BD: el global o el de una transacción en curso. */
type Db = typeof prisma | Prisma.TransactionClient;

export const bookingRepository = {
  /**
   * Bloqueo por profesional hasta el fin de la transacción `tx`.
   *
   * Serializa todo lo que decide si una franja queda ocupada (crear una
   * reserva, confirmar un pago tardío): con él dos caminos no pueden
   * ver la franja libre a la vez. Es de transacción, así que funciona con
   * el pooler en modo transacción de producción.
   */
  async lockProfessional(tx: Prisma.TransactionClient, professionalId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId}))`;
  },

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
   * solape con `[start, end)`. "Activa" = `confirmed` o `pending` dentro
   * de la ventana de retención (ver `booking.hold.ts`): una `pending`
   * abandonada deja de bloquear sin esperar al cron.
   *
   * Condición de solape clásica: A.start < B.end && A.end > B.start.
   *
   * @param now — instante de referencia para la retención; inyectable en tests.
   * @param db — cliente de una transacción, para leer bajo su bloqueo.
   */
  async findOverlapping(
    professionalId: string,
    start: Date,
    end: Date,
    now: Date = new Date(),
    db: Db = prisma,
  ) {
    return db.booking.findMany({
      where: {
        professionalId,
        ...activeBookingWhere(now),
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });
  },

  /**
   * Crea una reserva en estado `pending`. Stripe la pasará a
   * `confirmed` desde el webhook tras el pago.
   */
  async create(data: CreateBookingData, db: Db = prisma) {
    return db.booking.create({
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
        slotOfferId: data.slotOfferId ?? null,
        originalPriceCents: data.originalPriceCents ?? null,
        discountPct: data.discountPct ?? null,
        ...(data.createdAt && { createdAt: data.createdAt }),
        status: 'pending',
      },
    });
  },

  /**
   * Cancela la reserva solo si sigue activa (`pending` o `confirmed`).
   *
   * Escritura condicional: si entre la lectura del servicio y este
   * `UPDATE` otro camino la movió (el centro y el cliente cancelando a
   * la vez, el webhook pasándola a `refunded`), no se pisa ese estado y
   * el caller recibe 0 filas. Así nunca se liquida el pago ni se avisa
   * dos veces por la misma cancelación.
   *
   * @returns número de filas cambiadas (0 o 1).
   */
  async cancelIfActive(id: string, cancelledAt: Date): Promise<number> {
    const { count } = await prisma.booking.updateMany({
      where: { id, status: { in: ['pending', 'confirmed'] } },
      data: { status: 'cancelled', cancelledAt },
    });
    return count;
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
        ...(extraFields?.refundedAt ? { refundedAt: extraFields.refundedAt } : {}),
      },
    });
  },
};
