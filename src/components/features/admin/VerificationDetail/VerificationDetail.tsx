'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { useVerificationModeration } from './VerificationDetail.logic';
import { verificationDetailStyles as s } from './VerificationDetail.styles';
import type { VerificationDetailProps } from './VerificationDetail.types';

/**
 * Ficha de detalle de una solicitud de verificación.
 *
 * El moderador revisa datos del provider y los documentos antes de
 * aprobar o rechazar:
 *  - **Aprobar**: dispara `approveProviderAction` directo. Sin
 *    confirmación — el admin sabe lo que hace y un click extra
 *    aporta fricción sin valor (es revertible vía rechazar después).
 *  - **Rechazar**: abre `AlertDialog` con textarea obligatorio (≥5
 *    chars) para que el motivo quede registrado en
 *    `verification_requests.notes`.
 *
 * Tras un éxito la action hace `redirect` a `/admin`; aquí solo
 * pintamos el error si lo hay y deshabilitamos botones durante
 * `isPending`.
 */
export function VerificationDetail({ request, locale }: VerificationDetailProps) {
  const t = useTranslations('adminArea.verifications.detail');
  const tCommon = useTranslations('adminArea.verifications');
  const format = useFormatter();
  const {
    isPending,
    error,
    rejectOpen,
    rejectNotes,
    setRejectNotes,
    approve,
    openRejectDialog,
    closeRejectDialog,
    submitReject,
  } = useVerificationModeration(request.id, locale);

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
            <dd className={s.ddValue}>{request.contactEmail || '—'}</dd>
            <dt className={s.dtLabel}>{t('fields.phone')}</dt>
            <dd className={s.ddValue}>{request.contactPhone || '—'}</dd>
            <dt className={s.dtLabel}>{t('fields.vat')}</dt>
            <dd className={s.ddValue}>{request.vatNumber || '—'}</dd>
            <dt className={s.dtLabel}>{t('fields.category')}</dt>
            <dd className={s.ddValue}>{request.providerCategory || '—'}</dd>
          </dl>

          <h2 className={s.blockTitle}>{t('descriptionTitle')}</h2>
          <p className={s.description}>{request.description || t('noDescription')}</p>
        </div>

        <div className={s.block}>
          <h2 className={s.blockTitle}>{t('documentsTitle')}</h2>
          {request.documents.length === 0 ? (
            <p className={s.description}>{t('noDocuments')}</p>
          ) : (
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
          )}
        </div>
      </div>

      {error && error !== 'NOTES_REQUIRED' ? (
        <p className={s.errorBanner} role="alert" data-component="admin-verification-error">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      <div className={s.actions} data-component="admin-verification-actions">
        <button
          type="button"
          className={s.reject}
          onClick={openRejectDialog}
          disabled={isPending}
          data-component="admin-verification-reject"
        >
          <X className="size-4" aria-hidden="true" />
          {t('actions.reject')}
        </button>
        <button
          type="button"
          className={s.approve}
          onClick={approve}
          disabled={isPending}
          data-component="admin-verification-approve"
        >
          <Check className="size-4" aria-hidden="true" />
          {isPending ? t('actions.approving') : t('actions.approve')}
        </button>
      </div>

      <AlertDialog.Root open={rejectOpen} onOpenChange={(open) => !open && closeRejectDialog()}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={s.dialogOverlay} />
          <AlertDialog.Content
            className={s.dialogContent}
            data-component="admin-verification-reject-dialog"
          >
            <AlertDialog.Title className={s.dialogTitle}>
              {t('rejectDialog.title')}
            </AlertDialog.Title>
            <AlertDialog.Description className={s.dialogDescription}>
              {t('rejectDialog.description', { name: request.providerName })}
            </AlertDialog.Description>

            <label className={s.dialogLabel} htmlFor="reject-notes">
              {t('rejectDialog.notesLabel')}
            </label>
            <textarea
              id="reject-notes"
              className={s.dialogTextarea}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder={t('rejectDialog.notesPlaceholder')}
              rows={4}
              maxLength={1000}
              disabled={isPending}
              data-component="admin-verification-reject-notes"
            />

            {error === 'NOTES_REQUIRED' ? (
              <p
                className={s.dialogError}
                role="alert"
                data-component="admin-verification-reject-error"
              >
                {t('errors.NOTES_REQUIRED')}
              </p>
            ) : null}

            <div className={s.dialogActions}>
              <AlertDialog.Cancel
                className={s.dialogCancel}
                disabled={isPending}
                data-component="admin-verification-reject-cancel"
              >
                {t('rejectDialog.cancel')}
              </AlertDialog.Cancel>
              <button
                type="button"
                className={s.dialogConfirm}
                onClick={submitReject}
                disabled={isPending || rejectNotes.trim().length < 5}
                data-component="admin-verification-reject-confirm"
              >
                {isPending ? t('actions.rejecting') : t('rejectDialog.confirm')}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
