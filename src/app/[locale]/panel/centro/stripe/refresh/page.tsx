import { redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { SITE_URL } from '@/lib/seo/site-url';
import {
  buildConnectReturnUrls,
  continueOnboardingFlow,
  StripeOperationError,
} from '@/lib/services/payments';

interface StripeRefreshPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * `refresh_url` del AccountLink de Stripe.
 *
 * Stripe redirige aquí cuando el enlace ha caducado, ya se usó o el
 * usuario recargó la página del formulario. Generamos un AccountLink
 * nuevo para la cuenta existente y le devolvemos al formulario sin
 * pasar por el panel.
 *
 * Si falla (cuenta inexistente, cuenta Custom de pruebas, Stripe caído)
 * volvemos a `/panel/centro?stripe=refresh-failed` para avisarle.
 */
export default async function StripeRefreshPage({ params }: StripeRefreshPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    redirect('/panel/centro');
  }
  setRequestLocale(locale);

  // Solo el proveedor autenticado puede regenerar el enlace de su cuenta.
  const { id: providerId } = await requireCurrentProvider(locale);

  // El redirect va fuera del try: `redirect()` lanza NEXT_REDIRECT y no
  // queremos tratarlo como un fallo.
  let url: string | null = null;
  try {
    const link = await continueOnboardingFlow(providerId, buildConnectReturnUrls(SITE_URL, locale));
    url = link.url;
  } catch (err) {
    if (err instanceof StripeOperationError) {
      console.error('[panel/centro/stripe/refresh] failed:', err.cause ?? err);
    } else {
      console.error('[panel/centro/stripe/refresh] not refreshable:', err);
    }
  }

  redirect(url ?? `/${locale}/panel/centro?stripe=refresh-failed`);
}
