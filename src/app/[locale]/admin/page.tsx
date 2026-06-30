import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdminMetricsGrid, VerificationsQueue } from '@/components/features/admin';
import { routing, type AppLocale } from '@/i18n/routing';
import { getAdminMetrics } from '@/lib/services/admin-metrics';
import { listPendingVerifications } from '@/lib/services/verification';

interface AdminDashboardPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Dashboard del panel admin (`/admin`).
 *
 * Renderiza:
 *  1. Grid de KPIs globales sobre datos reales (bookings hoy, GMV
 *     semanal, providers pendientes, tasa de cancelación).
 *  2. Cola de verificaciones reales: lee Providers con
 *     `verificationStatus = 'pending'` y los mapea al shape que ya
 *     consume `VerificationsQueue`.
 *
 * Server Component: ambas lecturas se paralelizan con `Promise.all`
 * para minimizar la latencia inicial de la página.
 */
export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations('adminArea');

  const [metrics, pending] = await Promise.all([
    getAdminMetrics(),
    listPendingVerifications(locale as AppLocale),
  ]);

  return (
    <div data-component="admin-dashboard-page" className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-foreground text-3xl leading-tight sm:text-4xl">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t('dashboard.subtitle')}</p>
      </header>

      <AdminMetricsGrid metrics={metrics} />

      <VerificationsQueue requests={pending} />
    </div>
  );
}
