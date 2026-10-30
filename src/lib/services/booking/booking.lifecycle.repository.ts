/**
 * Escrituras del cierre de una reserva: completar, «no presentado» y su
 * deshacer, y la cola de comisiones de las reservas en el local
 * (CLAUDE.md §4.bis, migración 9f).
 *
 * Todas las transiciones son **condicionales al estado de partida**
 * (`updateMany where { id, status }`): si dos caminos compiten (el
 * negocio marca «no presentado» mientras el cron completa), solo uno
 * escribe y el otro recibe 0 filas. Sin reglas de negocio: las decide
 * el servicio.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

/** Cliente de BD: el global o el de una transacción en curso. */
type Db = typeof prisma | Prisma.TransactionClient;

/** Estados desde los que se puede completar: el normal y el «deshacer» tardío. */
type CompletableFrom = 'confirmed' | 'no_show';

export const bookingLifecycleRepository = {
  /**
   * `from` → `completed` con `completedAt`. Al venir de `no_show` limpia
   * su marca: la reserva se dio por prestada.
   * @returns filas cambiadas (0 o 1).
   */
  async complete(id: string, from: CompletableFrom, completedAt: Date, db: Db = prisma) {
    const { count } = await db.booking.updateMany({
      where: { id, status: from },
      data: {
        status: 'completed',
        completedAt,
        ...(from === 'no_show' && { noShowAt: null, noShowMarkedBy: null }),
      },
    });
    return count;
  },

  /**
   * `confirmed` → `no_show` con quién y cuándo.
   * @returns filas cambiadas (0 o 1).
   */
  async markNoShow(id: string, noShowAt: Date, markedBy: string, db: Db = prisma) {
    const { count } = await db.booking.updateMany({
      where: { id, status: 'confirmed' },
      data: { status: 'no_show', noShowAt, noShowMarkedBy: markedBy },
    });
    return count;
  },

  /**
   * `no_show` → `confirmed`, borrando la marca. Puede violar la exclusión
   * de solapes (23P01) si la franja se volvió a vender entretanto.
   * @returns filas cambiadas (0 o 1).
   */
  async revertNoShow(id: string, db: Db = prisma) {
    const { count } = await db.booking.updateMany({
      where: { id, status: 'no_show' },
      data: { status: 'confirmed', noShowAt: null, noShowMarkedBy: null },
    });
    return count;
  },

  /**
   * Encola la comisión de una reserva en el local completada (status
   * `pending`). Va en la misma transacción que el paso a `completed`:
   * el `UPDATE` condicional ya serializa a quien completa, así que no
   * puede haber dos inserciones; el `UNIQUE (bookingId)` es la red.
   *
   * @returns id de la fila, para `itemizeCommission(chargeId)`.
   */
  async enqueueOnsiteCommission(
    data: { bookingId: string; providerId: string; amountCents: number },
    db: Db = prisma,
  ): Promise<string> {
    const row = await db.onsiteCommissionCharge.create({
      data: { ...data, status: 'pending' },
      select: { id: true },
    });
    return row.id;
  },

  /**
   * Reservas en el local aún `confirmed` cuyo inicio es anterior a
   * `cutoff` (estricto), de la más antigua a la más reciente.
   */
  async findStaleOnsiteConfirmed(cutoff: Date, limit: number, db: Db = prisma) {
    return db.booking.findMany({
      where: { paymentMode: 'onsite', status: 'confirmed', startAt: { lt: cutoff } },
      select: { id: true, providerId: true, commissionCents: true, paymentMode: true },
      orderBy: { startAt: 'asc' },
      take: limit,
    });
  },

  /** Relee el estado actual (tras una escritura condicional con 0 filas). */
  async findStatus(id: string, db: Db = prisma) {
    return db.booking.findUnique({ where: { id }, select: { status: true } });
  },
};
