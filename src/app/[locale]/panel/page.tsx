import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { DashboardMetrics } from '@/components/features/provider-panel/DashboardMetrics';
import { routing } from '@/i18n/routing';
import { fakePanelWeeklyMetrics } from '@/lib/fake-data/panel-metrics';

interface PanelDashboardPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Dashboard del panel del proveedor (`/panel`).
 *
 * Server Component que renderiza el snapshot semanal de métricas
 * (ingresos, reservas, ticket medio, ocupación) con una mini-gráfica
 * de barras CSS y el ranking de servicios top.
 */
export default async function PanelDashboardPage({ params }: PanelDashboardPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // El componente está tipado solo para los locales soportados en el panel.
  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return <DashboardMetrics metrics={fakePanelWeeklyMetrics} locale={panelLocale} />;
}
