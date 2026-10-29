import 'server-only';

import type { Prisma } from '@prisma/client';
import type Stripe from 'stripe';

import { prisma } from '@/lib/db/prisma';

import { resolveDuplicateSubscription } from './billing.duplicates';
import { BillingProviderNotFoundError, SubscriptionSyncConflictError } from './billing.errors';
import { applyPlanLimits } from './billing.plan-limits';
import { billingRepository } from './billing.repository';
import { customerIdOf, isDeadStatus, isLiveStatus } from './billing.sync.mapping';
import {
  mirrorDiffers,
  prepareSubscriptionWrite,
  type PreparedWrite,
} from './billing.sync.prepare';
import { findLiveSibling, isSubscriptionLive, retrieveSubscription } from './billing.sync.stripe';
import type { PlanChange, SubscriptionSyncResult } from './billing.types';

/**
 * Intentos ante conflictos con una sincronización concurrente (la fila
 * cambió entre la lectura y el bloqueo, o se escribió un estado leído
 * después que el nuestro). Cada intento vuelve a leer Stripe.
 */
const MAX_ATTEMPTS = 3;

/** Lo que decide la transacción con la fila bloqueada. */
type LockedOutcome =
  | { kind: 'retry' }
  | { kind: 'ignored' }
  | { kind: 'duplicate'; keptId: string }
  | { kind: 'written'; changed: boolean; planChanged?: PlanChange };

/**
 * Sincroniza una suscripción de Stripe con Yaiwell: escribe el espejo en
 * `provider_billing` y fija el plan efectivo aplicando sus límites de
 * servicios, todo en una transacción con la fila del negocio bloqueada.
 *
 * Idempotente y tolerante al desorden:
 *  - Siempre lee el estado ACTUAL en Stripe, nunca el del evento.
 *  - `lastSyncedAt` guarda el instante previo a esa lectura. Si al bloquear
 *    la fila hay un estado leído después que el nuestro, el nuestro es
 *    viejo (p. ej. un `updated` procesado tras el `deleted`) y se repite
 *    la sincronización con una lectura nueva en vez de pisarlo.
 *
 * Adopción cuando la suscripción no es la guardada (decidida con la fila
 * bloqueada y releída):
 *  - esta no está viva (p. ej. `deleted` de una vieja) → se ignora;
 *  - la guardada sigue viva y esta también → duplicada: se reembolsa y se
 *    cancela la nueva (`resolveDuplicateSubscription`);
 *  - la guardada está muerta y esta viva → se adopta.
 * Si muere la guardada y el Customer tiene otra viva, se adopta esa.
 *
 * @param subscriptionId — `sub_…` del evento o del Checkout.
 * @throws BillingProviderNotFoundError — Customer sin negocio (el webhook
 *   responde 200 sin reintentar).
 * @throws BillingStripeError | BillingPlanNotSeededError
 *   | SubscriptionSyncConflictError — transitorios o de configuración (el
 *   webhook responde 500 y Stripe reintenta).
 */
export async function syncSubscription(
  subscriptionId: string,
  attempt = 1,
): Promise<SubscriptionSyncResult> {
  // Antes del `retrieve`: lo que leamos es, como poco, de este instante.
  const fetchedAt = new Date();
  const sub = await retrieveSubscription(subscriptionId);
  const customerId = customerIdOf(sub);
  const billing = await billingRepository.findByCustomerId(customerId);
  if (!billing) {
    throw new BillingProviderNotFoundError(`Customer ${customerId} has no provider in Yaiwell.`);
  }
  const { providerId } = billing;
  const storedSeen = billing.stripeSubscriptionId;
  const isOther = storedSeen !== null && storedSeen !== sub.id;

  if (isDeadStatus(sub.status) && !isOther) {
    const sibling = await findLiveSibling(customerId, sub.id);
    if (sibling) return syncSubscription(sibling, attempt);
  }
  // Lecturas a Stripe fuera del bloqueo; la transacción comprueba que la
  // fila sigue como la vimos antes de usarlas.
  const storedLive =
    isOther && isLiveStatus(sub.status) ? await isSubscriptionLive(storedSeen) : false;
  const prepared = await prepareSubscriptionWrite(sub, providerId);

  const outcome = await prisma.$transaction((tx) =>
    decideAndWrite(tx, { providerId, sub, storedSeen, storedLive, fetchedAt, prepared }),
  );

  switch (outcome.kind) {
    case 'retry':
      if (attempt >= MAX_ATTEMPTS) throw new SubscriptionSyncConflictError();
      return syncSubscription(subscriptionId, attempt + 1);
    case 'ignored':
      return { changed: false, providerId };
    case 'duplicate':
      await resolveDuplicateSubscription(providerId, outcome.keptId, sub);
      return { changed: false, providerId };
    case 'written':
      return outcome.planChanged
        ? { changed: outcome.changed, providerId, planChanged: outcome.planChanged }
        : { changed: outcome.changed, providerId };
  }
}

interface DecideInput {
  providerId: string;
  sub: Stripe.Subscription;
  storedSeen: string | null;
  storedLive: boolean;
  fetchedAt: Date;
  prepared: PreparedWrite;
}

/** Con la fila bloqueada: decide adopción/orden y escribe. */
async function decideAndWrite(
  tx: Prisma.TransactionClient,
  input: DecideInput,
): Promise<LockedOutcome> {
  const { providerId, sub, storedSeen, storedLive, fetchedAt, prepared } = input;
  const currentPlanId = await billingRepository.lockProviderPlan(tx, providerId);
  const row = await billingRepository.lockBillingRow(tx, providerId);
  if (currentPlanId === null || !row) throw new BillingProviderNotFoundError();

  // Otra sincronización adoptó otra suscripción entre medias: nuestras
  // lecturas previas ya no valen.
  if (row.stripeSubscriptionId !== storedSeen) return { kind: 'retry' };
  // Ya hay escrito un estado leído después que el nuestro.
  if (row.lastSyncedAt && row.lastSyncedAt.getTime() > fetchedAt.getTime()) {
    return { kind: 'retry' };
  }
  if (storedSeen !== null && storedSeen !== sub.id) {
    if (!isLiveStatus(sub.status)) return { kind: 'ignored' };
    if (storedLive) return { kind: 'duplicate', keptId: storedSeen };
  }

  const { mirror, target } = prepared;
  await billingRepository.writeMirror(tx, providerId, mirror, fetchedAt);
  let planChanged: PlanChange | undefined;
  if (target) {
    if (target.id !== currentPlanId) {
      const from = await billingRepository.findPlanById(currentPlanId, tx);
      await billingRepository.setProviderPlan(tx, providerId, target.id);
      planChanged = { from: from?.tier ?? 'free', to: target.tier };
    }
    // Siempre, aunque el plan no cambie: repara servicios publicados de
    // más (alta concurrente, cambio manual) y reactiva los que ocultó el
    // plan si vuelve a haber cupo. Es idempotente.
    await applyPlanLimits(tx, providerId, target.maxServices, fetchedAt);
  }
  const changed = planChanged !== undefined || mirrorDiffers(row, mirror);
  return planChanged ? { kind: 'written', changed, planChanged } : { kind: 'written', changed };
}
