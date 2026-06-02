import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { PanelLayout } from '@/components/features/provider-panel/PanelLayout';
import { routing } from '@/i18n/routing';
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
 * desktop + bottom tab bar mobile). El proveedor activo se obtiene
 * desde los mocks (`prov-01`); en Fase 1 lo resolverá Clerk a partir
 * de la sesión del proveedor autenticado.
 */
export default async function PanelRouteLayout({ children, params }: PanelLayoutRouteProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Mock: usamos siempre el primer proveedor del catálogo.
  // En Fase 1 esto se resolverá desde la sesión Clerk del proveedor.
  const provider = getProviderById('prov-01');
  const providerName = provider?.name ?? 'Yeiwell';

  return <PanelLayout providerName={providerName}>{children}</PanelLayout>;
}
