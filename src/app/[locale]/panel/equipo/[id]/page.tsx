import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ProfessionalForm } from '@/components/features/provider-panel/ProfessionalForm';
import { routing } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import {
  EMPTY_WEEKLY_SCHEDULE,
  getProfessionalDetail,
  listBlockingBookings,
  listTeamServiceOptions,
} from '@/lib/services/team';

interface PanelProfessionalPageProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Ficha editable de un profesional (`/panel/equipo/[id]`).
 *
 * La propiedad va en la consulta: un id de otro negocio da 404. Precarga
 * las citas futuras para que el diálogo de baja las enseñe antes de
 * intentarlo (la regla la vuelve a aplicar el servidor al confirmar).
 */
export default async function PanelProfessionalPage({ params }: PanelProfessionalPageProps) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { id: providerId } = await requireCurrentProvider(locale);
  const [professional, services, bookings] = await Promise.all([
    getProfessionalDetail(providerId, id),
    listTeamServiceOptions(providerId),
    listBlockingBookings(providerId, id),
  ]);
  if (!professional) {
    notFound();
  }

  return (
    <ProfessionalForm
      key={professional.id}
      locale={locale}
      providerId={providerId}
      services={services}
      professional={professional}
      defaultSchedule={EMPTY_WEEKLY_SCHEDULE}
      blockingBookings={bookings.map((b) => ({
        id: b.id,
        startAt: b.startAt.toISOString(),
        serviceName: b.serviceName,
      }))}
    />
  );
}
