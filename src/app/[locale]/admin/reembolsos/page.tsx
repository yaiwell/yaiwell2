import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RefundsQueue } from '@/components/features/admin';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';
import { listPendingRefunds } from '@/lib/services/checkout';

interface AdminRefundsPageProps {
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Metadatos de `/admin/reembolsos`.
 *
 * Herramienta interna: nunca debe indexarse, aunque el layout ya exija
 * rol admin y un buscador no pueda llegar a verla.
 */
export async function generateMetadata({ params }: AdminRefundsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'adminArea.refunds.meta' });

  return {
    title: t('title'),
    robots: { index: false, follow: false },
  };
}

/**
 * Cola de reembolsos fallidos (`/admin/reembolsos`).
 *
 * Lista las reservas cuyo reembolso rechazó Stripe y que siguen sin
 * devolverse, las más antiguas primero, con un botón para reintentar
 * cada una. El guard de admin se repite aquí (además del layout) y en
 * la server action de reintento.
 */
export default async function AdminRefundsPage({ params }: AdminRefundsPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Guard propio además del del layout: con renderizado parcial el
  // layout no se vuelve a ejecutar en cada navegación y esta página
  // expone emails de clientes. Ver la guía de autenticación de Next.
  await requireRole(['admin'], locale);

  const t = await getTranslations('adminArea.refunds');
  const refunds = await listPendingRefunds();

  return (
    <div data-component="admin-refunds-page" className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-foreground text-3xl leading-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t('subtitle')}</p>
      </header>

      <RefundsQueue refunds={refunds} locale={locale} />
    </div>
  );
}
