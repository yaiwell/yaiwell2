import { auth, currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { PanelLayout } from '@/components/features/provider-panel/PanelLayout';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getRoleFromSessionClaims, getRoleFromUser } from '@/lib/auth/role';
import { requireCurrentProvider } from '@/lib/auth/server';
import { getUiMode } from '@/lib/auth/ui-mode';

interface PanelLayoutRouteProps {
  children: React.ReactNode;
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Layout del área del proveedor (`/panel`).
 *
 * Envuelve todas las rutas internas del panel con `PanelLayout` (sidebar
 * desktop + bottom tab bar mobile). Política de acceso:
 *  - Anónimos → redirect a `/entrar` (vía `requireRole`).
 *  - Cliente / admin → redirect al destino natural de su rol.
 *  - Provider real con modo UI activo `client` → redirect a `/`. El
 *    provider eligió "modo usuario" desde `/cuenta` y debe ver la app
 *    pública como un consumidor más, no el panel de gestión.
 *  - Provider sin Provider asociado → redirect a `/onboarding`
 *    (el wizard #57 lo creará y devolverá al panel). La ruta vive
 *    fuera de `/panel/` adrede para evitar bucle infinito con este
 *    propio layout.
 *  - Provider con Provider asociado y modo `provider` → resuelve
 *    nombre y datos reales.
 *
 * El chequeo de modo UI se hace antes que `requireCurrentProvider`
 * para evitar que un provider en modo cliente sin `Provider` en BD
 * acabe en `/onboarding` cuando lo que quería era usar la app como
 * cliente.
 */
export default async function PanelRouteLayout({ children, params }: PanelLayoutRouteProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Pre-chequeo de modo UI: si el usuario es provider pero ha pedido
  // ver la app en modo cliente, lo sacamos del panel antes de
  // `requireCurrentProvider` (que redirigiría a /onboarding si no
  // tuviera Provider en BD).
  const { userId, sessionClaims } = await auth();
  if (userId) {
    let role = getRoleFromSessionClaims(
      sessionClaims as unknown as Parameters<typeof getRoleFromSessionClaims>[0],
    );
    if (!role) {
      const user = await currentUser();
      role = getRoleFromUser(user);
    }
    if (role === 'provider') {
      const mode = await getUiMode('provider');
      if (mode === 'client') {
        redirect({ href: '/', locale });
        return null;
      }
    }
  }

  const provider = await requireCurrentProvider(locale);

  return <PanelLayout providerName={provider.businessName}>{children}</PanelLayout>;
}
