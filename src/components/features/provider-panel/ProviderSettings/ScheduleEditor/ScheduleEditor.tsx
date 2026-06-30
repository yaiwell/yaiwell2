'use client';

import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useScheduleEditor } from './ScheduleEditor.logic';
import { scheduleEditorStyles as s } from './ScheduleEditor.styles';
import { WEEKDAY_ORDER, type ScheduleEditorProps } from './ScheduleEditor.types';

/**
 * Editor del horario semanal del centro.
 *
 * 7 filas (lunes a domingo, orden europeo) con:
 *  - Toggle "Abierto/Cerrado": cierra todos los tramos del día (lista
 *    vacía) o abre con un tramo default `09:00-18:00`.
 *  - Si el día está abierto: lista de tramos con `<input type="time">`,
 *    botón `−` para quitar tramos y botón `+ tramo` para añadir
 *    jornadas partidas (ej. mañana + tarde).
 *
 * Componente controlado: el estado vive en el padre (`ProviderSettings`),
 * que combina settings + schedule en el mismo submit. La validación de
 * `open < close` la hace el server con `weeklyScheduleSchema`; aquí
 * dejamos al usuario teclear libremente para no entorpecer.
 *
 * Los iconos `Plus`/`Minus` se renderizan dentro de este Client
 * Component (no como props desde el padre Server) para evitar el bug
 * RSC de `forwardRef` no serializable documentado el 2026-06-11.
 */
export function ScheduleEditor({ value, onChange, disabled = false }: ScheduleEditorProps) {
  const t = useTranslations('providerPanel.settings.schedule');
  const { toggleDay, addBlock, removeBlock, updateBlock } = useScheduleEditor(value, onChange);

  return (
    <div className={s.root} data-component="schedule-editor">
      {WEEKDAY_ORDER.map((day) => {
        const blocks = value[day];
        const isOpen = blocks.length > 0;
        return (
          <div key={day} className={s.dayRow} data-component={`schedule-day-${day}`}>
            <div className={s.dayHeader}>
              <span className={s.dayLabel}>{t(`days.${day}`)}</span>
              <label className={s.toggleLabel}>
                <input
                  type="checkbox"
                  className={s.toggleInput}
                  checked={isOpen}
                  onChange={() => toggleDay(day)}
                  disabled={disabled}
                  data-component={`schedule-toggle-${day}`}
                  aria-label={t('toggleAria', { day: t(`days.${day}`) })}
                />
                {isOpen ? t('openLabel') : t('closedLabel')}
              </label>
            </div>

            {isOpen ? (
              <div className={s.blocksColumn}>
                {blocks.map((block, index) => (
                  <div
                    key={index}
                    className={s.blockRow}
                    data-component={`schedule-block-${day}-${index}`}
                  >
                    <input
                      type="time"
                      className={s.timeInput}
                      value={block.open}
                      onChange={(e) => updateBlock(day, index, { open: e.target.value })}
                      disabled={disabled}
                      aria-label={t('openFrom')}
                      data-component={`schedule-open-${day}-${index}`}
                    />
                    <span className={s.timeSeparator} aria-hidden="true">
                      →
                    </span>
                    <input
                      type="time"
                      className={s.timeInput}
                      value={block.close}
                      onChange={(e) => updateBlock(day, index, { close: e.target.value })}
                      disabled={disabled}
                      aria-label={t('openTo')}
                      data-component={`schedule-close-${day}-${index}`}
                    />
                    <button
                      type="button"
                      className={s.iconButton}
                      onClick={() => removeBlock(day, index)}
                      disabled={disabled}
                      aria-label={t('removeBlockAria', { day: t(`days.${day}`) })}
                      data-component={`schedule-remove-${day}-${index}`}
                    >
                      <Minus className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={s.addBlockButton}
                  onClick={() => addBlock(day)}
                  disabled={disabled}
                  data-component={`schedule-add-${day}`}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  {t('addBlock')}
                </button>
              </div>
            ) : (
              <span className={s.closedHint}>{t('closedHint')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
