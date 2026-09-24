import { auth, currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SignInForm } from '@/components/features/auth';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getRoleFromUser, resolvePostAuthDestination } from '@/lib/auth';
import { REDIRECT_URL_PARAM, parseInternalRedirectUrl } from '@/lib/validation';

interface SignInPageProps {
  // En Next.js 16 los `params` de los segmentos dinámicos son asíncronos.
  params: Promise<{ locale: string }>;
  // `searchParams` también es una Promise en Next 16, y sus valores
  // pueden ser `string[]` si el parámetro llega repetido en la URL.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Genera el `<title>` y la meta description de la pantalla de sign-in.
 *
 * Es una pantalla utilitaria, así que indexar tiene poco valor SEO. Aún
 * así dejamos `robots.index = false` explícito y un título descriptivo
 * para mejorar la experiencia al compartir el enlace.
 */
export async function generateMetadata({ params }: SignInPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'signIn' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    robots: { index: false, follow: true },
  };
}

/**
 * Pantalla `/entrar` (sign-in real con Clerk headless).
 *
 * Server Component que valida el locale, fija el contexto i18n y, si el
 * usuario ya tiene sesión, lo redirige directamente a su área (cliente
 * → `/`, proveedor → `/panel`). Esto evita que un usuario logueado vea
 * el formulario de entrada — es la primera capa del guard de auth, la
 * segunda vivirá en los layouts privados (`/panel`, etc.).
 *
 * Acepta además un `redirect_url` con la ruta interna de la que viene
 * el usuario (hoy lo usa el flujo de reserva, que manda aquí al anónimo
 * en el paso de pago). Se sanea con Zod antes de usarse: sin esa
 * validación sería un redirect abierto, o sea un vector de phishing
 * bajo nuestro dominio.
 */
export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const redirectUrl = parseInternalRedirectUrl((await searchParams)[REDIRECT_URL_PARAM]);

  // Guard: si ya hay sesión activa, mandamos al usuario a su destino
  // según rol. Usamos `currentUser()` porque el rol vive en
  // `publicMetadata` (con fallback a `unsafeMetadata`) y ese fetch no
  // sale del runtime del Server Component.
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const role = getRoleFromUser(user);
    redirect({ href: resolvePostAuthDestination(role, redirectUrl), locale });
  }

  return <SignInForm redirectUrl={redirectUrl} />;
}
