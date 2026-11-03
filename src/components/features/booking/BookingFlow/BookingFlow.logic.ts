'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createBookingCheckoutAction } from '@/app/[locale]/centro/[slugWithId]/reservar/actions';

import { buildCheckoutInput, creatingCheckout, readyCheckout } from './BookingFlow.checkout';
import { useCheckoutState } from './BookingFlow.checkoutState';
import { clearBookingDraft } from './BookingFlow.draft';
import { useBookingDraft } from './BookingFlow.persistence';
import { useProfessionalChoice } from './BookingFlow.professional';
import { useBookingPaymentStatus } from './BookingFlow.status';
import { BOOKING_STEPS, nextStep, previousStep } from './BookingFlow.steps';
import type { BookingDraft, BookingPaymentMethod, BookingStep } from './BookingFlow.types';

export { BOOKING_STEPS } from './BookingFlow.steps';

/**
 * Hook que gestiona el estado del flujo de reserva.
 *
 * Encapsula:
 *  - Paso activo y navegación adelante/atrás.
 *  - Draft con la información acumulada (slot, profesional, notas, id),
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
export function useBookingFlow(args: {
  serviceId: string;
  /** Quienes prestan el servicio: validan el profesional del borrador. */
  professionalIds?: readonly string[];
}) {
  const { serviceId, professionalIds } = args;

  const [step, setStep] = useState<BookingStep>('slot');
  const { checkout, checkoutRef, commitCheckout, resetCheckout, expireCheckout } =
    useCheckoutState();
  // El borrador se recupera de `sessionStorage` al montar y se guarda en
  // cada cambio: así sobrevive al viaje a `/entrar` o `/registro`.
  // `slotExpired` avisa de que el hueco guardado ya no admite reserva.
  const { draft, setDraft, slotExpired, setSlotExpired } = useBookingDraft(
    serviceId,
    professionalIds,
  );

  // Espejo del borrador en ref para leerlo en los callbacks sin meterlo
  // en sus dependencias. Se sincroniza en un efecto, no en el render:
  // escribir una ref al renderizar puede dejar un valor obsoleto tras un
  // re-render interrumpido; los handlers corren después del commit.
  const draftRef = useRef<BookingDraft>(draft);

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

    // `commitCheckout` escribe también la ref: el estado de React no se
    // refleja hasta el siguiente render y un doble disparo en el mismo
    // tick crearía dos reservas para el mismo hueco.
    const creating = creatingCheckout(draft.slotStartIso);
    commitCheckout(creating);

    const result = await createBookingCheckoutAction(
      buildCheckoutInput(serviceId, draft, draft.slotStartIso),
    );

    if (!result.ok) {
      commitCheckout({ status: 'error', code: result.code });
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
    commitCheckout(readyCheckout(result, creating.estimatedLastMinute));
  }, [serviceId, draft, setDraft, checkoutRef, commitCheckout]);

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

      if (slotChanged) resetCheckout();
    },
    [setDraft, setSlotExpired, resetCheckout],
  );

  const { selectProfessional, clearSlot } = useProfessionalChoice({
    draftRef,
    setDraft,
    resetCheckout,
  });

  /**
   * Vuelve al calendario descartando el hueco actual.
   *
   * Es la salida del callejón `SLOT_UNAVAILABLE`: alguien se adelantó y
   * reintentar el mismo hueco fallaría siempre. Limpiamos hueco y
   * checkout para que el usuario elija otro y el flujo cree una reserva
   * nueva. Con `resetProfessional` (el profesional elegido ya no presta
   * el servicio) vuelve además a «cualquiera»; el aviso lo pone el caller.
   */
  const chooseAnotherSlot = useCallback(
    (resetProfessional = false) => {
      resetCheckout();
      setDraft((prev) => ({
        ...prev,
        slotStartIso: null,
        slotEndIso: null,
        bookingId: null,
        professionalId: resetProfessional ? null : prev.professionalId,
      }));
      setSlotExpired(!resetProfessional);
      setStep('slot');
    },
    [setDraft, setSlotExpired, resetCheckout],
  );

  /** La reserva `pending` del checkout se soltó (cambio a pagar en el local). */
  const discardCheckout = useCallback(() => {
    resetCheckout();
    setDraft((prev) => ({ ...prev, bookingId: null }));
  }, [setDraft, resetCheckout]);

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
    selectProfessional,
    clearSlot,
    chooseAnotherSlot,
    completePayment,
    retryCheckout,
    expireCheckout,
    discardCheckout,
  };
}
