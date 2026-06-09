import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ServicesList } from '@/components/features/provider-panel/ServicesList';
import { routing } from '@/i18n/routing';
import { fakePanelServices } from '@/lib/fake-data/panel-services';

interface PanelServicesPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Listado de servicios del panel (`/panel/servicios`).
 *
 * Server Component que pasa el catálogo mock al componente
 * `ServicesList`. La acción "nuevo servicio" enlaza con la subruta
 * `/panel/servicios/nuevo`.
 */
export default async function PanelServicesPage({ params }: PanelServicesPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return <ServicesList services={fakePanelServices} locale={panelLocale} />;
}
