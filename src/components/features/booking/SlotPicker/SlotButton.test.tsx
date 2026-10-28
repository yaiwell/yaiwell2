import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

import { SlotButton } from './SlotButton';

/**
 * Tests del botón de hueco con y sin oferta de hueco liberado.
 * Usamos los mensajes reales para que falle si se pierde una clave.
 */

const OFFER = { discountPct: 20, priceCents: 3600, originalPriceCents: 4500 };

const offerMark = () => document.querySelector('[data-component="booking-slot-picker-slot-offer"]');

function renderButton(props: Partial<Parameters<typeof SlotButton>[0]> = {}) {
  const onClick = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SlotButton
        label="17:00"
        available
        selected={false}
        locale="es"
        onClick={onClick}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return onClick;
}

describe('SlotButton', () => {
  it('sin oferta pinta solo la hora y no añade marca ni aria-label', () => {
    renderButton();

    const button = screen.getByRole('button', { name: '17:00' });
    expect(button).not.toHaveAttribute('aria-label');
    expect(offerMark()).toBeNull();
  });

  it('con oferta enseña «−20 %» y anuncia el precio rebajado', async () => {
    const onClick = renderButton({ offer: OFFER });

    const button = screen.getByRole('button', {
      name: /17:00, hueco liberado con un 20 % de descuento: 36\s€/u,
    });
    expect(button).toHaveAttribute('data-offer', 'true');
    expect(offerMark()).toHaveTextContent('−20 %');

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('mantiene la marca al seleccionarlo', () => {
    renderButton({ offer: OFFER, selected: true });

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    expect(offerMark()).toHaveTextContent('−20 %');
  });
});
