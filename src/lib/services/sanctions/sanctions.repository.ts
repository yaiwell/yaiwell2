/**
 * Repositorio de sanciones: solo lectura/escritura vía Prisma.
 *
 * Las escrituras que acompañan a un cambio de estado de la reserva
 * (marcar o deshacer «no presentado») aceptan el cliente de la
 * transacción del servicio de booking, para que reserva y sanción cambien
 * juntas o no cambien.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import type { SanctionReason } from './sanctions.types';

/** Cliente de BD: el global o el de una transacción en curso. */
type Db = typeof prisma | Prisma.TransactionClient;

/** Datos de una sanción nueva por no presentado. */
export interface NoShowSanctionData {
  userId: string;
  bookingId: string;
  /** Inicio de la reserva: es lo que cuenta para la ventana de 12 meses. */
  occurredAt: Date;
}

/** Datos de una revocación. */
export interface SanctionRevocation {
  revokedAt: Date;
  /** `User.id` interno de quien revoca (negocio o soporte). */
  revokedBy: string;
  revokeReason: string;
}

const NO_SHOW_REASON: SanctionReason = 'no_show';

export const sanctionsRepository = {
  /**
   * Sanciones no revocadas de un usuario desde `since`. Usa el índice
   * parcial `client_sanctions_active_user_occurred_idx` (migración 9f).
   */
  async findActiveSince(userId: string, since: Date, db: Db = prisma) {
    return db.clientSanction.findMany({
      where: { userId, revokedAt: null, occurredAt: { gte: since } },
      select: { occurredAt: true, revokedAt: true },
      orderBy: { occurredAt: 'asc' },
    });
  },

  /** Sanciones no revocadas de un usuario, de la más reciente a la más antigua. */
  async listActive(userId: string, db: Db = prisma) {
    return db.clientSanction.findMany({
      where: { userId, revokedAt: null },
      select: { id: true, bookingId: true, reason: true, occurredAt: true, createdAt: true },
      orderBy: { occurredAt: 'desc' },
    });
  },

  /**
   * Deja vigente la sanción por no presentado de una reserva.
   *
   * `INSERT … ON CONFLICT ("bookingId") DO NOTHING` (`skipDuplicates`):
   * marcar dos veces no crea dos sanciones. Si ya existía revocada (el
   * negocio deshizo el no presentado y lo vuelve a marcar), se reactiva:
   * sin esto el segundo marcado quedaría sin sanción.
   *
   * @returns `true` si la sanción ha pasado a estar vigente con esta
   *   llamada (creada o reactivada); `false` si ya lo estaba.
   */
  async activateNoShowSanction(data: NoShowSanctionData, db: Db = prisma): Promise<boolean> {
    const { count } = await db.clientSanction.createMany({
      data: [{ ...data, reason: NO_SHOW_REASON }],
      skipDuplicates: true,
    });
    if (count > 0) return true;
    const reactivated = await db.clientSanction.updateMany({
      where: { bookingId: data.bookingId, revokedAt: { not: null } },
      data: {
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        occurredAt: data.occurredAt,
      },
    });
    return reactivated.count > 0;
  },

  /**
   * Revoca la sanción vigente de una reserva, si la hay.
   * @returns número de sanciones revocadas (0 o 1).
   */
  async revokeByBooking(
    bookingId: string,
    revocation: SanctionRevocation,
    db: Db = prisma,
  ): Promise<number> {
    const { count } = await db.clientSanction.updateMany({
      where: { bookingId, revokedAt: null },
      data: revocation,
    });
    return count;
  },

  /**
   * Revoca una sanción por id solo si sigue vigente (escritura condicional).
   * @returns número de sanciones revocadas (0 o 1).
   */
  async revokeById(
    sanctionId: string,
    revocation: SanctionRevocation,
    db: Db = prisma,
  ): Promise<number> {
    const { count } = await db.clientSanction.updateMany({
      where: { id: sanctionId, revokedAt: null },
      data: revocation,
    });
    return count;
  },

  async findById(sanctionId: string, db: Db = prisma) {
    return db.clientSanction.findUnique({
      where: { id: sanctionId },
      select: { id: true, userId: true, revokedAt: true },
    });
  },
};
