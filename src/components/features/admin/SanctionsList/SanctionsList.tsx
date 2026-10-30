import { useFormatter, useTranslations } from 'next-intl';

import { pickLocalized } from '@/lib/i18n';

import { RevokeSanctionForm } from './RevokeSanctionForm';
import { formatSanctionClient } from './SanctionsList.logic';
import { sanctionsListStyles as s } from './SanctionsList.styles';
import type { SanctionsListProps } from './SanctionsList.types';

/**
 * Sanciones vigentes por no presentado (`/admin/sanciones`, §4.bis):
 * pasadas las 24 h en que el negocio puede deshacerlo, solo soporte las
 * retira. Filtro por email del cliente con un formulario GET (la URL se
 * puede compartir) y, en cada fila, la revocación con motivo obligatorio.
 *
 * Server Component: solo la revocación cruza a cliente.
 */
export function SanctionsList({ sanctions, locale, emailFilter }: SanctionsListProps) {
  const t = useTranslations('adminArea.sanctions');
  const format = useFormatter();

  return (
    <div className={s.root} data-component="admin-sanctions-list">
      <form method="get" className={s.filter} role="search">
        <label className={s.filterLabel}>
          {t('filter.label')}
          <input
            type="search"
            name="email"
            defaultValue={emailFilter ?? ''}
            placeholder={t('filter.placeholder')}
            className={s.filterInput}
            autoComplete="off"
          />
        </label>
        <button type="submit" className={s.filterButton}>
          {t('filter.submit')}
        </button>
      </form>

      {sanctions.length === 0 ? (
        <p className={s.empty} data-component="admin-sanctions-empty">
          {emailFilter ? t('emptyFiltered', { email: emailFilter }) : t('empty')}
        </p>
      ) : (
        <ul className={s.list}>
          {sanctions.map((sanction) => (
            <li
              key={sanction.id}
              className={s.item}
              data-component={`admin-sanction-${sanction.id}`}
            >
              <dl className={s.details}>
                <dt className={s.term}>{t('fields.client')}</dt>
                <dd className={s.value}>{formatSanctionClient(sanction)}</dd>
                <dt className={s.term}>{t('fields.provider')}</dt>
                <dd className={s.value}>
                  {sanction.providerName} · {pickLocalized(sanction.serviceName, locale)}
                </dd>
                <dt className={s.term}>{t('fields.occurredAt')}</dt>
                <dd className={s.value}>
                  {format.dateTime(sanction.occurredAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Europe/Madrid',
                  })}
                </dd>
                <dt className={s.term}>{t('fields.booking')}</dt>
                <dd className={s.mono}>{sanction.bookingId}</dd>
              </dl>
              <RevokeSanctionForm
                sanctionId={sanction.id}
                clientEmail={sanction.clientEmail}
                locale={locale}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
