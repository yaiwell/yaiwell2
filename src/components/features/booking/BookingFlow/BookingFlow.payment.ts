'use client';

import { useCallback, useState } from 'react';

import { isOnsiteAllowedByLeadTime } from '@/lib/utils/booking-payment-mode';

import type { BookingConfirmationProps } from '../BookingConfirmation/BookingConfirmation.types';
import type { DisplayedBookingPrice } from '../DiscountedPrice';

import { useOnsiteBooking, type OnsiteBookingState } from './BookingFlow.onsite';
import {
  resolveEffectivePaymentMethod,
  usePaymentOptions,
  type PaymentOptionsState,
} from './BookingFlow.paymentOptions';
import type { BookingDraft, BookingPaymentMethod, CheckoutState } from './BookingFlow.types';

/**
 * Elección del método de pago y reserva en el local (§4.bis), cosida al
 * flujo. Vive aparte para que `useBookingFlow` siga ocupándose solo de
 * pasos y checkout online, y el componente solo componga.
 */

/** Lo que este hook necesita de `useBookingFlow`. */
export interface BookingFlowPaymentDeps {
  serviceId: string;
  step: string;
  draft: BookingDraft;
  checkout: CheckoutState;
  updateDraft: (patch: Partial<BookingDraft>) => void;
  goBack: () => void;
  chooseAnotherSlot: () => void;
  completePayment: () => void;
  discardCheckout: () => void;
}

/**
 * Reserva `pending` propia que hay que soltar antes de reservar en el
 * local: la del checkout online abierto antes de cambiar de método.
 */
export function pendingToReplace(checkout: CheckoutState, draft: BookingDraft): string | null {
  if (checkout.status === 'ready') return checkout.bookingId;
  return draft.bookingId;
}

/**
 * Opciones con el local ya fuera de plazo (última hora): el selector lo
 * enseña desactivado con su motivo aunque la consulta fuera anterior.
 */
export function withOnsiteLastMinute(state: PaymentOptionsState): PaymentOptionsState {
  if (state.status !== 'ready' || state.options.onsite === 'not_offered') return state;
  return {
    status: 'ready',
    options: { ...state.options, onsite: 'last_minute', restrictedUntilIso: null },
  };
}

/** Datos de la reserva que pinta la confirmación. */
export type ConfirmationDetails = Pick<
  BookingConfirmationProps,
  | 'slotStartIso'
  | 'slotEndIso'
  | 'bookingId'
  | 'amountCents'
  | 'originalPriceCents'
  | 'discountPct'
  | 'paymentPending'
  | 'paymentMode'
>;

/**
 * Qué enseña la confirmación, o `null` si aún no hay reserva que enseñar.
 *
 *  - En el local: la reserva recién creada, ya `confirmed` y sin cobro.
 *  - Online: la del borrador; pasa a `confirmed` cuando llega el webhook
 *    `payment_intent.succeeded`, así que hasta que BD lo diga el copy
 *    honesto es «pago en curso» (`paymentPending`), también sin 3DS.
 */
export function resolveConfirmation(
  onsite: OnsiteBookingState,
  draft: BookingDraft,
  price: DisplayedBookingPrice,
  paymentPending: boolean,
): ConfirmationDetails | null {
  if (onsite.status === 'done') {
    const { booking } = onsite;
    return {
      slotStartIso: booking.slotStartIso,
      slotEndIso: booking.slotEndIso,
      bookingId: booking.bookingId,
      amountCents: booking.amountCents,
      originalPriceCents: booking.originalPriceCents,
      discountPct: booking.discountPct,
      paymentPending: false,
      paymentMode: 'onsite',
    };
  }
  if (!draft.bookingId || !draft.slotStartIso || !draft.slotEndIso) return null;
  return {
    slotStartIso: draft.slotStartIso,
    slotEndIso: draft.slotEndIso,
    bookingId: draft.bookingId,
    amountCents: price.amountCents,
    originalPriceCents: price.originalPriceCents,
    discountPct: price.discountPct,
    paymentPending,
    paymentMode: 'online',
  };
}

/**
 * Hook del método de pago del flujo.
 *
 * @param deps — estado y acciones de `useBookingFlow`.
 */
export function useBookingFlowPayment(deps: BookingFlowPaymentDeps) {
  const {
    serviceId,
    step,
    draft,
    checkout,
    updateDraft,
    goBack,
    chooseAnotherSlot,
    completePayment,
    discardCheckout,
  } = deps;

  const fetchedOptions = usePaymentOptions(serviceId, draft.slotStartIso);
  // Hueco para el que el plazo del local venció mientras el cliente
  // estaba en el paso de confirmar: vuelve al resumen con online y aviso.
  const [expiredSlot, setExpiredSlot] = useState<string | null>(null);
  const onsiteLeadTimeExpired = expiredSlot !== null && expiredSlot === draft.slotStartIso;
  const paymentOptions = onsiteLeadTimeExpired
    ? withOnsiteLastMinute(fetchedOptions)
    : fetchedOptions;
  const paymentMethod = resolveEffectivePaymentMethod(draft.paymentMethod, paymentOptions);
  const onsite = useOnsiteBooking({
    onCreated: completePayment,
    onPendingReleased: discardCheckout,
  });
  const resetOnsite = onsite.reset;

  // Con el local elegido y la consulta en curso, «Continuar» espera: si
  // no, el flujo caería a online sin que el cliente lo haya decidido.
  const waitingForOptions =
    step === 'summary' && draft.paymentMethod === 'onsite' && paymentOptions.status === 'loading';

  const choosePaymentMethod = useCallback(
    (method: BookingPaymentMethod) => {
      updateDraft({ paymentMethod: method });
      resetOnsite();
    },
    [updateDraft, resetOnsite],
  );

  const confirmOnsite = useCallback(() => {
    if (!draft.slotStartIso) return;
    // El resumen se vio con margen, pero el reloj sigue: a menos de 2 h ya
    // es última hora (solo online). Se avisa antes de llamar al servidor.
    if (!isOnsiteAllowedByLeadTime(new Date(draft.slotStartIso), new Date())) {
      setExpiredSlot(draft.slotStartIso);
      choosePaymentMethod('online');
      goBack();
      return;
    }
    void onsite.confirm({
      serviceId,
      slotStartIso: draft.slotStartIso,
      notes: draft.notes,
      replacesPendingBookingId: pendingToReplace(checkout, draft),
    });
  }, [onsite, serviceId, draft, checkout, choosePaymentMethod, goBack]);

  /** El local ya no vale para este hueco: vuelta al resumen con online. */
  const payOnline = useCallback(() => {
    choosePaymentMethod('online');
    goBack();
  }, [choosePaymentMethod, goBack]);

  const goBackFromStep = useCallback(() => {
    resetOnsite();
    goBack();
  }, [resetOnsite, goBack]);

  const chooseAnotherSlotFromStep = useCallback(() => {
    resetOnsite();
    chooseAnotherSlot();
  }, [resetOnsite, chooseAnotherSlot]);

  return {
    paymentOptions,
    paymentMethod,
    onsiteState: onsite.state,
    waitingForOptions,
    /** Aviso en el resumen: el local caducó al confirmar (solo con ese hueco). */
    onsiteLeadTimeExpired: onsiteLeadTimeExpired && step === 'summary',
    choosePaymentMethod,
    confirmOnsite,
    payOnline,
    goBack: goBackFromStep,
    chooseAnotherSlot: chooseAnotherSlotFromStep,
  };
}
