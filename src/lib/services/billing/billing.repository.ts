import 'server-only';

import type { BillingSubscriptionStatus, PlanTier, Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import type { ProviderForBilling } from './billing.types';

type Db = typeof prisma | Prisma.TransactionClient;

/** Columnas del espejo de Stripe que escribe la sincronización. */
export interface SubscriptionMirror {
  stripeSubscriptionId: string;
  subscriptionStatus: BillingSubscriptionStatus;
  subscribedPlanId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId: string | null;
  scheduledChangeAt: Date | null;
}

const PLAN_SELECT = {
  id: true,
  tier: true,
  maxServices: true,
  monthlyPriceCents: true,
  commissionRateBps: true,
} as const;

/**
 * Repositorio del dominio `billing`: `provider_billing`, la lectura de
 * planes y el `planId` del negocio. Sin reglas de negocio.
 */
export const billingRepository = {
  /** Negocio con los datos del dueño para el Customer de Stripe. */
  async findProviderForBilling(providerId: string): Promise<ProviderForBilling | null> {
    const row = await prisma.provider.findFirst({
      where: { id: providerId, deletedAt: null },
      select: {
        id: true,
        businessName: true,
        owner: { select: { email: true, locale: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      businessName: row.businessName,
      ownerEmail: row.owner.email,
      ownerLocale: row.owner.locale,
    };
  },

  async findByProviderId(providerId: string) {
    return prisma.providerBilling.findUnique({ where: { providerId } });
  },

  async findByCustomerId(stripeCustomerId: string) {
    return prisma.providerBilling.findUnique({ where: { stripeCustomerId } });
  },

  /**
   * Inserta la fila solo si el negocio aún no tiene una (`ON CONFLICT DO
   * NOTHING` vía `skipDuplicates`). Con un doble clic solo gana una.
   *
   * @returns `true` si insertó; `false` si otra petición ganó la carrera.
   */
  async insertIfAbsent(providerId: string, stripeCustomerId: string): Promise<boolean> {
    const { count } = await prisma.providerBilling.createMany({
      data: [{ providerId, stripeCustomerId }],
      skipDuplicates: true,
    });
    return count > 0;
  },

  async findPlanByTier(tier: PlanTier, db: Db = prisma) {
    return db.plan.findUnique({ where: { tier }, select: PLAN_SELECT });
  },

  async findPlanById(id: string, db: Db = prisma) {
    return db.plan.findUnique({ where: { id }, select: PLAN_SELECT });
  },

  /**
   * Bloquea la fila del negocio hasta el fin de la transacción y devuelve
   * su plan efectivo. Serializa los cambios de plan concurrentes (dos
   * webhooks a la vez) con las altas de servicios del panel.
   */
  async lockProviderPlan(tx: Prisma.TransactionClient, providerId: string) {
    // Los ids son `text` en BD: se comparan sin `::uuid`.
    const rows = await tx.$queryRaw<Array<{ planId: string }>>`
      SELECT "planId" FROM providers WHERE id = ${providerId} FOR UPDATE
    `;
    return rows[0]?.planId ?? null;
  },

  /**
   * Bloquea y relee la fila de facturación dentro de la transacción. Se
   * llama SIEMPRE después de `lockProviderPlan` (mismo orden de bloqueo
   * en todo el módulo: providers → provider_billing, sin interbloqueos).
   * La decisión de adoptar o descartar se toma sobre esta lectura, no
   * sobre la previa a la transacción.
   */
  async lockBillingRow(tx: Prisma.TransactionClient, providerId: string) {
    await tx.$queryRaw`
      SELECT id FROM provider_billing WHERE "providerId" = ${providerId} FOR UPDATE
    `;
    return tx.providerBilling.findUnique({ where: { providerId } });
  },

  async setProviderPlan(tx: Prisma.TransactionClient, providerId: string, planId: string) {
    await tx.provider.update({ where: { id: providerId }, data: { planId } });
  },

  async writeMirror(
    tx: Prisma.TransactionClient,
    providerId: string,
    mirror: SubscriptionMirror,
    syncedAt: Date,
  ) {
    await tx.providerBilling.update({
      where: { providerId },
      data: { ...mirror, lastSyncedAt: syncedAt },
    });
  },

  /**
   * Registra un cobro fallido y reclama el aviso de forma atómica: solo
   * la primera entrega con esa clave (`${invoice}:${intento}`) la escribe.
   *
   * @returns `true` si hay que avisar (clave nueva); `false` si ya se avisó.
   */
  async claimPaymentFailure(
    providerId: string,
    subscriptionId: string,
    failedAt: Date,
    key: string,
  ): Promise<boolean> {
    const { count } = await prisma.providerBilling.updateMany({
      where: {
        providerId,
        // Solo la suscripción en curso: el fallo de una vieja o de una
        // duplicada (que se cancela sola) no es un impago del negocio.
        stripeSubscriptionId: subscriptionId,
        // `not` excluye los NULL en SQL: el OR los recupera.
        OR: [{ lastFailureNotifiedKey: null }, { lastFailureNotifiedKey: { not: key } }],
      },
      data: { lastPaymentFailedAt: failedAt, lastFailureNotifiedKey: key },
    });
    return count > 0;
  },

  /**
   * Limpia el último cobro fallido tras un pago correcto, solo si el pago
   * es de la suscripción en curso (el de otra no salda su impago).
   */
  async clearPaymentFailure(providerId: string, subscriptionId: string): Promise<boolean> {
    const { count } = await prisma.providerBilling.updateMany({
      where: {
        providerId,
        stripeSubscriptionId: subscriptionId,
        lastPaymentFailedAt: { not: null },
      },
      data: { lastPaymentFailedAt: null },
    });
    return count > 0;
  },

  /** Plan efectivo del negocio y su fila de facturación (para el panel). */
  async findSummaryRows(providerId: string) {
    return prisma.provider.findFirst({
      where: { id: providerId, deletedAt: null },
      select: {
        plan: { select: PLAN_SELECT },
        billing: {
          include: {
            subscribedPlan: { select: { tier: true } },
            scheduledPlan: { select: { tier: true } },
          },
        },
      },
    });
  },

  /** Servicios publicados y ocultos por el límite del plan. */
  async countServices(providerId: string) {
    const [active, pausedByPlan] = await Promise.all([
      prisma.service.count({ where: { providerId, deletedAt: null, isActive: true } }),
      prisma.service.count({
        where: { providerId, deletedAt: null, isActive: false, pausedByPlanAt: { not: null } },
      }),
    ]);
    return { active, pausedByPlan };
  },
};
