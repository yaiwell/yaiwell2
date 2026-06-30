import { redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { startOnboardingFlow, StripeOperationError } from '@/lib/services/payments';

interface StripeRefreshPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Endpoint de refresh para el AccountLink de Stripe.
 *
 * Stripe redirige aquí cuando la URL temporal del onboarding ha
 * caducado (~5 min de TTL) o el usuario abandonó y volvió. Generamos
 * un AccountLink nuevo y le redirigimos al onboarding otra vez sin
 * pasar por el botón manual del panel.
 *
 * Si la generación falla, caemos al `/panel/centro` con `stripe=refresh-failed`
 * para que la UI muestre un banner informando al usuario.
 */
export default async function StripeRefreshPage({ params }: StripeRefreshPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    redirect('/panel/centro');
  }
  setRequestLocale(locale);

  // Reusamos el guard del panel — sólo proveedores autenticados pueden
  // pedir un onboarding refresh para su propia cuenta.
  const { id: providerId } = await requireCurrentProvider(locale);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const returnUrl = `${appUrl}/${locale}/panel/centro/stripe/return`;
  const refreshUrl = `${appUrl}/${locale}/panel/centro/stripe/refresh`;

  try {
    const link = await startOnboardingFlow(providerId, { returnUrl, refreshUrl });
    redirect(link.url);
  } catch (err) {
    // `redirect()` lanza NEXT_REDIRECT que NO debemos capturar.
    if (
      typeof err === 'object' &&
      err !== null &&
      'digest' in err &&
      typeof (err as { digest?: string }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw err;
    }
    if (err instanceof StripeOperationError) {
      console.error('[panel/centro/stripe/refresh] failed:', err.cause ?? err);
    } else {
      console.error('[panel/centro/stripe/refresh] unexpected:', err);
    }
    redirect(`/${locale}/panel/centro?stripe=refresh-failed`);
  }
}
