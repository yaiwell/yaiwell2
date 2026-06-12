import { Building2, Plus } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { pickLocalized } from '@/lib/i18n/pickLocalized';

import { providerSettingsStyles as s } from './ProviderSettings.styles';
import type { ProviderSettingsProps } from './ProviderSettings.types';

/**
 * Pantalla de configuración del centro.
 *
 * Server Component puro: muestra los datos reales del proveedor activo
 * (los que el wizard de onboarding guarda en BD) y deja en blanco los
 * campos que aún no se piden al alta (phone, email de contacto, ciudad
 * y código postal por separado, horario). Los campos son `defaultValue`
 * para mantener el formulario sin estado; el botón "Guardar" es solo
 * visual mientras no exista persistencia. Cuando exista, este componente
 * pasará a Client con un hook dedicado, manteniendo la separación de
 * styles/logic.
 */
export function ProviderSettings({ provider, locale }: ProviderSettingsProps) {
  const t = useTranslations('providerPanel.settings');
  const tCommon = useTranslations('common');
  // `pickLocalized` aplica fallback locale → es si el JSON no tiene
  // la lengua actual (los providers nuevos solo guardan ES/CA).
  const description = pickLocalized(provider.description, locale);

  return (
    <section className={s.root} data-component="provider-settings">
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
              defaultValue={provider.businessName}
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
              defaultValue={provider.vatNumber ?? ''}
              placeholder="B12345678"
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
            />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="settings-description">
            {t('general.descriptionLabel')}
          </label>
          <textarea id="settings-description" className={s.textarea} defaultValue={description} />
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
            defaultValue={provider.address}
          />
        </div>

        {/* Ciudad y código postal no se guardan por separado en BD
            (la dirección viene de Mapbox como string completo). Dejamos
            los inputs vacíos con placeholder hasta que el flujo Fase 1
            decida si descomponer o no la dirección. */}
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
            />
            <input
              type="time"
              defaultValue="20:00"
              className={s.scheduleTime}
              aria-label={t('schedule.openTo')}
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
            />
            <input
              type="time"
              defaultValue="14:00"
              className={s.scheduleTime}
              aria-label={t('schedule.openTo')}
            />
          </div>
        </div>

        <div className={s.scheduleRow} data-component="settings-schedule-sunday">
          <span className={s.scheduleLabel}>{t('schedule.sundayLabel')}</span>
          <span className={s.scheduleClosed}>{t('schedule.closed')}</span>
        </div>
      </article>

      <article className={s.card} data-component="provider-settings-photos">
        <header>
          <h2 className={s.cardTitle}>{t('photos.title')}</h2>
          <p className={s.cardSubtitle}>{t('photos.subtitle')}</p>
        </header>

        <div className={s.photoGrid}>
          {provider.photos.map((photo, index) => (
            <div key={photo} className={s.photoTile}>
              <Image
                src={photo}
                alt={t('photos.altLabel', { index: index + 1 })}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className={s.photoImg}
              />
            </div>
          ))}
          <button type="button" className={s.photoAdd} aria-label={t('photos.addCta')}>
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      </article>

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

      <p className={s.notice}>{t('savedNotice')}</p>

      <div className={s.actions}>
        <Button size="lg" data-component="provider-settings-save">
          {t('save')}
        </Button>
      </div>
    </section>
  );
}
