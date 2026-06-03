import { ArrowRight, Building2, User } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { verificationsQueueStyles as s } from './VerificationsQueue.styles';
import type { VerificationsQueueProps } from './VerificationsQueue.types';

/**
 * Cola de verificaciones pendientes del panel admin.
 *
 * Cada fila enlaza con la ficha detallada en
 * `/admin/verificaciones/[id]`. Mostramos solo la información
 * imprescindible para que el moderador decida si abrir o no:
 * nombre, ciudad/categoría, tipo y fecha de envío.
 */
export function VerificationsQueue({ requests }: VerificationsQueueProps) {
  const t = useTranslations('adminArea.verifications');
  const format = useFormatter();

  return (
    <section
      id="verificaciones"
      className={s.root}
      aria-labelledby="admin-verifications-title"
      data-component="admin-verifications-queue"
    >
      <header className={s.sectionHeader}>
        <h2 id="admin-verifications-title" className={s.sectionTitle}>
          {t('queue.title')}
        </h2>
        <span className={s.sectionCount}>{t('queue.count', { count: requests.length })}</span>
      </header>

      {requests.length === 0 ? (
        <p className={s.empty}>{t('queue.empty')}</p>
      ) : (
        <ul className={s.list} data-component="admin-verifications-list">
          {requests.map((request) => {
            const TypeIcon = request.providerType === 'centro' ? Building2 : User;
            return (
              <li
                key={request.id}
                className={s.row}
                data-component={`admin-verification-row-${request.id}`}
              >
                <div className={s.rowMain}>
                  <span className={s.name}>{request.providerName}</span>
                  <span className={s.meta}>
                    {request.providerCity} · {request.providerCategory}
                  </span>
                </div>
                <span className={s.typePill}>
                  <TypeIcon className="size-3" aria-hidden="true" />
                  {t(`type.${request.providerType}`)}
                </span>
                <span className={s.submittedAt}>
                  {format.dateTime(request.submittedAt, {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <Link
                  href={`/admin/verificaciones/${request.id}`}
                  className={s.cta}
                  data-component={`admin-verification-open-${request.id}`}
                  aria-label={t('queue.openAria', { name: request.providerName })}
                >
                  {t('queue.open')}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
