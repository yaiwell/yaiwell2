import { getTranslations } from 'next-intl/server';

import type { Weekday, WeekdayBlock, WeeklySchedule } from '@/lib/services/availability';

import { ProviderInfoMapLoader } from './ProviderInfoMapLoader';
import { providerInfoPanelStyles as s } from './ProviderInfoPanel.styles';
import type { ProviderInfoPanelProps } from './ProviderInfoPanel.types';

/**
 * Orden visual de los días en el horario público. Lunes primero,
 * domingo último — convención ES/CA/EN.
 */
const WEEKDAY_ORDER: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Formatea los tramos de un día como `09:00 – 14:00, 16:00 – 20:00`.
 * Si la lista es vacía, devuelve `null` y el caller pinta "Cerrado".
 */
function formatBlocks(blocks: WeekdayBlock[]): string | null {
  if (blocks.length === 0) return null;
  return blocks.map((b) => `${b.open} – ${b.close}`).join(', ');
}

/**
 * `true` si el provider no tiene NINGÚN día abierto. Lo usamos para
 * esconder el bloque de horario completo en lugar de mostrar 7 filas
 * con "Cerrado" — caso típico de un provider recién dado de alta que
 * todavía no configuró nada en `/panel/centro`.
 */
function isEntirelyClosed(schedule: WeeklySchedule): boolean {
  return WEEKDAY_ORDER.every((day) => schedule[day].length === 0);
}

/**
 * Panel de información de la ficha del proveedor.
 *
 * Server Component: no necesita estado ni eventos. El único trozo
 * cliente es el mini-mapa, que se aísla en `ProviderInfoMap` y se
 * importa dinámicamente con `ssr: false`.
 *
 * Render:
 *  1. Mini-mapa con un pin en la ubicación del centro.
 *  2. Dirección y horario (7 días reales con sus tramos) en grid 2
 *     columnas (1 en mobile). Si el horario está vacío o no se pudo
 *     cargar, esconde el bloque sin enseñar tabla con "Cerrado" en
 *     los 7 días — patrón "no asumas que el silencio es ausencia".
 *  3. Descripción larga full width.
 */
export async function ProviderInfoPanel({ provider, schedule, locale }: ProviderInfoPanelProps) {
  const t = await getTranslations('providerDetail.info');
  const showSchedule = schedule !== null && !isEntirelyClosed(schedule);

  return (
    <section className={s.section} data-component="provider-info-panel">
      <h2 id="provider-info-heading" className={s.heading}>
        {t('title')}
      </h2>

      <div className={s.mapWrapper} data-component="provider-info-panel-map">
        <ProviderInfoMapLoader lat={provider.location.lat} lng={provider.location.lng} />
      </div>

      <div className={s.grid}>
        <div className={s.block} data-component="provider-info-panel-address">
          <span className={s.blockLabel}>{t('addressLabel')}</span>
          <span className={s.blockContent}>{provider.address}</span>
        </div>

        {showSchedule ? (
          <div className={s.block} data-component="provider-info-panel-schedule">
            <span className={s.blockLabel}>{t('scheduleLabel')}</span>
            <ul className={s.scheduleList}>
              {WEEKDAY_ORDER.map((day) => {
                const blocks = schedule[day];
                const formatted = formatBlocks(blocks);
                return (
                  <li key={day} className={s.scheduleRow}>
                    <span className={s.scheduleDay}>{t(`days.${day}`)}</span>
                    <span>{formatted ?? t('scheduleClosed')}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <div className={s.descriptionBlock} data-component="provider-info-panel-description">
        <span className={s.blockLabel}>{t('descriptionLabel')}</span>
        <p className={s.descriptionText}>{provider.description[locale]}</p>
      </div>
    </section>
  );
}
