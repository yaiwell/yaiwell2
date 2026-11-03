'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { CheckoutState } from './BookingFlow.types';

/**
 * Estado del checkout online del flujo con su espejo en ref.
 *
 * Va aparte de `useBookingFlow` para que ese hook no pase de las ~250
 * líneas. La ref existe para leer el estado en los callbacks sin meterlo
 * en sus dependencias; se sincroniza en un efecto (no en el render) y
 * las transiciones la escriben a la vez que el estado, para que un doble
 * disparo en el mismo tick vea ya el valor nuevo.
 */
export function useCheckoutState() {
  const [checkout, setCheckout] = useState<CheckoutState>({ status: 'idle' });
  const checkoutRef = useRef<CheckoutState>(checkout);

  useEffect(() => {
    checkoutRef.current = checkout;
  }, [checkout]);

  /** Fija un estado nuevo en ref y en React a la vez. */
  const commitCheckout = useCallback((next: CheckoutState) => {
    checkoutRef.current = next;
    setCheckout(next);
  }, []);

  /** Olvida el checkout abierto: apuntaba a una reserva que ya no vale. */
  const resetCheckout = useCallback(() => commitCheckout({ status: 'idle' }), [commitCheckout]);

  /** Retención vencida antes de pagar (nada cobrado): el panel ofrece otra hora. */
  const expireCheckout = useCallback(
    () => commitCheckout({ status: 'error', code: 'HOLD_EXPIRED' }),
    [commitCheckout],
  );

  return { checkout, checkoutRef, commitCheckout, resetCheckout, expireCheckout };
}
