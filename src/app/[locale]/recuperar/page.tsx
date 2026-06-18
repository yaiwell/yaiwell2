import { auth, currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ResetPasswordForm } from '@/components/features/auth';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getRoleFromUser, resolvePostAuthDestination } from '@/lib/auth';

interface ResetPasswordPageProps {
  // En Next.js 16 los `params` de los segmentos dinámicos son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Metadatos SEO de la pantalla de recuperación. El título se compone
 * con la plantilla del layout (`%s | Yaiwell`).
 */
export async function generateMetadata({ params }: ResetPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'resetPassword.meta' });
  return {
    title: t('title'),
    description: t('description'),
    // No queremos indexar esta página: el SEO útil vive en la landing
    // y en las fichas de centro, no en formularios utilitarios.
    robots: { index: false, follow: true },
  };
}

/**
 * Página `/recuperar`: punto de entrada al flujo de recuperación de
 * contraseña vía Clerk (strategy `reset_password_email_code`).
 *
 * Server Component: valida el locale, redirige si ya hay sesión activa
 * (un usuario logueado no debe ver el formulario de reset) y delega
 * el render en el `ResetPasswordForm` Client Component.
 */
export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Guard: si ya hay sesión, mandamos al usuario a su destino post-auth.
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const role = getRoleFromUser(user);
    redirect({ href: resolvePostAuthDestination(role), locale });
  }

  return (
    <div data-component="reset-password-page" className="contents">
      <ResetPasswordForm />
    </div>
  );
}
