import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { DashboardMetrics } from '@/components/features/provider-panel/DashboardMetrics';
import { requireCurrentProvider } from '@/lib/auth/server';
import { getWeeklyMetrics } from '@/lib/services/provider-panel';

interface PanelDashboardPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Dashboard del panel del proveedor (`/panel`).
 *
 * Server Component que computa el snapshot semanal real desde BD
 * (ingresos, reservas, ticket medio, deltas vs semana anterior,
 * agregado diario, top servicios) y lo pasa al componente
 * `DashboardMetrics` para renderizar.
 *
 * La ocupación se queda en 0 hasta que tengamos cálculo basado en
 * Professional.schedule (Fase 1).
 */
export default async function PanelDashboardPage({ params }: PanelDashboardPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { id: providerId } = await requireCurrentProvider(locale);
  const metrics = await getWeeklyMetrics(providerId);

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return <DashboardMetrics metrics={metrics} locale={panelLocale} />;
}
