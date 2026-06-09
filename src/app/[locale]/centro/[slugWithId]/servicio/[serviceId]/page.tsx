import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ServiceDetail } from '@/components/features/service/ServiceDetail';
import { routing } from '@/i18n/routing';
import { getProviderService } from '@/lib/services/providers';
import { buildProviderSlugWithId, parseProviderIdFromSlugWithId } from '@/lib/utils/provider-slug';

interface ServicePageProps {
  // En Next.js 16 `params` es Promise; lo desempaquetamos al inicio del Server Component.
  params: Promise<{ locale: string; slugWithId: string; serviceId: string }>;
}

/**
 * Recupera `provider + service` a partir del segmento `{slug}-{id}` y
 * del `serviceId`. Centralizamos el parseo + lookup en una función
 * compartida entre `generateMetadata` y el render para evitar dos
 * roundtrips al repositorio.
 */
async function loadDetail(slugWithId: string, serviceId: string) {
  const providerId = parseProviderIdFromSlugWithId(slugWithId);
  if (!providerId) return null;
  return getProviderService(providerId, serviceId);
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { locale, slugWithId, serviceId } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const detail = await loadDetail(slugWithId, serviceId);
  if (!detail) {
    const t = await getTranslations({ locale, namespace: 'notFound' });
    return { title: t('title') };
  }

  const { provider, service } = detail;
  const typedLocale = locale as 'es' | 'ca' | 'en' | 'de';
  const serviceName = service.name[typedLocale] ?? service.name.es;
  const description = service.description[typedLocale] ?? service.description.es;

  return {
    title: `${serviceName} · ${provider.name} · Yaiwell`,
    description,
    openGraph: {
      title: `${serviceName} · ${provider.name}`,
      description,
      images: provider.photos[0] ? [{ url: provider.photos[0] }] : undefined,
    },
  };
}

/**
 * Ficha pública de un servicio dentro de un proveedor.
 *
 * Server Component que:
 *  1. Valida locale y formato del segmento `{slug}-{id}`.
 *  2. Llama a `getProviderService(providerId, serviceId)`; un 404 limpio
 *     si no existe o si el servicio no pertenece a ese proveedor (URL
 *     manipulada).
 *  3. Construye el `reserveHref` hacia la futura ruta de reserva. La
 *     URL la consume otro agente; aquí solo nos comprometemos al shape.
 *  4. Pasa todo al compositor presentacional `ServiceDetail`.
 *
 * Profesional asignado: el catálogo de Fase 0 no tiene profesionales
 * concretos por servicio (`service.professionalId` es siempre `null`),
 * por lo que pasamos `professional={null}` y la UI muestra el fallback
 * "cualquier profesional disponible del centro". Cuando se modele el
 * dominio `Professional` será cuestión de resolverlo aquí y pasarlo.
 */
export default async function ServicePage({ params }: ServicePageProps) {
  const { locale, slugWithId, serviceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const detail = await loadDetail(slugWithId, serviceId);
  if (!detail) notFound();

  const { provider, service } = detail;

  // Reconstruimos el segmento canónico para los breadcrumbs y para el
  // CTA "Reservar". Aunque la URL original ya contiene `slugWithId`,
  // pasarlo por `buildProviderSlugWithId` garantiza que cualquier
  // variación que llegue (slug obsoleto, mayúsculas) se normalice.
  const canonicalSlugWithId = buildProviderSlugWithId(provider);
  const reserveHref = `/centro/${canonicalSlugWithId}/reservar?serviceId=${service.id}`;

  return (
    <ServiceDetail
      provider={provider}
      service={service}
      professional={null}
      locale={locale as 'es' | 'ca' | 'en' | 'de'}
      reserveHref={reserveHref}
      providerSlugWithId={canonicalSlugWithId}
    />
  );
}
