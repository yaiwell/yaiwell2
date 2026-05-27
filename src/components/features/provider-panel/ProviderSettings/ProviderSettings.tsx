import { Plus } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { providerSettingsStyles as s } from './ProviderSettings.styles';
import type { ProviderSettingsProps } from './ProviderSettings.types';

/**
 * Pantalla de configuración del centro.
 *
 * Server Component puro: muestra los datos generales, dirección,
 * horario y fotos del proveedor activo. Los campos son `defaultValue`
 * para mantener el formulario sin estado (mock visual). Cuando exista
 * persistencia real este componente pasará a Client con un hook
 * dedicado, manteniendo la separación de styles/logic.
 */
export function ProviderSettings({ provider, locale }: ProviderSettingsProps) {
  const t = useTranslations('providerPanel.settings');

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
              defaultValue={provider.name}
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-vat">
              {t('general.vatLabel')}
            </label>
            <input id="settings-vat" type="text" className={s.input} defaultValue="B65432198" />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-phone">
              {t('general.phoneLabel')}
            </label>
            <input
              id="settings-phone"
              type="tel"
              className={s.input}
              defaultValue="+34 932 11 22 33"
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
              defaultValue="hola@ateliernorte.com"
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
            defaultValue={provider.description[locale]}
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
            defaultValue={provider.address}
          />
        </div>

        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-city">
              {t('address.cityLabel')}
            </label>
            <input id="settings-city" type="text" className={s.input} defaultValue="Barcelona" />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="settings-postal">
              {t('address.postalLabel')}
            </label>
            <input id="settings-postal" type="text" className={s.input} defaultValue="08008" />
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
                unoptimized
              />
            </div>
          ))}
          <button type="button" className={s.photoAdd} aria-label={t('photos.addCta')}>
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      </article>

      <p className={s.notice}>{t('savedNotice')}</p>

      <div className={s.actions}>
        <Button size="lg" data-component="provider-settings-save">
          {t('save')}
        </Button>
      </div>
    </section>
  );
}
