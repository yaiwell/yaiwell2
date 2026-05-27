import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { VerificationDetail } from '@/components/features/admin';
import { routing } from '@/i18n/routing';
import { getVerificationById } from '@/lib/fake-data/admin-verifications';

interface VerificationDetailPageProps {
  // En Next.js 16 los `params` son Promises.
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Ficha de verificación individual (`/admin/verificaciones/[id]`).
 *
 * Server Component que:
 *  1. Valida el locale.
 *  2. Busca la solicitud por id; si no existe devuelve 404.
 *  3. Renderiza el componente cliente `VerificationDetail` que se
 *     encarga de la interacción aprobar/rechazar mock.
 */
export default async function VerificationDetailPage({ params }: VerificationDetailPageProps) {
  const { locale, id } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const request = getVerificationById(id);
  if (!request) {
    notFound();
  }

  return (
    <div data-component="admin-verification-detail-page" className="flex flex-col gap-6">
      <VerificationDetail request={request} />
    </div>
  );
}
