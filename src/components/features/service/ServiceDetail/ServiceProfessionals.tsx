import { useTranslations } from 'next-intl';

import { ProfessionalAvatar } from '@/components/shared/ProfessionalAvatar';

import { serviceDetailStyles as s } from './ServiceDetail.styles';
import type { ServiceProfessionalsProps } from './ServiceDetail.types';

/**
 * Bloque «Quién lo presta» de la ficha de servicio (CLAUDE.md §4.bis
 * «Equipo»): avatar, nombre y bio de cada profesional que lo presta.
 *
 * Sin nadie asignado (caso que el onboarding no debería permitir) cae al
 * mensaje genérico de «cualquier profesional del centro» con la inicial
 * del negocio. Con varios, recuerda que se elige al reservar.
 */
export function ServiceProfessionals({ professionals, providerName }: ServiceProfessionalsProps) {
  const t = useTranslations('serviceDetail');

  return (
    <section
      className={s.section}
      aria-labelledby="service-detail-team-heading"
      data-component="service-detail-professional"
    >
      <h2 id="service-detail-team-heading" className={s.sectionTitle}>
        {t('team.title')}
      </h2>
      {professionals.length === 0 ? (
        <div className={s.professionalCard}>
          <ProfessionalAvatar name={providerName} size="lg" />
          <span className={s.professionalName}>{t('header.anyProfessional')}</span>
        </div>
      ) : (
        <ul className={s.professionalList}>
          {professionals.map((professional) => (
            <li
              key={professional.id}
              className={s.professionalCard}
              data-component="service-detail-professional-item"
            >
              <ProfessionalAvatar name={professional.name} photo={professional.photo} size="lg" />
              <div className={s.professionalInfo}>
                <span className={s.professionalName}>{professional.name}</span>
                {professional.bio && <span className={s.professionalRole}>{professional.bio}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {professionals.length > 1 && <p className={s.professionalHint}>{t('team.chooseHint')}</p>}
    </section>
  );
}
