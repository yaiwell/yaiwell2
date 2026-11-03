import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ProfessionalForm } from '@/components/features/provider-panel/ProfessionalForm';
import { routing } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import {
  EMPTY_WEEKLY_SCHEDULE,
  getProfessionalDetail,
  listActiveProfessionalOptions,
  listTeamServiceOptions,
} from '@/lib/services/team';

interface PanelNewProfessionalPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Alta de un profesional (`/panel/equipo/nuevo`).
 *
 * El horario arranca con el del profesional más antiguo (el horario de
 * siempre del negocio): lo normal es que el nuevo trabaje en las mismas
 * horas y solo retoque lo que cambie. El cupo del plan lo comprueba la
 * action al guardar.
 */
export default async function PanelNewProfessionalPage({ params }: PanelNewProfessionalPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { id: providerId } = await requireCurrentProvider(locale);
  const [services, active] = await Promise.all([
    listTeamServiceOptions(providerId),
    listActiveProfessionalOptions(providerId),
  ]);
  const senior = active[0] ? await getProfessionalDetail(providerId, active[0].id) : null;

  return (
    <ProfessionalForm
      locale={locale}
      providerId={providerId}
      services={services}
      defaultSchedule={senior?.schedule ?? EMPTY_WEEKLY_SCHEDULE}
    />
  );
}
