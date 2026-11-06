import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { FounderSeatNotice, VerificationDetail } from '@/components/features/admin';
import { routing, type AppLocale } from '@/i18n/routing';
import { getFounderSeatPreview } from '@/lib/services/billing';
import { getVerificationDetail } from '@/lib/services/verification';

interface VerificationDetailPageProps {
  // En Next.js 16 los `params` son Promises.
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Ficha de verificación individual (`/admin/verificaciones/[id]`).
 *
 * El segmento `[id]` es ahora el `Provider.id` real (UUID v4); el
 * routing no cambió porque el segmento acepta cualquier string. Si
 * no existe el provider o ya fue soft-deleted, devolvemos 404.
 *
 * `VerificationDetail` ya es Client Component con server actions
 * cableadas a `approve`/`reject`; aquí solo le pasamos `request` y
 * `locale` (la action necesita el locale para construir la URL del
 * `redirect` post-decisión).
 */
export default async function VerificationDetailPage({ params }: VerificationDetailPageProps) {
  const { locale, id } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const request = await getVerificationDetail(id, locale as AppLocale);
  if (!request) {
    notFound();
  }
  const founderSeat = await getFounderSeatPreview(id);

  return (
    <div data-component="admin-verification-detail-page" className="flex flex-col gap-6">
      <FounderSeatNotice preview={founderSeat} />
      <VerificationDetail request={request} locale={locale as AppLocale} />
    </div>
  );
}
