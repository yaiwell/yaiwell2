'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';

import { routing, type AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { SITE_URL } from '@/lib/seo/site-url';
import {
  buildConnectReturnUrls,
  continueOnboardingFlow,
  createDashboardLoginLink,
  InvalidConnectBusinessTypeError,
  ProviderForPaymentsNotFoundError,
  startConnectOnboardingSchema,
  startOnboardingFlow,
  StripeAccountAlreadyConnectedError,
  StripeAccountNotConnectedError,
  StripeAccountNotExpressError,
  StripeDashboardUnavailableError,
  StripeOperationError,
} from '@/lib/services/payments';

/**
 * Códigos de fallo que la tarjeta de pagos traduce a copy i18n. En
 * éxito las actions redirigen a Stripe y la UI nunca ve `ok: true`.
 */
export type StripeActionErrorCode =
  | 'INVALID_INPUT'
  | 'PROVIDER_NOT_FOUND'
  | 'NOT_CONNECTED'
  | 'NOT_EXPRESS'
  | 'DASHBOARD_UNAVAILABLE'
  | 'ALREADY_CONNECTED'
  | 'STRIPE_FAILED'
  | 'INTERNAL';

export type StripeActionState =
  | { ok: true }
  | {
      ok: false;
      code: StripeActionErrorCode;
      /** Solo con `ALREADY_CONNECTED`: tipo de la cuenta que ya existe. */
      existingType?: 'individual' | 'company' | 'other';
    };

const INVALID_INPUT: StripeActionState = { ok: false, code: 'INVALID_INPUT' };

/**
 * El `locale` llega del cliente: se valida antes de usarlo en el guard,
 * en las URLs que enviamos a Stripe o en `revalidatePath`.
 */
function isValidLocale(locale: unknown): locale is AppLocale {
  return typeof locale === 'string' && hasLocale(routing.locales, locale);
}

/**
 * Traduce los errores tipados del dominio a códigos estables, sin
 * filtrar mensajes internos al cliente. La `cause` de Stripe se loguea
 * para Sentry.
 */
function toActionError(scope: string, err: unknown): StripeActionState {
  if (err instanceof InvalidConnectBusinessTypeError) return INVALID_INPUT;
  if (err instanceof ProviderForPaymentsNotFoundError) {
    return { ok: false, code: 'PROVIDER_NOT_FOUND' };
  }
  if (err instanceof StripeAccountAlreadyConnectedError) {
    return { ok: false, code: 'ALREADY_CONNECTED', existingType: err.existingType };
  }
  if (err instanceof StripeAccountNotConnectedError) return { ok: false, code: 'NOT_CONNECTED' };
  if (err instanceof StripeAccountNotExpressError) return { ok: false, code: 'NOT_EXPRESS' };
  if (err instanceof StripeDashboardUnavailableError) {
    return { ok: false, code: 'DASHBOARD_UNAVAILABLE' };
  }
  if (err instanceof StripeOperationError) {
    console.error(`[panel/centro/stripe] ${scope} failed:`, err.cause ?? err);
    return { ok: false, code: 'STRIPE_FAILED' };
  }
  console.error(`[panel/centro/stripe] ${scope} unexpected:`, err);
  return { ok: false, code: 'INTERNAL' };
}

/**
 * Inicia el alta en Stripe Connect con la forma jurídica elegida.
 *
 *  1. Valida `locale` y `{ businessType }`: ambos llegan del cliente.
 *  2. `requireCurrentProvider` garantiza sesión, rol y propiedad.
 *  3. Crea la cuenta Express (si no existe) y el AccountLink.
 *  4. Redirige a Stripe; `redirect` interrumpe y no volvemos.
 *
 * Si ya existía una cuenta de otro tipo devuelve `ALREADY_CONNECTED` y
 * revalida el panel para que la tarjeta pase a mostrar esa cuenta.
 */
export async function startStripeOnboardingAction(
  locale: AppLocale,
  input: unknown,
): Promise<StripeActionState> {
  if (!isValidLocale(locale)) return INVALID_INPUT;
  const parsed = startConnectOnboardingSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  const { id: providerId } = await requireCurrentProvider(locale);

  let url: string;
  try {
    const link = await startOnboardingFlow(
      providerId,
      parsed.data.businessType,
      buildConnectReturnUrls(SITE_URL, locale),
    );
    url = link.url;
  } catch (err) {
    const state = toActionError('startOnboardingFlow', err);
    if (!state.ok && state.code === 'ALREADY_CONNECTED') {
      revalidatePath(`/${locale}/panel/centro`);
    }
    return state;
  }
  redirect(url);
}

/**
 * Continúa un alta a medias o completa requisitos pendientes con un
 * AccountLink nuevo. No admite cambiar la forma jurídica (ver
 * `payments.service.ts`).
 */
export async function continueStripeOnboardingAction(
  locale: AppLocale,
): Promise<StripeActionState> {
  if (!isValidLocale(locale)) return INVALID_INPUT;
  const { id: providerId } = await requireCurrentProvider(locale);

  let url: string;
  try {
    const link = await continueOnboardingFlow(providerId, buildConnectReturnUrls(SITE_URL, locale));
    url = link.url;
  } catch (err) {
    return toActionError('continueOnboardingFlow', err);
  }
  redirect(url);
}

/**
 * Abre el dashboard Express del proveedor con un login link de un solo
 * uso. La UI solo lo ofrece a cuentas Express con el alta enviada; el
 * service lo vuelve a comprobar.
 */
export async function openStripeDashboardAction(locale: AppLocale): Promise<StripeActionState> {
  if (!isValidLocale(locale)) return INVALID_INPUT;
  const { id: providerId } = await requireCurrentProvider(locale);

  let url: string;
  try {
    url = (await createDashboardLoginLink(providerId)).url;
  } catch (err) {
    return toActionError('createDashboardLoginLink', err);
  }
  redirect(url);
}

/**
 * Fuerza a re-renderizar `/panel/centro` para volver a consultar el
 * estado a Stripe. No cacheamos el estado, así que basta con revalidar.
 */
export async function refreshStripeStatusAction(locale: AppLocale): Promise<StripeActionState> {
  if (!isValidLocale(locale)) return INVALID_INPUT;
  await requireCurrentProvider(locale);
  revalidatePath(`/${locale}/panel/centro`);
  return { ok: true };
}
