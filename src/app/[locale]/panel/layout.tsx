import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { PanelLayout } from '@/components/features/provider-panel/PanelLayout';
import { routing } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';

interface PanelLayoutRouteProps {
  children: React.ReactNode;
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Layout del área del proveedor (`/panel`).
 *
 * Envuelve todas las rutas internas del panel con `PanelLayout` (sidebar
 * desktop + bottom tab bar mobile). Protegido por `requireCurrentProvider`:
 *  - Anónimos → redirect a `/entrar` (vía `requireRole`).
 *  - Cliente / admin → redirect al destino natural de su rol.
 *  - Provider sin Provider asociado → redirect a `/panel/onboarding`
 *    (el wizard #57 lo creará y devolverá al panel).
 *  - Provider con Provider asociado → resuelve nombre y datos reales.
 */
export default async function PanelRouteLayout({ children, params }: PanelLayoutRouteProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const provider = await requireCurrentProvider(locale);

  return <PanelLayout providerName={provider.businessName}>{children}</PanelLayout>;
}
