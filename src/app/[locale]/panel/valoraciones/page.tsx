import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ReceivedReviews } from '@/components/features/provider-panel/ReceivedReviews';
import { MockDataBanner } from '@/components/shared/MockDataBanner';
import { routing } from '@/i18n/routing';
import { fakePanelReviews } from '@/lib/fake-data/panel-reviews';

interface PanelReviewsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Valoraciones recibidas por el proveedor (`/panel/valoraciones`).
 *
 * Server Component que pasa las reseñas mock al componente
 * `ReceivedReviews`. La barra de filtros (estrellas, periodo, sin
 * respuesta) es interactiva y se gestiona como Client Component
 * dentro de ese árbol.
 */
export default async function PanelReviewsPage({ params }: PanelReviewsPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return (
    <div className="flex flex-col gap-6">
      <MockDataBanner />
      <ReceivedReviews reviews={fakePanelReviews} locale={panelLocale} />
    </div>
  );
}
