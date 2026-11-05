'use client';

import { useCallback, useId, useState, useTransition, type FormEvent } from 'react';

import {
  issueIncidentRefundAction,
  previewIncidentRefundAction,
  resumeIncidentRefundAction,
  type IncidentRefundActionOutcome,
  type IncidentRefundErrorCode,
  type IncidentRefundPreviewView,
} from '@/app/[locale]/admin/reembolsos/incident-actions';
import type { AppLocale } from '@/i18n/routing';
import type { IncidentRefundIneligibleReason, IncidentSlotState } from '@/lib/services/checkout';
import { formatRefundAmount, formatRefundDateTime } from '@/lib/utils/admin-refund-format';
import {
  INCIDENT_REFUND_NOTE_MAX_LENGTH,
  INCIDENT_REFUND_NOTE_MIN_LENGTH,
} from '@/lib/utils/incident-refund-note';

/** Error del formulario: un código traducible, o el motivo de no elegibilidad. */
export type IncidentRefundFailure =
  | { code: Exclude<IncidentRefundErrorCode, 'INVALID_NOTE' | 'NOT_ELIGIBLE'> }
  | { code: 'NOT_ELIGIBLE'; reason: IncidentRefundIneligibleReason };

/** Límites del motivo, para los textos de ayuda y de error. */
const NOTE_LIMITS = {
  min: INCIDENT_REFUND_NOTE_MIN_LENGTH,
  max: INCIDENT_REFUND_NOTE_MAX_LENGTH,
} as const;

/**
 * Comprobación en cliente del motivo, con los mismos límites que el schema
 * Zod del servidor. Solo es UX: la action vuelve a validarlo.
 */
export function isIncidentNoteValid(note: string): boolean {
  const length = note.trim().length;
  return length >= INCIDENT_REFUND_NOTE_MIN_LENGTH && length <= INCIDENT_REFUND_NOTE_MAX_LENGTH;
}

/** Clave i18n de un error, relativa a `adminArea.refunds.incident`. */
export function failureMessageKey(failure: IncidentRefundFailure) {
  return failure.code === 'NOT_ELIGIBLE'
    ? (`ineligible.${failure.reason}` as const)
    : (`errors.${failure.code}` as const);
}

/** Tono del resultado: si el dinero no ha vuelto es un aviso, no un error del formulario. */
export function outcomeTone(outcome: IncidentRefundActionOutcome): 'success' | 'warning' {
  return outcome === 'failed' || outcome === 'failed_unrecorded' ? 'warning' : 'success';
}

/**
 * Hook del reembolso por incidencia: buscar → resumen → motivo → confirmar.
 * Una reserva a medias se confirma sin motivo: ya se escribió al cancelarla.
 *
 * Editar el id descarta el resumen: lo que se confirma es siempre la reserva
 * que soporte tiene delante, nunca una búsqueda anterior.
 */
export function useIncidentRefund(locale: AppLocale) {
  const [bookingId, setBookingId] = useState('');
  const [preview, setPreview] = useState<IncidentRefundPreviewView | null>(null);
  const [note, setNote] = useState('');
  const [showNoteError, setShowNoteError] = useState(false);
  const [failure, setFailure] = useState<IncidentRefundFailure | null>(null);
  const [outcome, setOutcome] = useState<IncidentRefundActionOutcome | null>(null);
  const [slot, setSlot] = useState<IncidentSlotState>('not_applicable');
  const [isSearching, startSearch] = useTransition();
  const [isRefunding, startRefund] = useTransition();
  const idBase = useId();

  const canResendNotices = preview?.canResendNotices === true;
  // Reanudar y reenviar van por la misma acción y no piden motivo.
  const isResume =
    canResendNotices ||
    (preview?.eligibility.eligible === true && preview.eligibility.mode === 'resume');

  const clearResult = useCallback(() => {
    setPreview(null);
    setNote('');
    setShowNoteError(false);
    setFailure(null);
    setOutcome(null);
    setSlot('not_applicable');
  }, []);

  const changeBookingId = useCallback(
    (value: string) => {
      setBookingId(value);
      clearResult();
    },
    [clearResult],
  );

  const changeNote = useCallback((value: string) => {
    setNote(value);
    if (isIncidentNoteValid(value)) setShowNoteError(false);
  }, []);

  const reset = useCallback(() => {
    setBookingId('');
    clearResult();
  }, [clearResult]);

  const search = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      clearResult();
      startSearch(async () => {
        try {
          const state = await previewIncidentRefundAction(locale, bookingId.trim());
          if (state.ok) setPreview(state.preview);
          else setFailure({ code: state.code });
        } catch {
          // Fallo de red o de la propia action: sin detalles para la UI.
          setFailure({ code: 'INTERNAL' });
        }
      });
    },
    [bookingId, clearResult, locale],
  );

  const confirm = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!preview) return;
      if (!isResume && !isIncidentNoteValid(note)) {
        setShowNoteError(true);
        return;
      }
      setFailure(null);
      startRefund(async () => {
        try {
          const state = isResume
            ? await resumeIncidentRefundAction(locale, preview.bookingId)
            : await issueIncidentRefundAction(locale, preview.bookingId, note);
          if (state.ok) {
            setOutcome(state.outcome);
            setSlot(state.slot);
          } else if (state.code === 'INVALID_NOTE') {
            setShowNoteError(true);
          } else {
            setFailure(state);
          }
        } catch {
          // Una respuesta perdida no dice si se aplicó: el texto pide volver a
          // buscar antes de repetir.
          setFailure({ code: 'INTERNAL' });
        }
      });
    },
    [isResume, locale, note, preview],
  );

  return {
    bookingId,
    preview,
    note,
    showNoteError,
    failure,
    outcome,
    slot,
    isResume,
    canResendNotices,
    isSearching,
    isRefunding,
    amount: preview ? formatRefundAmount(preview.priceCents, locale) : '',
    appointment: preview ? formatRefundDateTime(new Date(preview.startAtIso), locale) : '',
    noteLimits: NOTE_LIMITS,
    ids: {
      title: `${idBase}-title`,
      bookingId: `${idBase}-booking`,
      note: `${idBase}-note`,
      hint: `${idBase}-hint`,
      error: `${idBase}-error`,
    },
    changeBookingId,
    changeNote,
    reset,
    search,
    confirm,
  };
}
