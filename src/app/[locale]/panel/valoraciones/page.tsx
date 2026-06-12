import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  PanelPreviewToggle,
  PreviewBanner,
} from '@/components/features/provider-panel/PanelPreviewToggle';
import { ReceivedReviews } from '@/components/features/provider-panel/ReceivedReviews';
import type { PanelReview } from '@/components/features/provider-panel/ReceivedReviews/ReceivedReviews.types';
import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { isPanelPreviewActive } from '@/lib/auth/panel-preview';
import { prisma } from '@/lib/db/prisma';
import { fakePanelReviews } from '@/lib/fake-data/panel-reviews';
import { pickLocalized } from '@/lib/i18n/pickLocalized';
import type { LocalizedText } from '@/types/domain';

interface PanelReviewsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Valoraciones recibidas por el proveedor (`/panel/valoraciones`).
 *
 * Lee la cookie `yaiwell.panelPreview`: si está activa, muestra el set
 * de 12 reseñas fake (útil para visualizar la sección antes de tener
 * reseñas reales). Si no, consulta BD:
 *  - Review filtrado por `providerId`.
 *  - Join con `author` (User) para `authorName` (fullName ?? email).
 *  - Join con `booking.service` para `serviceName` traducido al locale.
 */
export default async function PanelReviewsPage({ params }: PanelReviewsPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const panelLocale = locale as AppLocale;
  const preview = await isPanelPreviewActive();
  const tPreview = await getTranslations('providerPanel.preview');

  let reviews: PanelReview[];
  if (preview) {
    reviews = fakePanelReviews;
  } else {
    const { id: providerId } = await requireCurrentProvider(panelLocale);
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

    reviews = records.map((r) => ({
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
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <PanelPreviewToggle
          locale={panelLocale}
          active={preview}
          showLabel={tPreview('show')}
          hideLabel={tPreview('hide')}
          pendingLabel={tPreview('pending')}
        />
      </div>
      {preview ? <PreviewBanner /> : null}
      <ReceivedReviews reviews={reviews} locale={panelLocale} />
    </div>
  );
}
