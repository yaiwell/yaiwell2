'use client';

import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

/**
 * Estado de la vista de día móvil: qué pestaña está activa y la
 * navegación con flechas entre pestañas (patrón WAI-ARIA de tabs).
 *
 * @param initialIndex — día que abre la vista (lo decide el servidor
 *   para que el primer HTML y la hidratación coincidan).
 * @param count — número de pestañas (7).
 */
export function useSelectedDay(initialIndex: number, count: number) {
  const [selected, setSelected] = useState(initialIndex);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = useCallback((index: number) => {
    setSelected(index);
    tabRefs.current[index]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const moves: Record<string, number> = {
        ArrowRight: (selected + 1) % count,
        ArrowLeft: (selected - 1 + count) % count,
        Home: 0,
        End: count - 1,
      };
      const next = moves[event.key];
      if (next === undefined) return;
      event.preventDefault();
      focusTab(next);
    },
    [count, focusTab, selected],
  );

  return { selected, setSelected, tabRefs, handleKeyDown };
}
