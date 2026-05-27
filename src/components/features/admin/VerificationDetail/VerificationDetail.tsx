'use client';

import { ArrowLeft, Check, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { useVerificationModeration } from './VerificationDetail.logic';
import { verificationDetailStyles as s } from './VerificationDetail.styles';
import type { VerificationDetailProps } from './VerificationDetail.types';

/**
 * Ficha de detalle de una solicitud de verificación.
 *
 * Permite al moderador revisar datos de contacto, descripción y los
 * documentos subidos antes de aprobar o rechazar. Las acciones son
 * mock: no hay API; mostramos un toast en la propia UI con el
 * resultado. Reglas del proyecto prohíben `alert` y `console.warn`.
 */
export function VerificationDetail({ request }: VerificationDetailProps) {
  const t = useTranslations('adminArea.verifications.detail');
  const tCommon = useTranslations('adminArea.verifications');
  const format = useFormatter();
  const { outcome, toastVisible, approve, reject, dismissToast } = useVerificationModeration();
  const decided = outcome !== null;

  return (
    <div className={s.root} data-component={`admin-verification-detail-${request.id}`}>
      <div className={s.topRow}>
        <Link href="/admin" className={s.back} data-component="admin-verification-back">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('back')}
        </Link>
        <h1 className={s.name}>{request.providerName}</h1>
        <p className={s.subtitle}>
          {tCommon(`type.${request.providerType}`)} · {request.providerCity} ·{' '}
          {format.dateTime(request.submittedAt, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className={s.grid}>
        <div className={s.block}>
          <h2 className={s.blockTitle}>{t('contactTitle')}</h2>
          <dl className={s.dl}>
            <dt className={s.dtLabel}>{t('fields.email')}</dt>
            <dd className={s.ddValue}>{request.contactEmail}</dd>
            <dt className={s.dtLabel}>{t('fields.phone')}</dt>
            <dd className={s.ddValue}>{request.contactPhone}</dd>
            <dt className={s.dtLabel}>{t('fields.vat')}</dt>
            <dd className={s.ddValue}>{request.vatNumber}</dd>
            <dt className={s.dtLabel}>{t('fields.category')}</dt>
            <dd className={s.ddValue}>{request.providerCategory}</dd>
          </dl>

          <h2 className={s.blockTitle}>{t('descriptionTitle')}</h2>
          <p className={s.description}>{request.description}</p>
        </div>

        <div className={s.block}>
          <h2 className={s.blockTitle}>{t('documentsTitle')}</h2>
          <div className={s.docsGrid} data-component="admin-verification-documents">
            {request.documents.map((doc) => (
              <article
                key={doc.id}
                className={s.docCard}
                data-component={`admin-verification-doc-${doc.id}`}
              >
                <div className={s.docImage}>
                  {/* Documento mock: imagen Unsplash con temática neutra. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doc.url}
                    alt={t(`docType.${doc.type}`)}
                    className={s.docImageInner}
                    loading="lazy"
                  />
                </div>
                <span className={s.docType}>{t(`docType.${doc.type}`)}</span>
                <span className={s.docFilename} title={doc.filename}>
                  {doc.filename}
                </span>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className={s.actions} data-component="admin-verification-actions">
        <button
          type="button"
          className={s.reject}
          onClick={reject}
          disabled={decided}
          data-component="admin-verification-reject"
        >
          <X className="size-4" aria-hidden="true" />
          {t('actions.reject')}
        </button>
        <button
          type="button"
          className={s.approve}
          onClick={approve}
          disabled={decided}
          data-component="admin-verification-approve"
        >
          <Check className="size-4" aria-hidden="true" />
          {t('actions.approve')}
        </button>
      </div>

      {toastVisible && outcome ? (
        <div
          className={s.toast}
          role="status"
          aria-live="polite"
          data-component={`admin-verification-toast-${outcome}`}
        >
          <span>{t(`toast.${outcome}`, { name: request.providerName })}</span>
          <button type="button" className={s.toastClose} onClick={dismissToast}>
            {t('toast.dismiss')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
