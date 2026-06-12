import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { AddServiceForm } from '@/components/features/provider-panel/AddServiceForm';
import { routing } from '@/i18n/routing';
import { getCategoriesTree } from '@/lib/services/provider-panel';

interface PanelNewServicePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Alta de un nuevo servicio (`/panel/servicios/nuevo`).
 *
 * Pre-carga el árbol de categorías desde BD y lo pasa al formulario
 * para que la cascada (raíz → tipo → subtipo) no dependa de fake-data
 * ni necesite una API client-side adicional. La persistencia del alta
 * se hace vía la server action `createServiceAction` co-localizada.
 */
export default async function PanelNewServicePage({ params }: PanelNewServicePageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';
  const categoriesTree = await getCategoriesTree();

  return <AddServiceForm locale={panelLocale} categoriesTree={categoriesTree} />;
}
