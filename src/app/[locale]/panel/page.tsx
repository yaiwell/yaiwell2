import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BillingStatusBanner } from '@/components/features/provider-panel/BillingStatusBanner';
import { DashboardMetrics } from '@/components/features/provider-panel/DashboardMetrics';
import {
  PanelPreviewToggle,
  PreviewBanner,
} from '@/components/features/provider-panel/PanelPreviewToggle';
import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { isPanelPreviewActive } from '@/lib/auth/panel-preview';
import { fakePanelWeeklyMetrics } from '@/lib/fake-data/panel-metrics';
import { getProviderBillingSummary, type ProviderBillingSummary } from '@/lib/services/billing';
import { getWeeklyMetrics } from '@/lib/services/provider-panel';

interface PanelDashboardPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Dashboard del panel del proveedor (`/panel`).
 *
 * Lee la cookie `yaiwell.panelPreview`: si está activa, renderiza el
 * snapshot fake (útil para que un provider sin reservas vea cómo se
 * verá el panel cuando llegue tracción). Si no, computa el snapshot
 * real desde BD.
 *
 * El toggle vive en el header de la página y comparte estado con las
 * otras 2 páginas que también soportan preview (`/calendario` y
 * `/valoraciones`).
 *
 * Fuera del modo preview pinta el aviso de facturación del plan
 * (cobro fallido, cancelación o bajada programadas) solo si lo hay:
 * `BillingStatusBanner` no renderiza nada en estado normal.
 *
 * La ocupación real queda en 0 hasta cálculo basado en
 * Professional.schedule (Fase 1).
 */
export default async function PanelDashboardPage({ params }: PanelDashboardPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const panelLocale = locale as AppLocale;
  const preview = await isPanelPreviewActive();

  let metrics;
  let billingSummary: ProviderBillingSummary | null = null;
  if (preview) {
    metrics = fakePanelWeeklyMetrics;
  } else {
    const { id: providerId } = await requireCurrentProvider(panelLocale);
    // El aviso de facturación es secundario: si el resumen falla, el
    // dashboard se pinta igual sin él.
    [metrics, billingSummary] = await Promise.all([
      getWeeklyMetrics(providerId),
      getProviderBillingSummary(providerId).catch((err) => {
        console.error('[panel] billing summary failed:', err);
        return null;
      }),
    ]);
  }

  const tPreview = await getTranslations('providerPanel.preview');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <PanelPreviewToggle
          locale={panelLocale}
          active={preview}
          showLabel={tPreview('show')}
          hideLabel={tPreview('hide')}
          pendingLabel={tPreview('pending')}
        />
      </div>
      {preview ? <PreviewBanner /> : null}
      {billingSummary ? (
        <BillingStatusBanner summary={billingSummary} locale={panelLocale} showPlanLink />
      ) : null}
      <DashboardMetrics metrics={metrics} locale={panelLocale} />
    </div>
  );
}
