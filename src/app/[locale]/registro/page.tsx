import { auth, currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SignUpForm } from '@/components/features/auth/SignUpForm';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getRoleFromUser, resolvePostAuthDestination } from '@/lib/auth';

interface SignUpPageProps {
  // En Next.js 16 los `params` de los segmentos dinámicos son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Metadatos SEO de la pantalla de registro. El título se compone con
 * la plantilla del layout (`%s | Yaiwell`) por lo que aquí solo damos
 * la parte específica.
 */
export async function generateMetadata({ params }: SignUpPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'signUp.meta' });
  return {
    title: t('title'),
    description: t('description'),
    // No queremos indexar esta página: el SEO útil vive en la landing
    // y en las fichas de centro, no en formularios cerrados.
    robots: { index: false, follow: true },
  };
}

/**
 * Página `/registro`: punto de entrada al alta de usuarios y proveedores.
 *
 * Server Component: valida el locale, redirige si ya hay sesión activa
 * (un usuario logueado no debe ver el formulario de alta) y delega el
 * render en el `SignUpForm` Client Component.
 */
export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Guard: si ya hay sesión, mandamos al usuario directamente a su
  // destino post-auth para no mostrarle el alta otra vez.
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const role = getRoleFromUser(user);
    redirect({ href: resolvePostAuthDestination(role), locale });
  }

  return (
    <div data-component="sign-up-page" className="contents">
      <SignUpForm />
    </div>
  );
}
