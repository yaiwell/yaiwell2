'use client';

import { useTranslations } from 'next-intl';

import { PhotoUploader } from '@/components/shared/PhotoUploader';
// Import directo y no desde `@/lib/services/team`: ese barrel reexporta
// servicios con Prisma y, en un Client Component, arrastraría
// `pg → dns/fs/net/tls` al bundle del navegador. `team.validation` solo
// depende de Zod y del esquema de horario (también sin Prisma).
import { PROFESSIONAL_BIO_MAX, PROFESSIONAL_NAME_MAX } from '@/lib/services/team/team.validation';

import { professionalFormStyles as s } from './ProfessionalForm.styles';
import type { ProfessionalDraft } from './ProfessionalForm.types';

interface ProfessionalProfileFieldsProps {
  providerId: string;
  draft: ProfessionalDraft;
  /** Foto con la que se abrió el formulario (precarga del uploader). */
  initialPhoto: string | null;
  onChange: <K extends keyof ProfessionalDraft>(key: K, value: ProfessionalDraft[K]) => void;
}

/**
 * Tarjeta «Perfil»: nombre, foto y presentación. La foto se sube con el
 * `PhotoUploader` compartido a `provider-photos/<providerId>/professionals/`.
 */
export function ProfessionalProfileFields({
  providerId,
  draft,
  initialPhoto,
  onChange,
}: ProfessionalProfileFieldsProps) {
  const t = useTranslations('providerPanel.team.form');

  return (
    <section className={s.card} data-component="professional-profile">
      <h2 className={s.cardTitle}>{t('profileTitle')}</h2>

      <div className={s.field}>
        <label className={s.label} htmlFor="professional-name">
          {t('nameLabel')}
        </label>
        <input
          id="professional-name"
          type="text"
          required
          maxLength={PROFESSIONAL_NAME_MAX}
          className={s.input}
          value={draft.name}
          placeholder={t('namePlaceholder')}
          onChange={(e) => onChange('name', e.target.value)}
          data-component="professional-input-name"
        />
      </div>

      <div className={s.field}>
        <span className={s.label}>{t('photoLabel')}</span>
        <p className={s.hint}>{t('photoHelp')}</p>
        <PhotoUploader
          bucket="provider-photos"
          ownerId={providerId}
          folder="professionals"
          maxFiles={1}
          initialUrls={initialPhoto ? [initialPhoto] : []}
          onChange={(urls) => onChange('photo', urls[0] ?? null)}
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="professional-bio">
          {t('bioLabel')}
        </label>
        <textarea
          id="professional-bio"
          maxLength={PROFESSIONAL_BIO_MAX}
          className={s.textarea}
          value={draft.bio}
          placeholder={t('bioPlaceholder')}
          onChange={(e) => onChange('bio', e.target.value)}
          aria-describedby="professional-bio-counter"
          data-component="professional-input-bio"
        />
        <span id="professional-bio-counter" className={s.hint}>
          {t('bioCounter', { count: draft.bio.length, max: PROFESSIONAL_BIO_MAX })}
        </span>
      </div>
    </section>
  );
}
