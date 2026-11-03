import { ArrowUpRight, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProfessionalAvatar } from '@/components/shared/ProfessionalAvatar';
import { Link } from '@/i18n/navigation';
import { pickLocalized } from '@/lib/i18n/pickLocalized';

import { canAddProfessional, hasOutOfPlan, statusKey } from './TeamList.logic';
import { teamListStyles as s } from './TeamList.styles';
import type { TeamListProps } from './TeamList.types';

const BADGE_CLASS = {
  active: s.badgeActive,
  outOfPlan: s.badgeOutOfPlan,
  inactive: s.badgeInactive,
} as const;

/**
 * Listado del equipo del negocio (`/panel/equipo`).
 *
 * Sin estado: se pinta en servidor. Muestra el contador del plan, el
 * aviso si hay profesionales fuera de plan (no aceptan reservas nuevas)
 * y los servicios publicados que se han quedado sin nadie que los preste.
 */
export function TeamList({ overview, locale }: TeamListProps) {
  const t = useTranslations('providerPanel.team');
  const canAdd = canAddProfessional(overview);

  return (
    <section className={s.root} data-component="team-list">
      <header className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.title}>{t('title')}</h1>
          <p className={s.subtitle}>{t('subtitle')}</p>
          <p className={s.counter} data-component="team-counter">
            {overview.maxProfessionals === null
              ? t('counterUnlimited', { active: overview.activeCount })
              : t('counter', { active: overview.activeCount, max: overview.maxProfessionals })}
          </p>
        </div>
        {canAdd ? (
          <Link href="/panel/equipo/nuevo" className={s.addCta} data-component="team-add">
            <Plus className="size-4" aria-hidden />
            {t('addCta')}
          </Link>
        ) : null}
      </header>

      {!canAdd || hasOutOfPlan(overview) ? (
        <div role="status" className={s.notice} data-component="team-plan-notice">
          <p>{hasOutOfPlan(overview) ? t('outOfPlanNotice') : t('limitReached')}</p>
          <Link href="/panel/plan" className={s.noticeLink}>
            {t('upgradeCta')}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : null}

      {overview.unstaffedServices.length > 0 ? (
        <div role="alert" className={s.warning} data-component="team-unstaffed">
          <p className={s.warningTitle}>{t('unstaffedTitle')}</p>
          <p>{t('unstaffedDescription')}</p>
          <ul className={s.warningList}>
            {overview.unstaffedServices.map((service) => (
              <li key={service.id}>{pickLocalized(service.name, locale)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {overview.members.length === 0 ? (
        <p className={s.empty}>{t('empty')}</p>
      ) : (
        <ul className={s.list}>
          {overview.members.map((member) => (
            <li
              key={member.id}
              className={member.status === 'inactive' ? `${s.card} ${s.cardInactive}` : s.card}
              data-component="team-member"
              data-status={member.status}
            >
              {/* Decorativo: el nombre va justo al lado. */}
              <ProfessionalAvatar name={member.name} photo={member.photo} size="md" />
              <div className={s.cardMain}>
                <p className={s.cardName}>{member.name}</p>
                <div className={s.cardMeta}>
                  <span className={`${s.badge} ${BADGE_CLASS[member.status]}`}>
                    {t(statusKey(member.status))}
                  </span>
                  <span>{t('serviceCount', { count: member.serviceCount })}</span>
                </div>
              </div>
              <Link href={`/panel/equipo/${member.id}`} className={s.editLink}>
                {t('edit')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
