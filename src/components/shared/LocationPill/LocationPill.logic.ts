'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook que gestiona la apertura del popover del LocationPill.
 *
 * Encapsula:
 *  - Estado `open` con su `toggle`/`close`/`open`.
 *  - Cierre al hacer click fuera del contenedor (ref).
 *  - Cierre al pulsar `Escape`.
 *  - Cierre al recibir un evento de scroll global (UX: si el usuario
 *    está navegando, queremos que el popover no quede colgado tapando
 *    contenido).
 *
 * Devolvemos el `containerRef` para que el JSX lo asigne al wrapper
 * `<div>` (trigger + popover) y la detección de outside click funcione.
 */
export function useLocationPillPopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    if (!open) return;

    // Click fuera: comprobamos que el target del evento no está dentro
    // del contenedor. Usamos `mousedown` en lugar de `click` para
    // anticiparnos al cambio de foco y evitar parpadeos cuando el
    // usuario hace click rápido en un botón externo.
    const handlePointerDown = (event: MouseEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (event.target instanceof Node && node.contains(event.target)) return;
      setOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return { open, toggle, close, containerRef };
}
