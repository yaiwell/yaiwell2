import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { AddServiceForm } from '@/components/features/provider-panel/AddServiceForm';
import { routing } from '@/i18n/routing';

interface PanelNewServicePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Alta de un nuevo servicio (`/panel/servicios/nuevo`).
 *
 * Renderiza el formulario con cascada de categorías. El componente es
 * Client porque la cascada (raíz → tipo → subtipo) requiere estado
 * interactivo; el resto del árbol del panel sigue siendo Server.
 */
export default async function PanelNewServicePage({ params }: PanelNewServicePageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return <AddServiceForm locale={panelLocale} />;
}
