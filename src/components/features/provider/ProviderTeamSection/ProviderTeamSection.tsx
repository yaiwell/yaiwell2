import { useTranslations } from 'next-intl';

import { ProfessionalAvatar } from '@/components/shared/ProfessionalAvatar';

import { providerTeamSectionStyles as s } from './ProviderTeamSection.styles';
import type { ProviderTeamSectionProps } from './ProviderTeamSection.types';

/**
 * Sección «El equipo» de la ficha del centro (CLAUDE.md §4.bis
 * «Equipo»): avatar o iniciales, nombre y bio opcional de cada
 * profesional.
 *
 * Server Component presentacional. Renderiza su propio `<h2>` con
 * `id="provider-team-heading"` para que `ProviderDetail` lo referencie
 * con `aria-labelledby`. Cuándo se enseña lo decide el compositor con
 * `shouldShowTeam`.
 */
export function ProviderTeamSection({ team }: ProviderTeamSectionProps) {
  const t = useTranslations('providerDetail.team');

  return (
    <div className={s.section} data-component="provider-team">
      <header className={s.header}>
        <h2 id="provider-team-heading" className={s.heading}>
          {t('title')}
        </h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>
      <ul className={s.list}>
        {team.map((member) => (
          <li key={member.id} className={s.item} data-component="provider-team-member">
            <ProfessionalAvatar name={member.name} photo={member.photo} size="lg" />
            <div className={s.body}>
              <h3 className={s.name}>{member.name}</h3>
              {member.bio && <p className={s.bio}>{member.bio}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
