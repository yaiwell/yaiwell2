'use client';

import { Download, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAccountDataCard } from './AccountDataCard.logic';
import { accountDataCardStyles as s } from './AccountDataCard.styles';
import type { AccountDataCardProps } from './AccountDataCard.types';

/**
 * Bloque «Tus datos» de `/cuenta`: descargar una copia y eliminar la cuenta.
 * La descarga es un enlace normal porque el endpoint responde con un adjunto.
 */
export function AccountDataCard({ locale }: AccountDataCardProps) {
  const t = useTranslations('account.data');
  const { isConfirming, isDeleting, errorCode, askConfirmation, cancel, confirmDeletion } =
    useAccountDataCard(locale);

  return (
    <section className={s.root} data-component="account-data" aria-labelledby="account-data-title">
      <div>
        <h2 id="account-data-title" className={s.title}>
          {t('title')}
        </h2>
        <p className={s.hint}>{t('hint')}</p>
      </div>

      {isConfirming ? (
        <div className={s.confirm} role="alertdialog" aria-labelledby="account-delete-title">
          <p id="account-delete-title" className={s.confirmTitle}>
            {t('confirmTitle')}
          </p>
          <p className={s.confirmText}>{t('confirmText')}</p>
          <div className={s.actions}>
            <button
              type="button"
              className={s.dangerButton}
              onClick={() => void confirmDeletion()}
              disabled={isDeleting}
              data-component="account-delete-confirm"
            >
              {isDeleting ? t('deleting') : t('confirm')}
            </button>
            <button type="button" className={s.button} onClick={cancel} disabled={isDeleting}>
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className={s.actions}>
          {/* Enlace nativo: un `Link` intentaría navegar a una ruta de API. */}
          <a
            href="/api/account/export"
            download
            className={s.button}
            data-component="account-export"
          >
            <Download className={s.icon} aria-hidden="true" />
            {t('download')}
          </a>
          <button
            type="button"
            className={s.button}
            onClick={askConfirmation}
            data-component="account-delete"
          >
            <Trash2 className={s.icon} aria-hidden="true" />
            {t('delete')}
          </button>
        </div>
      )}

      {errorCode ? (
        <p className={s.error} role="alert" data-component="account-delete-error">
          {t(`errors.${errorCode}`)}
        </p>
      ) : null}
    </section>
  );
}
