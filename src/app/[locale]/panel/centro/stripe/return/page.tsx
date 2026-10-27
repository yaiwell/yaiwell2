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
 * Volver aquí NO significa que el alta esté completa (el usuario puede
 * salir a medias): por eso no mostramos "¡listo!" a ciegas, sino que el
 * panel vuelve a leer el estado real de Stripe y elige el aviso.
 *
 * Mantenemos esta ruta separada (en vez de apuntar el `return_url`
 * directamente al panel) porque es una indirección estable: permite
 * añadir side-effects locales (métrica de conversión del alta, etc.)
 * sin cambiar la URL que generan los AccountLinks.
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
