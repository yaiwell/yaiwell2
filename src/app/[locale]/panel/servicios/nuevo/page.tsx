import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { AddServiceForm } from '@/components/features/provider-panel/AddServiceForm';
import { routing } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getServiceUsage } from '@/lib/services/billing/billing.plan-limits';
import { getCategoriesTree } from '@/lib/services/provider-panel';
import { isUnlimitedServices } from '@/lib/utils/plan-limits';

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
 *
 * Si el plan ya está en su límite de servicios, el formulario abre con
 * el aviso para mejorarlo. Es solo informativo: quien decide es la
 * action, que vuelve a comprobarlo en una transacción al publicar.
 */
export default async function PanelNewServicePage({ params }: PanelNewServicePageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';
  const { id: providerId } = await requireCurrentProvider(locale);
  const [categoriesTree, usage] = await Promise.all([
    getCategoriesTree(),
    getServiceUsage(prisma, providerId),
  ]);
  const planLimitReached =
    usage !== null &&
    !isUnlimitedServices(usage.maxServices) &&
    usage.activeCount >= usage.maxServices;

  return (
    <AddServiceForm
      locale={panelLocale}
      categoriesTree={categoriesTree}
      planLimitReached={planLimitReached}
    />
  );
}
