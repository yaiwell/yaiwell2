import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { TeamList } from '@/components/features/provider-panel/TeamList';
import { routing } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { getTeamOverview } from '@/lib/services/team';

interface PanelTeamPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Equipo del negocio (`/panel/equipo`): profesionales activos, fuera de
 * plan y de baja, con el contador del plan (CLAUDE.md §4.bis «Equipo»).
 */
export default async function PanelTeamPage({ params }: PanelTeamPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { id: providerId } = await requireCurrentProvider(locale);
  const overview = await getTeamOverview(providerId);

  return <TeamList overview={overview} locale={locale} />;
}
