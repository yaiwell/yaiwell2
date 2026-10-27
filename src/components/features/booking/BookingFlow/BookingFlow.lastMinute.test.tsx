import { render, renderHook, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import messages from '@/messages/es.json';

import { LastMinuteNotice } from '../LastMinuteNotice';

import { useIsLastMinuteSlot } from './BookingFlow.lastMinute';

/**
 * Tests de la detección de reserva de última hora en el flujo y del
 * aviso corto que acompaña al botón de pagar.
 */

const NOW = new Date('2026-10-05T10:00:00.000Z');

describe('useIsLastMinuteSlot', () => {
  it('es de última hora un hueco a 1 h 59 min', () => {
    const { result } = renderHook(() => useIsLastMinuteSlot('2026-10-05T11:59:00.000Z', NOW));
    expect(result.current).toBe(true);
  });

  it('no lo es un hueco a 2 h ni uno de otro día', () => {
    const atTwo = renderHook(() => useIsLastMinuteSlot('2026-10-05T12:00:00.000Z', NOW));
    const farAway = renderHook(() => useIsLastMinuteSlot('2026-10-08T12:00:00.000Z', NOW));
    expect(atTwo.result.current).toBe(false);
    expect(farAway.result.current).toBe(false);
  });

  it('sin hueco elegido no hay nada de lo que avisar', () => {
    const { result } = renderHook(() => useIsLastMinuteSlot(null, NOW));
    expect(result.current).toBe(false);
  });
});

describe('LastMinuteNotice', () => {
  function renderNotice(variant: 'policy' | 'compact') {
    return render(
      <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
        <LastMinuteNotice variant={variant} id="aviso" />
      </NextIntlClientProvider>,
    );
  }

  it('la variante corta dice «No reembolsable» con rol de estado', () => {
    renderNotice('compact');
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('No reembolsable');
    expect(notice).toHaveAttribute('id', 'aviso');
  });

  it('la variante de política explica las condiciones completas', () => {
    renderNotice('policy');
    expect(screen.getByRole('status')).toHaveTextContent('te devolvemos el 100 %');
  });
});
