import 'server-only';

import { prisma } from '@/lib/db/prisma';

import type { VerificationStatus } from './verification.types';

/**
 * Repositorio del dominio `verification`.
 *
 * Encapsula los lookups y escrituras contra `providers` y
 * `verification_requests`. La transición `pending → approved/rejected`
 * actualiza dos tablas:
 *  - `providers.verificationStatus`: el valor que filtra el listado
 *    público (`/buscar`, `/centro/[id]`).
 *  - `verification_requests`: registro histórico de la decisión, con
 *    el admin que la tomó y las notas. Permite revisar luego por qué
 *    se rechazó / aprobó.
 *
 * Mantenemos UN VerificationRequest por provider (upsert por
 * `providerId`). Si en el futuro hace falta un historial de
 * decisiones reiteradas (proveedor rechazado que vuelve a solicitar),
 * cambiamos a `findFirst` por `(providerId, createdAt desc)` y
 * eliminamos la unicidad — fuera de scope MVP.
 */

interface PendingProviderRow {
  id: string;
  businessName: string;
  type: 'autonomo' | 'centro';
  vatNumber: string | null;
  description: unknown;
  address: string;
  createdAt: Date;
  ownerEmail: string;
  /** Primera categoría asociada (cualquiera). Puede ser null si no tiene. */
  categoryName: unknown;
}

export const verificationRepository = {
  /**
   * Devuelve los providers pendientes de verificar con los datos que
   * necesita la cola admin: nombre, type, vat, dirección, owner email
   * y una categoría representativa.
   *
   * Categoría: hacemos LEFT JOIN con `provider_categories` + `categories`
   * y traemos sólo la primera por orden de slug. Si el provider no
   * tiene aún ninguna categoría (caso defensivo), `categoryName` viene
   * null y el mapper en service lo pinta como cadena vacía.
   */
  async findPendingProviders(): Promise<PendingProviderRow[]> {
    return prisma.$queryRaw<PendingProviderRow[]>`
      SELECT
        p.id,
        p."businessName",
        p.type::text AS type,
        p."vatNumber",
        p.description,
        p.address,
        p."createdAt",
        u.email AS "ownerEmail",
        (
          SELECT c.name
          FROM provider_categories pc
          INNER JOIN categories c ON c.id = pc."categoryId"
          WHERE pc."providerId" = p.id
          ORDER BY c.slug ASC
          LIMIT 1
        ) AS "categoryName"
      FROM providers p
      INNER JOIN users u ON u.id = p."userId"
      WHERE p."verificationStatus" = 'pending'
        AND p."deletedAt" IS NULL
      ORDER BY p."createdAt" DESC
    `;
  },

  /**
   * Localiza un provider pending por id con los mismos datos que la
   * cola, para alimentar la ficha de detalle.
   */
  async findProviderForVerification(providerId: string): Promise<PendingProviderRow | null> {
    const rows = await prisma.$queryRaw<PendingProviderRow[]>`
      SELECT
        p.id,
        p."businessName",
        p.type::text AS type,
        p."vatNumber",
        p.description,
        p.address,
        p."createdAt",
        u.email AS "ownerEmail",
        (
          SELECT c.name
          FROM provider_categories pc
          INNER JOIN categories c ON c.id = pc."categoryId"
          WHERE pc."providerId" = p.id
          ORDER BY c.slug ASC
          LIMIT 1
        ) AS "categoryName"
      FROM providers p
      INNER JOIN users u ON u.id = p."userId"
      WHERE p.id = ${providerId}
        AND p."deletedAt" IS NULL
      LIMIT 1
    `;
    return rows[0] ?? null;
  },

  /**
   * Cambia el `verificationStatus` del Provider y registra la decisión
   * en `verification_requests` (upsert por providerId).
   *
   * Hacemos las dos escrituras en una transacción para que un fallo
   * deje BD consistente — sin que el Provider quede aprobado pero el
   * registro de decisión perdido (o viceversa).
   */
  async setVerificationDecision(args: {
    providerId: string;
    status: Exclude<VerificationStatus, 'pending'>;
    reviewedBy: string;
    notes: string | null;
  }): Promise<void> {
    const { providerId, status, reviewedBy, notes } = args;

    await prisma.$transaction([
      prisma.provider.update({
        where: { id: providerId },
        data: { verificationStatus: status },
      }),
      // Upsert por providerId: en el modelo `VerificationRequest` no
      // hay UNIQUE en providerId todavía, así que hacemos findFirst +
      // update/create manual. Para MVP es suficiente; si crece, añadir
      // `@@unique([providerId])` y usar `upsert` directo.
      prisma.verificationRequest.deleteMany({
        where: { providerId },
      }),
      prisma.verificationRequest.create({
        data: {
          providerId,
          status,
          reviewedBy,
          reviewedAt: new Date(),
          notes,
          documents: [],
        },
      }),
    ]);
  },

  /**
   * Cuenta de providers en cada estado de verificación, para el
   * dashboard `/admin`. Una sola query agregada en BD.
   */
  async countByVerificationStatus(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const rows = await prisma.$queryRaw<Array<{ status: VerificationStatus; count: bigint }>>`
      SELECT "verificationStatus"::text AS status, COUNT(*)::bigint AS count
      FROM providers
      WHERE "deletedAt" IS NULL
      GROUP BY "verificationStatus"
    `;

    const result = { pending: 0, approved: 0, rejected: 0 };
    for (const row of rows) {
      // BigInt → number: las cifras son pequeñas (catálogo < 1M), no
      // perdemos precisión.
      result[row.status] = Number(row.count);
    }
    return result;
  },
};
