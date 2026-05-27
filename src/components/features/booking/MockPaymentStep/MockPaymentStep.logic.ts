'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Latencia simulada del "pago" mock. Lo bastante larga para que el
 * usuario perciba el spinner pero no tanto como para frustrar la demo.
 */
const MOCK_PAYMENT_DELAY_MS = 800;

/**
 * Hook que controla el estado del paso de pago mock.
 *
 * Encapsula:
 *  - Flag de "procesando" mientras corre el setTimeout.
 *  - Referencia al timeout para limpiarlo si el componente se desmonta
 *    antes de que dispare (evita warnings de React).
 *  - Función `pay` idempotente (no dispara dos veces si el usuario
 *    insiste en el botón).
 */
export function useMockPayment(onComplete: () => void) {
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pay = useCallback(() => {
    if (isProcessing) return;

    setIsProcessing(true);
    timeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
      timeoutRef.current = null;
      onComplete();
    }, MOCK_PAYMENT_DELAY_MS);
  }, [isProcessing, onComplete]);

  return { isProcessing, pay };
}
