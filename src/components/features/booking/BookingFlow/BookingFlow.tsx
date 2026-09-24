'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Link } from '@/i18n/navigation';
import { pickLocalized } from '@/lib/i18n/pickLocalized';

import { BookingConfirmation } from '../BookingConfirmation';
import { BookingSummary } from '../BookingSummary';
import { SlotPicker } from '../SlotPicker';

import { BookingCheckoutPanel } from './BookingCheckoutPanel';
import { BOOKING_STEPS, useBookingFlow } from './BookingFlow.logic';
import { bookingFlowStyles as s } from './BookingFlow.styles';
import type { BookingFlowProps } from './BookingFlow.types';

/**
 * Orquestador del flujo de reserva.
 *
 * Renderiza cada paso en función del estado del hook `useBookingFlow`:
 *  1. `slot`: el usuario elige día y hora.
 *  2. `summary`: revisa los datos y añade notas opcionales.
 *  3. `payment`: se crea la reserva en `pending` y se cobra con Stripe.
 *  4. `confirmation`: ve el resultado real del pago según BD.
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
    checkout,
    canAdvance,
    slotExpired,
    paymentPending,
    goNext,
    goBack,
    selectSlot,
    updateDraft,
    chooseAnotherSlot,
    completePayment,
    retryCheckout,
  } = useBookingFlow({ serviceId: service.id });

  // `en` y `de` son opcionales en `LocalizedText`; indexar a pelo deja
  // el nombre del servicio en blanco en esos idiomas.
  const serviceName = pickLocalized(service.name, locale);

  /**
   * Ruta interna del propio flujo, para que `/entrar` y `/registro`
   * sepan devolver al usuario aquí. Sin prefijo de locale: los helpers
   * de `@/i18n/navigation` lo añaden al navegar.
   */
  const bookingPath = `/centro/${providerSlugWithId}/reservar?serviceId=${encodeURIComponent(service.id)}`;

  /**
   * Importe a mostrar.
   *
   * Sólo hay dato de servidor una vez creada la reserva (`checkout`
   * `ready` devuelve el `amountCents` que Stripe va a cobrar). Antes de
   * eso —pasos de hueco y resumen— no existe todavía ninguna reserva, así
   * que enseñamos el precio de catálogo del servicio como estimación. El
   * número que se cobra es siempre el del servidor, y es el que ven el
   * paso de pago y la confirmación.
   */
  const amountCents = checkout.status === 'ready' ? checkout.amountCents : service.priceCents;

  /**
   * URL absoluta a la que Stripe devuelve al usuario si la tarjeta exige
   * 3D Secure. Se construye en cliente porque necesita el `origin` real
   * del navegador; con `localePrefix: 'always'` el locale forma parte
   * del path.
   */
  const returnUrl = useMemo(() => {
    if (typeof window === 'undefined' || !draft.bookingId) return '';
    const base = `${window.location.origin}/${locale}/centro/${providerSlugWithId}/reservar/confirmacion`;
    return `${base}?bookingId=${encodeURIComponent(draft.bookingId)}`;
  }, [locale, providerSlugWithId, draft.bookingId]);

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
          amountCents={amountCents}
          // La reserva sólo pasa a `confirmed` cuando llega el webhook
          // `payment_intent.succeeded`. Hasta que BD lo diga, el copy
          // honesto es "pago en curso" — también en el camino sin 3DS.
          paymentPending={paymentPending}
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
          {serviceName}
        </p>
        <div className={s.stepper} aria-hidden>
          {BOOKING_STEPS.map((stepName, index) => {
            const className =
              index === stepIndex ? s.stepDotActive : index < stepIndex ? s.stepDotDone : s.stepDot;
            return <span key={stepName} className={className} />;
          })}
        </div>
      </header>

      {/* El hueco guardado puede haber caducado mientras el usuario se
          autenticaba. Lo decimos con claridad en lugar de devolverlo al
          calendario sin explicación. */}
      {step === 'slot' && slotExpired && (
        <p className={s.notice} role="status" data-component="booking-flow-slot-expired">
          {t('slotExpiredNotice')}
        </p>
      )}

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
            amountCents={checkout.status === 'ready' ? checkout.amountCents : null}
            onNotesChange={(notes) => updateDraft({ notes })}
          />
        )}

        {step === 'payment' && (
          <BookingCheckoutPanel
            checkout={checkout}
            locale={locale}
            returnUrl={returnUrl}
            redirectUrl={bookingPath}
            onSucceeded={completePayment}
            onRetry={retryCheckout}
            onChooseAnotherSlot={chooseAnotherSlot}
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
