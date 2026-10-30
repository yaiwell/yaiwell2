'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createBookingCheckoutAction } from '@/app/[locale]/centro/[slugWithId]/reservar/actions';

import { creatingCheckout, readyCheckout } from './BookingFlow.checkout';
import { clearBookingDraft } from './BookingFlow.draft';
import { useBookingDraft } from './BookingFlow.persistence';
import { useBookingPaymentStatus } from './BookingFlow.status';
import { BOOKING_STEPS, nextStep, previousStep } from './BookingFlow.steps';
import type {
  BookingDraft,
  BookingPaymentMethod,
  BookingStep,
  CheckoutState,
} from './BookingFlow.types';

export { BOOKING_STEPS } from './BookingFlow.steps';

/**
 * Hook que gestiona el estado del flujo de reserva.
 *
 * Encapsula:
 *  - Paso activo y navegación adelante/atrás.
 *  - Draft con la información acumulada (slot, notas, id de reserva),
 *    persistido en `sessionStorage` para que sobreviva al viaje a
 *    `/entrar` o `/registro`.
 *  - Apertura del checkout de Stripe al entrar en el paso de pago.
 *  - Estado real de la reserva en la pantalla de confirmación.
 *
 * La reserva se crea en BD (estado `pending`) al pasar de "resumen" a
 * "pago", no al pulsar "pagar": así el slot queda retenido mientras el
 * usuario introduce la tarjeta y dos clientes no compiten por el mismo
 * hueco en los segundos del formulario.
 */
export function useBookingFlow(args: { serviceId: string }) {
  const { serviceId } = args;

  const [step, setStep] = useState<BookingStep>('slot');
  const [checkout, setCheckout] = useState<CheckoutState>({ status: 'idle' });
  // El borrador se recupera de `sessionStorage` al montar y se guarda en
  // cada cambio: así sobrevive al viaje a `/entrar` o `/registro`.
  // `slotExpired` avisa de que el hueco guardado ya no admite reserva.
  const { draft, setDraft, slotExpired, setSlotExpired } = useBookingDraft(serviceId);

  // Espejos del estado en refs para leerlo en los callbacks sin meterlo
  // en sus dependencias. Se sincronizan en un efecto, no en el render:
  // escribir una ref al renderizar puede dejar un valor obsoleto tras un
  // re-render interrumpido; los handlers corren después del commit.
  const checkoutRef = useRef<CheckoutState>(checkout);
  const draftRef = useRef<BookingDraft>(draft);

  useEffect(() => {
    checkoutRef.current = checkout;
  }, [checkout]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const stepIndex = useMemo(() => BOOKING_STEPS.indexOf(step), [step]);

  // En la confirmación el estado lo dicta BD, no el retorno de Stripe.
  const { paymentPending } = useBookingPaymentStatus({
    bookingId: draft.bookingId,
    active: step === 'confirmation',
  });

  /**
   * Crea la reserva y el PaymentIntent.
   *
   * Idempotente frente a navegación: si ya hay un checkout listo o en
   * curso no lo repite. Volver atrás al resumen y avanzar de nuevo
   * reutiliza la misma reserva en lugar de crear una segunda que
   * chocaría contra la primera por solapamiento.
   */
  const startCheckout = useCallback(async () => {
    if (checkoutRef.current.status === 'creating' || checkoutRef.current.status === 'ready') {
      return;
    }
    if (!draft.slotStartIso) return;

    // Escribimos también la ref: el estado de React no se refleja hasta
    // el siguiente render y un doble disparo en el mismo tick crearía
    // dos reservas para el mismo hueco.
    const creating = creatingCheckout(draft.slotStartIso);
    checkoutRef.current = creating;
    setCheckout(creating);

    const result = await createBookingCheckoutAction({
      serviceId,
      slotStartIso: draft.slotStartIso,
      notes: draft.notes.trim() || undefined,
    });

    if (!result.ok) {
      setCheckout({ status: 'error', code: result.code });
      return;
    }

    setDraft((prev) => ({
      ...prev,
      bookingId: result.bookingId,
      // El servicio devuelve el rango tal y como quedó persistido; si
      // hubo cualquier normalización, mandan los datos de BD.
      slotStartIso: result.slotStartIso,
      slotEndIso: result.slotEndIso,
    }));
    setCheckout(readyCheckout(result, creating.estimatedLastMinute));
  }, [serviceId, draft.slotStartIso, draft.notes, setDraft]);

  const goNext = useCallback(
    (paymentMethod: BookingPaymentMethod = 'online') => {
      // El salto resumen → pago es el que dispara la creación de la
      // reserva online. Cambiamos de paso antes de esperar a la red para
      // que el usuario vea el spinner del checkout en lugar de un botón
      // muerto. En el local no se crea nada hasta «Confirmar reserva».
      if (step === 'summary') {
        setStep('payment');
        if (paymentMethod === 'online') void startCheckout();
        return;
      }

      setStep(nextStep);
    },
    [step, startCheckout],
  );

  const goBack = useCallback(() => {
    setStep(previousStep);
  }, []);

  const updateDraft = useCallback(
    (patch: Partial<BookingDraft>) => {
      setDraft((prev) => ({ ...prev, ...patch }));
    },
    [setDraft],
  );

  /**
   * Selecciona un hueco. Si el usuario cambia de slot después de haber
   * abierto el checkout, ese checkout deja de valer: apunta a una reserva
   * de otra hora. Lo reseteamos para que el siguiente avance cree una
   * reserva nueva sobre el slot correcto.
   */
  const selectSlot = useCallback(
    (startAtIso: string, endAtIso: string) => {
      const slotChanged = draftRef.current.slotStartIso !== startAtIso;

      // Elegir hueco retira el aviso de "el anterior ya no vale": el
      // usuario acaba de resolverlo.
      setSlotExpired(false);
      setDraft((prev) => ({
        ...prev,
        slotStartIso: startAtIso,
        slotEndIso: endAtIso,
        bookingId: slotChanged ? null : prev.bookingId,
      }));

      if (slotChanged) {
        checkoutRef.current = { status: 'idle' };
        setCheckout({ status: 'idle' });
      }
    },
    [setDraft, setSlotExpired],
  );

  /**
   * Vuelve al calendario descartando el hueco actual.
   *
   * Es la salida del callejón `SLOT_UNAVAILABLE`: alguien se adelantó y
   * reintentar el mismo hueco fallaría siempre. Limpiamos hueco y
   * checkout para que el usuario elija otro y el flujo cree una reserva
   * nueva.
   */
  const chooseAnotherSlot = useCallback(() => {
    checkoutRef.current = { status: 'idle' };
    setCheckout({ status: 'idle' });
    setDraft((prev) => ({ ...prev, slotStartIso: null, slotEndIso: null, bookingId: null }));
    setSlotExpired(true);
    setStep('slot');
  }, [setDraft, setSlotExpired]);

  /** La reserva `pending` del checkout se soltó (cambio a pagar en el local). */
  const discardCheckout = useCallback(() => {
    checkoutRef.current = { status: 'idle' };
    setCheckout({ status: 'idle' });
    setDraft((prev) => ({ ...prev, bookingId: null }));
  }, [setDraft]);

  /** Retención vencida antes de pagar (nada cobrado): el panel ofrece otra hora. */
  const expireCheckout = useCallback(() => {
    checkoutRef.current = { status: 'error', code: 'HOLD_EXPIRED' };
    setCheckout(checkoutRef.current);
  }, []);

  /**
   * Avanza a la confirmación tras un pago resuelto sin redirección.
   *
   * No marca la reserva como confirmada: eso lo hace el webhook
   * `payment_intent.succeeded`, y `useBookingPaymentStatus` se encarga
   * de preguntarle a BD si ya ha pasado. Aquí sólo cambiamos de
   * pantalla y tiramos el borrador, que ya cumplió su función.
   */
  const completePayment = useCallback(() => {
    clearBookingDraft();
    setStep('confirmation');
  }, []);

  /** Reintento tras un error: desde `error` el guard de `startCheckout` no bloquea. */
  const retryCheckout = useCallback(() => {
    void startCheckout();
  }, [startCheckout]);

  const canAdvance = useMemo<boolean>(() => {
    if (step === 'slot') return draft.slotStartIso !== null;
    return true;
  }, [step, draft.slotStartIso]);

  return {
    step,
    stepIndex,
    draft,
    checkout,
    canAdvance,
    slotExpired,
    paymentPending,
    goNext,
    goBack,
    updateDraft,
    selectSlot,
    chooseAnotherSlot,
    completePayment,
    retryCheckout,
    expireCheckout,
    discardCheckout,
  };
}
