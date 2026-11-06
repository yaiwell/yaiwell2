import { useFormatter, useTranslations } from 'next-intl';

import type { FounderSeatPreview } from '@/lib/services/billing';

import { founderSeatNoticeStyles as styles } from './FounderSeatNotice.styles';

/**
 * Avisa al admin, antes de aprobar, de qué pasará con el regalo de Mallorca.
 * Es el único sitio donde se ve que un negocio de la isla se queda sin plaza,
 * porque la elegibilidad se congela al aprobar. Fuera de Mallorca no pinta nada.
 */
export function FounderSeatNotice({ preview }: { preview: FounderSeatPreview }) {
  const t = useTranslations('adminArea.verifications.founderSeat');
  const format = useFormatter();
  if (preview.kind === 'not_applicable') return null;

  let text: string;
  if (preview.kind === 'seated') {
    text = t('seated', {
      seat: preview.seatNumber,
      date: format.dateTime(preview.endsAt, { dateStyle: 'long', timeZone: 'Europe/Madrid' }),
    });
  } else if (preview.kind === 'will_grant') {
    text = t('willGrant', { seat: preview.seatNumber });
  } else {
    text = t(preview.reason);
  }

  return (
    <aside className={styles.root} data-component="admin-founder-seat" data-kind={preview.kind}>
      <p className={styles.title}>{t('title')}</p>
      <p className={styles.text}>{text}</p>
    </aside>
  );
}
