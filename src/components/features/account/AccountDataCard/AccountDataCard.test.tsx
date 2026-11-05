/**
 * Tests del bloque «Tus datos»: la eliminación pide confirmación, explica por
 * qué se bloquea y solo cierra la sesión si el servidor la eliminó.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import es from '@/messages/es.json';

const { signOut, deleteAction } = vi.hoisted(() => ({
  signOut: vi.fn(),
  deleteAction: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({ useClerk: () => ({ signOut }) }));
vi.mock('@/app/[locale]/cuenta/account-data.actions', () => ({
  deleteAccountAction: deleteAction,
}));

import { AccountDataCard } from './AccountDataCard';

function renderCard() {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <AccountDataCard locale="es" />
    </NextIntlClientProvider>,
  );
}

const t = es.account.data;

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue(undefined);
});

describe('AccountDataCard', () => {
  it('ofrece la descarga desde el endpoint de datos', () => {
    renderCard();

    expect(screen.getByRole('link', { name: t.download })).toHaveAttribute(
      'href',
      '/api/account/export',
    );
  });

  it('no elimina nada hasta confirmar', () => {
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: t.delete }));

    expect(deleteAction).not.toHaveBeenCalled();
    expect(screen.getByText(t.confirmTitle)).toBeInTheDocument();
  });

  it('al confirmar elimina y cierra la sesión', async () => {
    deleteAction.mockResolvedValue({ ok: true });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: t.delete }));
    fireEvent.click(screen.getByRole('button', { name: t.confirm }));

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/es' }));
  });

  it('explica el bloqueo y no cierra la sesión', async () => {
    deleteAction.mockResolvedValue({ ok: false, code: 'open_bookings' });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: t.delete }));
    fireEvent.click(screen.getByRole('button', { name: t.confirm }));

    expect(await screen.findByText(t.errors.open_bookings)).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });
});
