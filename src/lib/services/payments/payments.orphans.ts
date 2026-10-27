import 'server-only';

import { isSentryEnabled } from '@/lib/integrations/sentry';
import { getStripeClient } from '@/lib/integrations/stripe';

import { ProviderForPaymentsNotFoundError } from './payments.errors';
import { paymentsRepository } from './payments.repository';

/**
 * Limpieza de cuentas Connect huérfanas: las que acabamos de crear en
 * Stripe pero no llegamos a guardar en el provider (carrera de doble
 * clic o fallo de BD). Solo se borra el id concreto creado en la misma
 * petición, que es nuestro y no tiene actividad; nunca se busca ni se
 * borra ninguna otra cuenta.
 */

/**
 * Borra la cuenta huérfana. Si falla no lanzamos: el caller ya tiene su
 * propio desenlace (cuenta ganadora o error original) y bloquearlo por
 * la limpieza sería peor. Queda en log y en Sentry para que soporte la
 * borre a mano.
 */
export async function deleteOrphanAccount(providerId: string, orphanId: string): Promise<void> {
  try {
    await getStripeClient().accounts.del(orphanId);
  } catch (err) {
    console.error('[payments] orphan Stripe account not deleted:', orphanId, providerId);
    if (!isSentryEnabled()) return;
    void import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureException(err, {
          tags: { domain: 'payments', providerId },
          extra: { orphanStripeAccountId: orphanId },
        });
      })
      .catch(() => {
        // La telemetría no debe romper el alta.
      });
  }
}

/**
 * Otra petición concurrente (doble clic) guardó su cuenta antes que
 * nosotros. Devolvemos la ganadora y borramos la nuestra.
 *
 * @throws ProviderForPaymentsNotFoundError — si el provider desapareció
 *   (o se borró) entre la lectura y la escritura.
 */
export async function resolveLostCreationRace(
  providerId: string,
  orphanId: string,
): Promise<string> {
  const current = await paymentsRepository.findProviderForPayments(providerId);
  await deleteOrphanAccount(providerId, orphanId);
  if (!current?.stripeAccountId) {
    throw new ProviderForPaymentsNotFoundError();
  }
  return current.stripeAccountId;
}
