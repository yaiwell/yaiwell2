'use client';

import { useTranslations } from 'next-intl';

import { LangSwitcher } from '@/components/shared/LangSwitcher';
import { LocationPill } from '@/components/shared/LocationPill';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { routing, type AppLocale } from '@/i18n/routing';

import { useEmailLocale } from './AccountPreferencesCard.logic';
import { accountSettingsStyles as s } from './AccountSettings.styles';
import type { AccountPreferencesCardProps } from './AccountSettings.types';

/**
 * Tarjeta de preferencias. Idioma, tema y ubicación reutilizan los mismos
 * controles que la cabecera; aquí solo es nuevo el idioma de los correos.
 */
export function AccountPreferencesCard({ emailLocale }: AccountPreferencesCardProps) {
  const t = useTranslations('account.settings.preferences');
  const tNames = useTranslations('langSwitcher.names');
  const { value, feedback, isPending, change } = useEmailLocale(emailLocale);

  return (
    <section
      className={s.card}
      aria-labelledby="account-preferences-title"
      data-component="account-preferences"
    >
      <h2 id="account-preferences-title" className={s.title}>
        {t('title')}
      </h2>

      <div className={s.row}>
        <div className={s.rowInline}>
          <span className={s.label}>{t('language')}</span>
          <LangSwitcher />
        </div>
      </div>

      <div className={s.row}>
        <label className={s.field}>
          <span className={s.label}>{t('emailLanguage')}</span>
          <select
            className={s.input}
            value={value}
            disabled={isPending}
            onChange={(event) => change(event.target.value as AppLocale)}
            data-component="account-email-locale"
          >
            {routing.locales.map((locale) => (
              <option key={locale} value={locale}>
                {tNames(locale)}
              </option>
            ))}
          </select>
        </label>
        <p className={s.hint}>{t('emailLanguageHint')}</p>
        <span role="status" aria-live="polite">
          {feedback === 'saved' ? <span className={s.saved}>{t('saved')}</span> : null}
          {feedback === 'error' ? <span className={s.error}>{t('error')}</span> : null}
        </span>
      </div>

      <div className={s.row}>
        <div className={s.rowInline}>
          <span className={s.label}>{t('theme')}</span>
          <ThemeToggle />
        </div>
      </div>

      <div className={s.row}>
        <div className={s.rowInline}>
          <span className={s.label}>{t('location')}</span>
          <LocationPill />
        </div>
        <p className={s.hint}>{t('locationHint')}</p>
      </div>

      <div className={s.row}>
        <span className={s.label}>{t('emails')}</span>
        <p className={s.hint}>{t('emailsHint')}</p>
      </div>
    </section>
  );
}
