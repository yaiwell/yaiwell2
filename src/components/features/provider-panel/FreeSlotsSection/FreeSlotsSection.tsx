import { useTranslations } from 'next-intl';

import { ReleaseFreeSlotButton } from '../ReleaseSlotDialog';
import { freeSlotsSectionStyles as s } from './FreeSlotsSection.styles';
import type { FreeSlotsSectionProps } from './FreeSlotsSection.types';

/**
 * Máximo de huecos listados. Con varios servicios la ventana de 2 h
 * puede dar decenas de horas; enseñamos las más próximas y el resto
 * como recuento, para que la sección no empuje el calendario fuera.
 */
const MAX_VISIBLE_SLOTS = 10;

/**
 * Sección «Huecos libres en las próximas 2 h»: lo que el profesional
 * podría liberar con descuento ahora mismo.
 *
 * Server Component: solo los botones cruzan a cliente, y abren el
 * diálogo compartido que monta la página (`ReleaseSlotPromptProvider`).
 */
export function FreeSlotsSection({ slots, readOnly }: FreeSlotsSectionProps) {
  const t = useTranslations('providerPanel.calendar.slotOffers.free');
  const visible = slots.slice(0, MAX_VISIBLE_SLOTS);
  const hidden = slots.length - visible.length;

  return (
    <section
      className={s.root}
      data-component="free-slots-section"
      aria-labelledby="free-slots-title"
    >
      <header className={s.header}>
        <h2 id="free-slots-title" className={s.title}>
          {t('title')}
        </h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      {slots.length === 0 ? (
        <p className={s.empty} data-component="free-slots-empty">
          {t('empty')}
        </p>
      ) : (
        <ul className={s.list}>
          {visible.map((slot) => (
            <li key={`${slot.serviceId}-${slot.startAtIso}`} className={s.item}>
              <div className={s.itemMain}>
                <span className={s.itemTime}>
                  {slot.startTime}–{slot.endTime}
                </span>
                <span className={s.itemService}>{slot.serviceName}</span>
              </div>
              <ReleaseFreeSlotButton
                serviceId={slot.serviceId}
                serviceName={slot.serviceName}
                startAtIso={slot.startAtIso}
                startTime={slot.startTime}
                disabled={readOnly}
              />
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && <p className={s.more}>{t('more', { count: hidden })}</p>}
    </section>
  );
}
