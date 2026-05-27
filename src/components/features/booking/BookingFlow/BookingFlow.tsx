'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { BookingConfirmation } from '../BookingConfirmation';
import { BookingSummary } from '../BookingSummary';
import { MockPaymentStep } from '../MockPaymentStep';
import { SlotPicker } from '../SlotPicker';

import { BOOKING_STEPS, useBookingFlow } from './BookingFlow.logic';
import { bookingFlowStyles as s } from './BookingFlow.styles';
import type { BookingFlowProps } from './BookingFlow.types';

/**
 * Orquestador del flujo de reserva mock.
 *
 * Renderiza cada paso en función del estado del hook `useBookingFlow`:
 *  1. `slot`: el usuario elige día y hora.
 *  2. `summary`: revisa los datos y añade notas opcionales.
 *  3. `payment`: pasa por el pago simulado.
 *  4. `confirmation`: ve el tick verde y los CTAs finales.
 *
 * El componente JSX se limita a componer; toda la lógica vive en
 * `BookingFlow.logic.ts` para cumplir con la convención del proyecto.
 */
export function BookingFlow({ provider, service, locale, providerSlugWithId }: BookingFlowProps) {
  const t = useTranslations('booking.flow');
  const tPolicy = useTranslations('booking.policy');

  const {
    step,
    stepIndex,
    draft,
    canAdvance,
    goNext,
    goBack,
    selectSlot,
    updateDraft,
    completeMockPayment,
  } = useBookingFlow();

  // Si llegamos a la confirmación renderizamos solo esa pantalla con
  // su propio layout interno: no necesita stepper ni navegación.
  if (step === 'confirmation' && draft.bookingId && draft.slotStartIso && draft.slotEndIso) {
    return (
      <section className={s.root} data-component="booking-flow-confirmation">
        <BookingConfirmation
          provider={provider}
          service={service}
          locale={locale}
          slotStartIso={draft.slotStartIso}
          slotEndIso={draft.slotEndIso}
          bookingId={draft.bookingId}
          providerSlugWithId={providerSlugWithId}
        />
      </section>
    );
  }

  // Resolvemos el título del paso con literales para que next-intl
  // pueda validar las claves en tiempo de compilación. Un mapa con
  // `string` rompería el typecheck del template strict de mensajes.
  const stepTitle = (() => {
    switch (step) {
      case 'slot':
        return t('steps.slot');
      case 'summary':
        return t('steps.summary');
      case 'payment':
        return t('steps.payment');
      case 'confirmation':
        return t('steps.confirmation');
    }
  })();

  return (
    <section className={s.root} data-component="booking-flow">
      <header className={s.header}>
        <span className={s.eyebrow}>
          {t('eyebrow', { current: stepIndex + 1, total: BOOKING_STEPS.length })}
        </span>
        <h1 className={s.title}>{stepTitle}</h1>
        <p className={s.serviceLine}>
          {provider.name}
          {' · '}
          {service.name[locale]}
        </p>
        <div className={s.stepper} aria-hidden>
          {BOOKING_STEPS.map((stepName, index) => {
            const className =
              index === stepIndex ? s.stepDotActive : index < stepIndex ? s.stepDotDone : s.stepDot;
            return <span key={stepName} className={className} />;
          })}
        </div>
      </header>

      <div className={s.card}>
        {step === 'slot' && (
          <SlotPicker
            providerId={provider.id}
            serviceId={service.id}
            serviceDurationMinutes={service.durationMinutes}
            locale={locale}
            selectedStartIso={draft.slotStartIso}
            onSelect={(slot) => selectSlot(slot.startAtIso, slot.endAtIso)}
          />
        )}

        {step === 'summary' && draft.slotStartIso && draft.slotEndIso && (
          <BookingSummary
            provider={provider}
            service={service}
            locale={locale}
            slotStartIso={draft.slotStartIso}
            slotEndIso={draft.slotEndIso}
            notes={draft.notes}
            onNotesChange={(notes) => updateDraft({ notes })}
          />
        )}

        {step === 'payment' && (
          <MockPaymentStep
            amountCents={service.priceCents}
            locale={locale}
            onComplete={completeMockPayment}
          />
        )}
      </div>

      {step !== 'payment' && <p className={s.policyNote}>{tPolicy('compactNote')}</p>}

      <footer className={s.footer}>
        {stepIndex === 0 ? (
          <Link
            href={`/centro/${providerSlugWithId}`}
            className={s.backButton}
            data-component="booking-flow-cancel"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('cancel')}
          </Link>
        ) : (
          <button
            type="button"
            onClick={goBack}
            className={s.backButton}
            data-component="booking-flow-back"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('back')}
          </button>
        )}

        {step !== 'payment' && (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className={s.primaryButton}
            data-component="booking-flow-next"
          >
            {t(step === 'summary' ? 'goToPayment' : 'continue')}
          </button>
        )}
      </footer>
    </section>
  );
}
