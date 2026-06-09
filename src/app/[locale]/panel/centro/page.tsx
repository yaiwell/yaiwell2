import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ProviderSettings } from '@/components/features/provider-panel/ProviderSettings';
import { routing } from '@/i18n/routing';
import { getProviderById } from '@/lib/fake-data/providers';

interface PanelSettingsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Configuración del centro (`/panel/centro`).
 *
 * Server Component que lee los datos del proveedor activo y los pasa
 * al formulario `ProviderSettings`. Mientras no haya persistencia los
 * inputs usan `defaultValue` y el botón "Guardar" es solo visual.
 */
export default async function PanelSettingsPage({ params }: PanelSettingsPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Mock fijo: en Fase 1 saldrá del proveedor autenticado.
  const provider = getProviderById('prov-01');
  if (!provider) {
    notFound();
  }

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return <ProviderSettings provider={provider} locale={panelLocale} />;
}
