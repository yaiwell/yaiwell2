import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ReceivedReviews } from '@/components/features/provider-panel/ReceivedReviews';
import type { PanelReview } from '@/components/features/provider-panel/ReceivedReviews/ReceivedReviews.types';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { pickLocalized } from '@/lib/i18n/pickLocalized';
import type { LocalizedText } from '@/types/domain';

interface PanelReviewsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Valoraciones recibidas por el proveedor (`/panel/valoraciones`).
 *
 * Consulta BD las reseñas del proveedor autenticado:
 *  - Review filtrado por `providerId`.
 *  - Join con `author` (User) para `authorName` (fullName ?? email).
 *  - Join con `booking.service` para `serviceName` traducido al locale.
 *
 * Adapta la columna nullable `providerResponse` (string) +
 * `providerResponseAt` (DateTime) al sub-objeto `{ text, respondedAt }`
 * que el componente espera. Si una de las dos es null, tratamos la
 * respuesta como ausente.
 */
export default async function PanelReviewsPage({ params }: PanelReviewsPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { id: providerId } = await requireCurrentProvider(locale);
  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  const records = await prisma.review.findMany({
    where: { providerId },
    select: {
      id: true,
      rating: true,
      text: true,
      providerResponse: true,
      providerResponseAt: true,
      createdAt: true,
      author: { select: { fullName: true, email: true } },
      booking: {
        select: {
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Adaptación BD → view-model PanelReview.
  const reviews: PanelReview[] = records.map((r) => ({
    id: r.id,
    // Si el autor borró su nombre completo caemos al email (siempre
    // existe por unique constraint en User).
    authorName: r.author.fullName ?? r.author.email,
    // `rating` en BD es Int (1-5); casteo seguro al union literal.
    rating: r.rating as 1 | 2 | 3 | 4 | 5,
    text: r.text,
    serviceName: pickLocalized(r.booking.service.name as unknown as LocalizedText, panelLocale),
    createdAt: r.createdAt,
    // Tratamos la respuesta como presente solo si ambas columnas existen.
    providerResponse:
      r.providerResponse && r.providerResponseAt
        ? { text: r.providerResponse, respondedAt: r.providerResponseAt }
        : null,
  }));

  return <ReceivedReviews reviews={reviews} locale={panelLocale} />;
}
