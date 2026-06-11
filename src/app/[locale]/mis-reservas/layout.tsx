import { auth, currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CustomerShell } from '@/components/features/customer';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getRoleFromSessionClaims, getRoleFromUser } from '@/lib/auth/role';
import { getUiMode } from '@/lib/auth/ui-mode';

interface CustomerLayoutProps {
  children: React.ReactNode;
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Layout del área cliente.
 *
 * Envuelve todas las rutas privadas del cliente (`/mis-reservas`,
 * `/mis-favoritos`, etc.) con el `CustomerShell` (sidebar + main).
 *
 * Política de acceso:
 *  - Anónimos → `/entrar`.
 *  - Cliente real → entra.
 *  - Admin → redirect a `/admin` (no opera como cliente desde aquí).
 *  - Provider real → entra **solo si** su modo UI activo es `client`.
 *    En modo `provider` lo enviamos al `/panel`, que es su flujo natural.
 *    Esto permite que un provider haga "swap a modo usuario" desde
 *    `/cuenta` y use la app como cliente sin necesitar segunda cuenta.
 *
 * Las reservas que aparezcan aquí siempre se filtran por `clientId =
 * usuario actual`, así que un provider en modo cliente solo ve las
 * suyas como consumidor — no las que recibió como negocio.
 */
export default async function CustomerLayout({ children, params }: CustomerLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    redirect({ href: '/entrar', locale });
    return null;
  }

  // Resolución de rol + identidad. Compartimos un único fetch a
  // `currentUser()` cuando los claims no traen rol — el shell del área
  // cliente necesita el avatar y nombre real para la sidebar, así que
  // aprovechamos el mismo objeto `user` para ambas cosas.
  let role = getRoleFromSessionClaims(
    sessionClaims as unknown as Parameters<typeof getRoleFromSessionClaims>[0],
  );
  let user = role ? null : await currentUser();
  if (!role) {
    role = getRoleFromUser(user);
  }

  if (role === 'admin') {
    redirect({ href: '/admin', locale });
    return null;
  }

  if (role === 'provider') {
    const mode = await getUiMode('provider');
    if (mode === 'provider') {
      redirect({ href: '/panel', locale });
      return null;
    }
  }

  // Si el rol vino de los claims, todavía no hemos cargado el `user` y
  // necesitamos su `imageUrl` + nombre para la sidebar. Lo pedimos aquí
  // — un único fetch extra por visita autenticada al área cliente.
  if (!user) {
    user = await currentUser();
  }
  const primaryEmail =
    user?.emailAddresses?.find((e) => e.id === user?.primaryEmailAddressId)?.emailAddress ?? '';
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';

  return (
    <CustomerShell
      activePath="/mis-reservas"
      identity={{
        displayName,
        email: primaryEmail,
        avatarUrl: user?.imageUrl ?? undefined,
      }}
    >
      {children}
    </CustomerShell>
  );
}
