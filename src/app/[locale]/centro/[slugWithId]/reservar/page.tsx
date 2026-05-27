import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BookingFlow } from '@/components/features/booking/BookingFlow';
import { routing } from '@/i18n/routing';
import { getProviderDetail } from '@/lib/services/providers';
import { parseProviderIdFromSlugWithId } from '@/lib/utils/provider-slug';

/**
 * Página del flujo de reserva mock para un servicio concreto.
 *
 * URL: `/centro/{slug}-{id}/reservar?serviceId=svc-XX`.
 *
 * Server Component que valida locale + segmento del proveedor, resuelve
 * el servicio dentro del catálogo del proveedor y pasa todo al
 * orquestador cliente `BookingFlow`. Cualquier 404 (proveedor o servicio
 * inexistentes, o query inválida) responde con `notFound()` antes de
 * llegar al cliente.
 */

interface BookingPageProps {
  // Next.js 16: tanto params como searchParams se entregan como Promise.
  params: Promise<{ locale: string; slugWithId: string }>;
  searchParams: Promise<{ serviceId?: string | string[] }>;
}

/**
 * Centraliza la resolución de proveedor + servicio para compartir la
 * misma fuente de verdad entre `generateMetadata` y `page`.
 */
async function loadProviderAndService(slugWithId: string, serviceId: string | undefined) {
  const providerId = parseProviderIdFromSlugWithId(slugWithId);
  if (!providerId || !serviceId) return null;

  const detail = await getProviderDetail(providerId);
  if (!detail) return null;

  const service = detail.services.find((s) => s.id === serviceId);
  if (!service) return null;

  return { provider: detail.provider, service };
}

/**
 * Helper para normalizar el `serviceId` cuando viene como string[] (caso
 * teórico si el usuario manipula la query); cogemos siempre el primer valor.
 */
function pickServiceId(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'booking.meta' });
  return { title: t('title') };
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { locale, slugWithId } = await params;
  const { serviceId: serviceIdRaw } = await searchParams;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const serviceId = pickServiceId(serviceIdRaw);
  const loaded = await loadProviderAndService(slugWithId, serviceId);
  if (!loaded) notFound();

  return (
    <BookingFlow
      provider={loaded.provider}
      service={loaded.service}
      locale={locale as 'es' | 'ca'}
      providerSlugWithId={slugWithId}
    />
  );
}
