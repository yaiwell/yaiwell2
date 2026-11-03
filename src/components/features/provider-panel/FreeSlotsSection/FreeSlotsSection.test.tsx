import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

// La action real arrastra Prisma y Clerk: aquí solo se comprueba qué se le envía.
const releaseFreeSlotActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/calendario/slot-offers.actions', () => ({
  releaseCancelledSlotAction: vi.fn(),
  releaseFreeSlotAction: (...args: unknown[]) => releaseFreeSlotActionMock(...args),
  withdrawSlotOfferAction: vi.fn(),
}));

import { ReleaseSlotPromptProvider } from '../ReleaseSlotDialog';
import { FreeSlotsSection } from './index';
import type { PanelFreeSlot } from './FreeSlotsSection.types';

const START = new Date(Date.now() + 90 * 60 * 1000).toISOString();

function slot(professionalId: string, professionalName: string): PanelFreeSlot {
  return {
    serviceId: 'svc-1',
    serviceName: 'Corte mujer',
    professionalId,
    professionalName,
    startAtIso: START,
    startTime: '17:30',
    endTime: '18:15',
  };
}

function renderSection(slots: PanelFreeSlot[], showProfessional: boolean) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ReleaseSlotPromptProvider locale="es">
        <FreeSlotsSection slots={slots} readOnly={false} showProfessional={showProfessional} />
      </ReleaseSlotPromptProvider>
    </NextIntlClientProvider>,
  );
}

describe('FreeSlotsSection · equipo', () => {
  beforeEach(() => {
    releaseFreeSlotActionMock.mockReset();
  });

  it('con equipo dice de quién es cada hueco y libera el de ese profesional', async () => {
    releaseFreeSlotActionMock.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    renderSection([slot('pro-ana', 'Ana'), slot('pro-luis', 'Luis')], true);

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Liberar con descuento Corte mujer a las 17:30 · Luis',
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Corte mujer · 17:30 · Luis')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Ofrecer con descuento' }));
    expect(releaseFreeSlotActionMock).toHaveBeenCalledWith('es', {
      serviceId: 'svc-1',
      professionalId: 'pro-luis',
      startAtIso: START,
      discounts: { over2h: 0, oneToTwoHours: 20, underOneHour: 30 },
    });
  });

  it('con un solo profesional no lo nombra, pero sigue enviando su id', async () => {
    releaseFreeSlotActionMock.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    renderSection([slot('pro-ana', 'Ana')], false);

    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Liberar con descuento Corte mujer a las 17:30' }),
    );
    await user.click(screen.getByRole('button', { name: 'Ofrecer con descuento' }));
    expect(releaseFreeSlotActionMock).toHaveBeenCalledWith(
      'es',
      expect.objectContaining({ professionalId: 'pro-ana' }),
    );
  });
});
