import { redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';

interface StripeReturnPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Landing tras el onboarding de Stripe (returnUrl del AccountLink).
 *
 * No mostramos UI propia: Stripe ya dio feedback en su pantalla. Aquí
 * simplemente redirigimos a `/panel/centro` donde el bloque "Pagos"
 * vuelve a consultar el estado a Stripe y muestra el badge actualizado
 * ("Pagos habilitados", "Onboarding pendiente", etc.).
 *
 * Mantenemos esta ruta separada (en vez de redirigir directo al panel
 * desde Stripe) por dos motivos:
 *  1. Stripe exige una URL fija configurada en su dashboard; cambiar
 *     `/panel/centro` por cualquier otra ruta del panel requeriría
 *     reconfiguración. Este endpoint es una indirección estable.
 *  2. Permite añadir más adelante side-effects locales (revalidate
 *     extras, métrica de conversión de onboarding, etc.) sin tocar
 *     la URL pública.
 */
export default async function StripeReturnPage({ params }: StripeReturnPageProps) {
  const { locale } = await params;

  // Validamos el locale antes de redirigir para no propagar una URL
  // inválida construida por un usuario manipulando el path.
  if (!hasLocale(routing.locales, locale)) {
    redirect('/panel/centro');
  }
  setRequestLocale(locale);

  redirect(`/${locale}/panel/centro?stripe=return`);
}
