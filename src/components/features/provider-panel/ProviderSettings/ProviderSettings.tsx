'use client';

import { Building2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { pickLocalized } from '@/lib/i18n/pickLocalized';

import { ProviderPhotosCard } from './ProviderPhotosCard';
import { useProviderSettingsForm } from './ProviderSettings.logic';
import { providerSettingsStyles as s } from './ProviderSettings.styles';
import type { ProviderSettingsProps, SaveErrorCode } from './ProviderSettings.types';

/**
 * Mapea el `code` de error de la action a la clave i18n completa dentro
 * del namespace `providerPanel.settings`. Mantener las claves explícitas
 * (no construirlas con template strings) permite que next-intl valide
 * los tipos en tiempo de compilación.
 */
const ERROR_MESSAGE_KEY: Record<
  SaveErrorCode,
  'save.errors.notFound' | 'save.errors.validation' | 'save.errors.internal'
> = {
  PROVIDER_NOT_FOUND: 'save.errors.notFound',
  VALIDATION: 'save.errors.validation',
  INTERNAL: 'save.errors.internal',
};

/**
 * Pantalla de configuración del centro.
 *
 * Client Component (form controlado + submit con `useTransition`). La
 * lógica de estado/persistencia vive en `useProviderSettingsForm`; este
 * componente solo compone UI a partir del hook. Los campos que el wizard
 * de onboarding aún no recoge (phone, email contacto, ciudad/CP por
 * separado, horario semanal) siguen siendo placeholders inertes — entrarán
 * cuando el formulario los recoja de verdad.
 */
export function ProviderSettings({ provider, locale }: ProviderSettingsProps) {
  const t = useTranslations('providerPanel.settings');
  const tCommon = useTranslations('common');

  // `pickLocalized` aplica fallback locale → es si el JSON no tiene
  // la lengua actual (los providers nuevos solo guardan ES/CA).
  const initialDescription = pickLocalized(provider.description, locale);

  const { draft, notice, isPending, updateField, submit } = useProviderSettingsForm(locale, {
    businessName: provider.businessName,
    vatNumber: provider.vatNumber ?? '',
    description: initialDescription,
    address: provider.address,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  return (
    <form className={s.root} onSubmit={handleSubmit} data-component="provider-settings">
      <header className={s.header}>
        <h1 className={s.title}>{t('title')}</h1>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      <article className={s.card} data-component="provider-settings-general">
        <header>
          <h2 className={s.cardTitle}>{t('general.title')}</h2>
        </header>

        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-name">
              {t('general.businessNameLabel')}
            </label>
            <input
              id="settings-name"
              type="text"
              className={s.input}
              value={draft.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              disabled={isPending}
              data-component="settings-input-name"
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-vat">
              {t('general.vatLabel')}
            </label>
            <input
              id="settings-vat"
              type="text"
              className={s.input}
              value={draft.vatNumber}
              placeholder="B12345678"
              onChange={(e) => updateField('vatNumber', e.target.value)}
              disabled={isPending}
              data-component="settings-input-vat"
            />
          </div>
          {/* Teléfono y email de contacto del negocio no se piden en el
              wizard de alta — quedan en blanco con placeholder hasta que
              el flujo Fase 1 los recoja. */}
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-phone">
              {t('general.phoneLabel')}
            </label>
            <input
              id="settings-phone"
              type="tel"
              className={s.input}
              defaultValue=""
              placeholder="+34 600 000 000"
              disabled
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-email">
              {t('general.emailLabel')}
            </label>
            <input
              id="settings-email"
              type="email"
              className={s.input}
              defaultValue=""
              placeholder="contacto@ejemplo.com"
              disabled
            />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="settings-description">
            {t('general.descriptionLabel')}
          </label>
          <textarea
            id="settings-description"
            className={s.textarea}
            value={draft.description}
            onChange={(e) => updateField('description', e.target.value)}
            disabled={isPending}
            data-component="settings-input-description"
          />
        </div>
      </article>

      <article className={s.card} data-component="provider-settings-address">
        <header>
          <h2 className={s.cardTitle}>{t('address.title')}</h2>
        </header>

        <div className={s.field}>
          <label className={s.label} htmlFor="settings-street">
            {t('address.streetLabel')}
          </label>
          <input
            id="settings-street"
            type="text"
            className={s.input}
            value={draft.address}
            onChange={(e) => updateField('address', e.target.value)}
            disabled={isPending}
            data-component="settings-input-street"
          />
        </div>

        {/* Ciudad y código postal no se guardan por separado en BD
            (la dirección viene de Mapbox como string completo). Dejamos
            los inputs deshabilitados con placeholder hasta que el flujo
            Fase 1 decida si descomponer o no la dirección. */}
        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-city">
              {t('address.cityLabel')}
            </label>
            <input
              id="settings-city"
              type="text"
              className={s.input}
              defaultValue=""
              placeholder="Barcelona"
              disabled
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-postal">
              {t('address.postalLabel')}
            </label>
            <input
              id="settings-postal"
              type="text"
              className={s.input}
              defaultValue=""
              placeholder="08008"
              disabled
            />
          </div>
        </div>
      </article>

      <article className={s.card} data-component="provider-settings-schedule">
        <header>
          <h2 className={s.cardTitle}>{t('schedule.title')}</h2>
          <p className={s.cardSubtitle}>{t('schedule.subtitle')}</p>
        </header>

        <div className={s.scheduleRow} data-component="settings-schedule-weekdays">
          <span className={s.scheduleLabel}>{t('schedule.weekdaysLabel')}</span>
          <div className={s.scheduleControls}>
            <input
              type="time"
              defaultValue="10:00"
              className={s.scheduleTime}
              aria-label={t('schedule.openFrom')}
              disabled
            />
            <input
              type="time"
              defaultValue="20:00"
              className={s.scheduleTime}
              aria-label={t('schedule.openTo')}
              disabled
            />
          </div>
        </div>

        <div className={s.scheduleRow} data-component="settings-schedule-saturday">
          <span className={s.scheduleLabel}>{t('schedule.saturdayLabel')}</span>
          <div className={s.scheduleControls}>
            <input
              type="time"
              defaultValue="10:00"
              className={s.scheduleTime}
              aria-label={t('schedule.openFrom')}
              disabled
            />
            <input
              type="time"
              defaultValue="14:00"
              className={s.scheduleTime}
              aria-label={t('schedule.openTo')}
              disabled
            />
          </div>
        </div>

        <div className={s.scheduleRow} data-component="settings-schedule-sunday">
          <span className={s.scheduleLabel}>{t('schedule.sundayLabel')}</span>
          <span className={s.scheduleClosed}>{t('schedule.closed')}</span>
        </div>
      </article>

      <ProviderPhotosCard
        locale={locale}
        providerId={provider.id}
        initialUrls={provider.photos}
        cardTitle={t('photos.title')}
        cardSubtitle={t('photos.subtitle')}
        errorMessage={t('photos.error')}
        cardClass={s.card}
        cardTitleClass={s.cardTitle}
        cardSubtitleClass={s.cardSubtitle}
      />

      {/* Card "Próximamente": añadir otro negocio. Visible siempre — el
          mensaje es neutro para autónomos y centros. La feature
          multi-negocio entra en Fase 1 (CLAUDE.md §10). */}
      <aside
        className={s.multiBusinessCard}
        data-component="provider-settings-multi-business"
        aria-labelledby="multi-business-title"
      >
        <div className={s.multiBusinessInfo}>
          <h2 id="multi-business-title" className={s.multiBusinessTitle}>
            <Building2 className="size-5" aria-hidden />
            {t('multiBusiness.title')}
            <span className={s.multiBusinessChip}>{tCommon('comingSoon')}</span>
          </h2>
          <p className={s.multiBusinessDescription}>{t('multiBusiness.description')}</p>
        </div>
        <button
          type="button"
          className={s.multiBusinessButton}
          aria-disabled="true"
          disabled
          data-component="provider-settings-add-business"
          title={tCommon('comingSoon')}
        >
          <Plus className="size-4" aria-hidden />
          {t('multiBusiness.cta')}
        </button>
      </aside>

      {notice?.kind === 'success' ? (
        <p
          className={s.noticeSuccess}
          role="status"
          aria-live="polite"
          data-component="provider-settings-notice-success"
        >
          {t('save.success')}
        </p>
      ) : null}
      {notice?.kind === 'error' ? (
        <p className={s.noticeError} role="alert" data-component="provider-settings-notice-error">
          {t(ERROR_MESSAGE_KEY[notice.code])}
        </p>
      ) : null}

      <div className={s.actions}>
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          data-component="provider-settings-save"
        >
          {isPending ? t('save.saving') : t('save.button')}
        </Button>
      </div>
    </form>
  );
}
