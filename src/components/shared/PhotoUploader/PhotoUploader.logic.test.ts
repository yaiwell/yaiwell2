/**
 * Regresión: un consumidor que pasa `onChange` como función nueva en cada
 * render (p. ej. la tarjeta de fotos de «Mi negocio» o la ficha de un
 * profesional) no debe recibir las URLs en cada render. Antes el efecto
 * dependía de `onChange` y, al guardar o cambiar estado en él, la página
 * entraba en bucle («El panel ha tenido un problema» al añadir un tramo
 * o marcar un día cerrado).
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePhotoUploader } from './PhotoUploader.logic';

describe('usePhotoUploader', () => {
  it('no llama a onChange al volver a renderizar con un callback nuevo', () => {
    const calls = vi.fn();
    const { rerender } = renderHook(
      ({ tick }: { tick: number }) =>
        usePhotoUploader({
          bucket: 'provider-photos',
          ownerId: 'prov-1',
          maxFiles: 6,
          initialUrls: ['https://example.supabase.co/a.jpg'],
          // Función nueva en cada render, como en los consumidores reales.
          onChange: (urls: string[]) => calls(tick, urls),
        }),
      { initialProps: { tick: 0 } },
    );

    rerender({ tick: 1 });
    rerender({ tick: 2 });
    rerender({ tick: 3 });

    expect(calls).not.toHaveBeenCalled();
  });
});
