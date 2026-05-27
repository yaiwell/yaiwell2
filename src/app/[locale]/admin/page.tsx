import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdminMetricsGrid, VerificationsQueue } from '@/components/features/admin';
import { routing } from '@/i18n/routing';
import { fakeAdminMetrics } from '@/lib/fake-data/admin-metrics';
import { getPendingVerifications } from '@/lib/fake-data/admin-verifications';

interface AdminDashboardPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Dashboard del panel admin (`/admin`).
 *
 * Renderiza:
 *  1. Grid de KPIs globales (reservas hoy, GMV semana, etc.).
 *  2. Cola de verificaciones pendientes con CTA por solicitud para
 *     abrir su ficha detallada.
 *
 * Server Component: leemos los datos fake de forma síncrona en
 * tiempo de render. En Fase 1 esto se reemplazará por llamadas a
 * los repositorios y se mantendrá el mismo árbol de componentes.
 */
export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations('adminArea');
  const pending = getPendingVerifications();

  return (
    <div data-component="admin-dashboard-page" className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-foreground text-3xl leading-tight sm:text-4xl">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t('dashboard.subtitle')}</p>
      </header>

      <AdminMetricsGrid metrics={fakeAdminMetrics} />

      <VerificationsQueue requests={pending} />
    </div>
  );
}
