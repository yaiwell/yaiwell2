'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import {
  ProviderForPaymentsNotFoundError,
  StripeOperationError,
  startOnboardingFlow,
} from '@/lib/services/payments';

/**
 * Estado serializable del resultado del inicio del onboarding.
 *
 * En éxito la action hace `redirect` directo a la URL temporal de
 * Stripe — la UI no ve `ok: true` porque Next interrumpe la ejecución
 * con el redirect interno. El tipo está expuesto para que la UI sepa
 * qué codes esperar en caso de fallo.
 */
export type StartStripeOnboardingState =
  | { ok: true }
  | {
      ok: false;
      code: 'PROVIDER_NOT_FOUND' | 'STRIPE_FAILED' | 'INTERNAL';
    };

/**
 * Inicia el flujo de onboarding de Stripe Connect para el provider
 * autenticado.
 *
 * Pasos:
 *  1. `requireCurrentProvider` — garantiza ownership + rol provider.
 *  2. `startOnboardingFlow` — crea cuenta Stripe (si no existe) y
 *     genera el AccountLink temporal.
 *  3. Redirect 303 a la URL de Stripe — Next interrumpe con
 *     `NEXT_REDIRECT` y el navegador hace la navegación.
 *
 * Se construye el `returnUrl` y `refreshUrl` aquí (no en el cliente)
 * para que Stripe valide que apuntan a un dominio whitelisted en su
 * dashboard. Ambas usan rutas absolutas locales (`/{locale}/panel/centro/
 * stripe/return` y `/refresh`) — Next-intl traduce el locale.
 *
 * El cliente NO debería capturar este `redirect` — lo dejamos propagar
 * para que se navegue al usuario directo al onboarding de Stripe.
 */
export async function startStripeOnboardingAction(
  locale: AppLocale,
): Promise<StartStripeOnboardingState> {
  const { id: providerId } = await requireCurrentProvider(locale);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const returnUrl = `${appUrl}/${locale}/panel/centro/stripe/return`;
  const refreshUrl = `${appUrl}/${locale}/panel/centro/stripe/refresh`;

  let link: { url: string };
  try {
    link = await startOnboardingFlow(providerId, { returnUrl, refreshUrl });
  } catch (err) {
    if (err instanceof ProviderForPaymentsNotFoundError) {
      return { ok: false, code: 'PROVIDER_NOT_FOUND' };
    }
    if (err instanceof StripeOperationError) {
      // Logueamos la cause para Sentry sin filtrar el mensaje interno
      // al cliente — copy genérico vía code STRIPE_FAILED.
      console.error('[panel/centro/stripe] startOnboardingFlow failed:', err.cause ?? err);
      return { ok: false, code: 'STRIPE_FAILED' };
    }
    console.error('[panel/centro/stripe] startOnboardingFlow unexpected:', err);
    return { ok: false, code: 'INTERNAL' };
  }

  // `redirect` lanza `NEXT_REDIRECT` y Next interrumpe la ejecución.
  // No volvemos al caller.
  redirect(link.url);
}

/**
 * Forza una recarga del estado de la cuenta en BD/UI.
 *
 * Hoy no cacheamos el estado en BD (cada render lo consulta a Stripe),
 * así que esta action solo revalida el path para que el Server
 * Component padre vuelva a renderizar con datos frescos. La dejamos
 * lista para cuando, si llegamos a cachear el status, sea aquí donde
 * se invalide la caché.
 */
export async function refreshStripeStatusAction(locale: AppLocale): Promise<void> {
  await requireCurrentProvider(locale);
  revalidatePath(`/${locale}/panel/centro`);
}
