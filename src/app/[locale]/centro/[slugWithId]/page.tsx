import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ProviderDetail } from '@/components/features/provider/ProviderDetail';
import { routing, type AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n';
import { getProvidersAvailability } from '@/lib/services/availability';
import { getProviderSchedule, ProviderHasNoProfessionalError } from '@/lib/services/provider';
import { getProviderDetail } from '@/lib/services/providers';
import { parseProviderIdFromSlugWithId } from '@/lib/utils/provider-slug';
import type { ProviderWithAvailability } from '@/types/domain';

interface ProviderPageProps {
  // En Next.js 16 `params` es Promise.
  params: Promise<{ locale: string; slugWithId: string }>;
}

/**
 * Recupera el detalle del proveedor a partir del segmento `{slug}-{id}`
 * de la URL. Centraliza el parseo + lookup para que `generateMetadata`
 * y la propia página compartan la misma fuente de verdad y eviten
 * dos roundtrips al "repo".
 */
async function loadDetail(slugWithId: string) {
  const providerId = parseProviderIdFromSlugWithId(slugWithId);
  if (!providerId) return null;
  return getProviderDetail(providerId);
}

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const { locale, slugWithId } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const detail = await loadDetail(slugWithId);
  if (!detail) {
    const t = await getTranslations({ locale, namespace: 'providerDetail.notFound' });
    return { title: t('title') };
  }

  const { provider } = detail;
  const description = pickLocalized(provider.description, locale as AppLocale);

  return {
    title: `${provider.name} · Yaiwell`,
    description,
    openGraph: {
      title: provider.name,
      description,
      images: provider.photos[0] ? [{ url: provider.photos[0] }] : undefined,
    },
  };
}

/**
 * Ficha pública del proveedor — `/centro/[slug]-[id]`.
 *
 * Server Component que:
 *  1. Valida locale y formato del segmento `{slug}-{id}`.
 *  2. Llama `getProviderDetail`; un 404 limpio si no existe.
 *  3. Enriquece el proveedor con disponibilidad en este instante,
 *     porque el badge del header lo necesita y el service de detalle
 *     deliberadamente devuelve el `Provider` "crudo" para no acoplarse
 *     a la noción temporal de "ahora".
 *  4. Pasa todo al compositor `ProviderDetail`.
 */
export default async function ProviderPage({ params }: ProviderPageProps) {
  const { locale, slugWithId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const detail = await loadDetail(slugWithId);
  if (!detail) notFound();

  // Cargamos el horario real del provider en paralelo a la composición
  // del Provider enriquecido. Tolera `ProviderHasNoProfessionalError`
  // (provider sin Professional asociado → schedule null y el panel
  // esconde el bloque sin romper la página).
  // Ambas lecturas dependen sólo del providerId: van en paralelo para
  // no encadenar dos viajes a BD.
  const [schedule, availabilityByProvider] = await Promise.all([
    getProviderSchedule(detail.provider.id).catch((err) => {
      if (err instanceof ProviderHasNoProfessionalError) return null;
      throw err;
    }),
    getProvidersAvailability([detail.provider.id]),
  ]);

  // Enrichment local: el detalle del proveedor no incluye `availability`
  // ni `distanceKm` porque dependen del momento y del usuario; aquí
  // construimos un `ProviderWithAvailability` con disponibilidad real
  // (mismo motor que el listado) y `distanceKm = null` (la ficha
  // pública no pide geolocalización).
  const provider: ProviderWithAvailability = {
    ...detail.provider,
    availability: availabilityByProvider.get(detail.provider.id) ?? {
      status: 'busy',
      nextSlot: null,
    },
    distanceKm: null,
  };

  return (
    <ProviderDetail
      provider={provider}
      services={detail.services}
      reviews={detail.reviews}
      ratingBreakdown={detail.ratingBreakdown}
      schedule={schedule}
      locale={locale as 'es' | 'ca' | 'en' | 'de'}
    />
  );
}
