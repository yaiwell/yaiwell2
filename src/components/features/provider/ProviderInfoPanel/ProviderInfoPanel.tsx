import { Clock, MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ProviderInfoMapLoader } from './ProviderInfoMapLoader';
import { providerInfoPanelStyles as s } from './ProviderInfoPanel.styles';
import type { ProviderInfoPanelProps } from './ProviderInfoPanel.types';

/**
 * Panel de información de la ficha del proveedor.
 *
 * Server Component: no necesita estado ni eventos. El único trozo
 * cliente es el mini-mapa, que se aísla en `ProviderInfoMap` y se
 * importa dinámicamente con `ssr: false`.
 *
 * Render:
 *  1. Mini-mapa con un pin en la ubicación del centro.
 *  2. Dirección y horario en grid 2 columnas (1 en mobile).
 *  3. Descripción larga full width.
 */
export async function ProviderInfoPanel({ provider, locale }: ProviderInfoPanelProps) {
  const t = await getTranslations('providerDetail.info');

  // El horario es fake/realista de momento: la entidad `Provider`
  // todavía no tiene un campo `schedule`. En Fase 1 vendrá del
  // catálogo (ver VISION.md y TODO.md) y este bloque consumirá ese
  // dato real en vez de strings hard-coded.
  const schedule = [
    { dayKey: 'scheduleWeekdays', value: '09:00 – 20:00' },
    { dayKey: 'scheduleSaturday', value: '10:00 – 18:00' },
    { dayKey: 'scheduleSunday', value: t('scheduleClosed') },
  ] as const;

  return (
    <section className={s.section} data-component="provider-info-panel">
      <h2 className={s.heading}>{t('title')}</h2>

      <div className={s.mapWrapper} data-component="provider-info-panel-map">
        <ProviderInfoMapLoader lat={provider.location.lat} lng={provider.location.lng} />
      </div>

      <div className={s.grid}>
        <div className={s.block} data-component="provider-info-panel-address">
          <MapPin className={s.blockIcon} aria-hidden="true" />
          <div className={s.blockBody}>
            <span className={s.blockLabel}>{t('addressLabel')}</span>
            <span className={s.blockContent}>{provider.address}</span>
          </div>
        </div>

        <div className={s.block} data-component="provider-info-panel-schedule">
          <Clock className={s.blockIcon} aria-hidden="true" />
          <div className={s.blockBody}>
            <span className={s.blockLabel}>{t('scheduleLabel')}</span>
            <ul className={s.scheduleList}>
              {schedule.map((row) => (
                <li key={row.dayKey} className={s.scheduleRow}>
                  <span className={s.scheduleDay}>{t(row.dayKey)}</span>
                  <span>{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={s.descriptionBlock} data-component="provider-info-panel-description">
        <span className={s.blockLabel}>{t('descriptionLabel')}</span>
        <p className={s.descriptionText}>{provider.description[locale]}</p>
      </div>
    </section>
  );
}
