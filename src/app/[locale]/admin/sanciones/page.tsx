import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SanctionsList } from '@/components/features/admin';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';
import {
  listActiveSanctionsForSupport,
  supportSanctionsFilterSchema,
} from '@/lib/services/sanctions';

interface AdminSanctionsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string | string[] }>;
}

/** Metadatos de `/admin/sanciones`: herramienta interna, nunca se indexa. */
export async function generateMetadata({ params }: AdminSanctionsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'adminArea.sanctions.meta' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * Sanciones vigentes por no presentado (`/admin/sanciones`, §4.bis).
 *
 * Soporte busca por email del cliente (`?email=`) y retira la sanción
 * con un motivo. Guard de admin propio, además del del layout: con
 * renderizado parcial el layout no se repite en cada navegación y esta
 * página expone emails de clientes.
 */
export default async function AdminSanctionsPage({
  params,
  searchParams,
}: AdminSanctionsPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  await requireRole(['admin'], locale);

  const { email: rawEmail } = await searchParams;
  const parsed = supportSanctionsFilterSchema.safeParse({
    email: Array.isArray(rawEmail) ? rawEmail[0] : rawEmail,
  });
  const emailFilter = parsed.success ? (parsed.data.email ?? null) : null;

  const t = await getTranslations('adminArea.sanctions');
  const sanctions = await listActiveSanctionsForSupport({ email: emailFilter });

  return (
    <div data-component="admin-sanctions-page" className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-foreground text-3xl leading-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t('subtitle')}</p>
      </header>

      <SanctionsList sanctions={sanctions} locale={locale} emailFilter={emailFilter} />
    </div>
  );
}
