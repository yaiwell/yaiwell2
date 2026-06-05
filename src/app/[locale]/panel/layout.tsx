import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { PanelLayout } from '@/components/features/provider-panel/PanelLayout';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth';
import { getProviderById } from '@/lib/fake-data/providers';

interface PanelLayoutRouteProps {
  children: React.ReactNode;
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Layout del área del proveedor (`/panel`).
 *
 * Envuelve todas las rutas internas del panel con `PanelLayout` (sidebar
 * desktop + bottom tab bar mobile). Protegido por `requireRole(['provider'])`
 * — cliente o admin caen a su destino natural, anónimos van a `/entrar`.
 *
 * El proveedor de datos sigue siendo mock (`prov-01`) en Fase 0; el
 * mapeo `userId → providerId` real entrará con el onboarding de provider
 * (Fase 1) cuando exista la tabla `providers` enlazada por `userId`.
 */
export default async function PanelRouteLayout({ children, params }: PanelLayoutRouteProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  await requireRole(['provider'], locale);

  // Mock: usamos siempre el primer proveedor del catálogo.
  // En Fase 1 esto se resolverá desde la sesión Clerk del proveedor.
  const provider = getProviderById('prov-01');
  const providerName = provider?.name ?? 'Yaiwell';

  return <PanelLayout providerName={providerName}>{children}</PanelLayout>;
}
