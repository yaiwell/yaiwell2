import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock de la server action — el módulo importa `server-only` y dependencias
// que romperían el render en happy-dom. El handler se sobrescribe por test.
const deleteServiceActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/servicios/actions', () => ({
  deleteServiceAction: (...args: unknown[]) => deleteServiceActionMock(...args),
}));

// Importamos después del mock para que el componente capture la versión mockeada.
import { ServiceDeleteButton } from './ServiceDeleteButton';

const messages = {
  providerPanel: {
    services: {
      delete: {
        button: 'Eliminar',
        confirmTitle: '¿Eliminar servicio?',
        confirmDescription:
          'Esta acción no se puede deshacer. El servicio dejará de aparecer en tu panel.',
        confirmAction: 'Eliminar',
        cancel: 'Cancelar',
        deleting: 'Eliminando…',
        errors: {
          notFound: 'Este servicio ya no existe.',
          forbidden: 'No tienes permiso para eliminar este servicio.',
          internal: 'No se ha podido eliminar.',
        },
      },
    },
  },
};

function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ServiceDeleteButton locale="es" serviceId="svc-1" />
    </NextIntlClientProvider>,
  );
}

describe('ServiceDeleteButton', () => {
  beforeEach(() => {
    deleteServiceActionMock.mockReset();
  });

  it('no muestra el diálogo hasta que se pulsa el botón trigger', () => {
    renderButton();

    // El title del AlertDialog no debe estar en el documento mientras
    // el diálogo está cerrado (Radix sólo monta el Portal en open).
    expect(screen.queryByText('¿Eliminar servicio?')).not.toBeInTheDocument();
  });

  it('abre el diálogo de confirmación al pulsar el botón "Eliminar"', async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(screen.getByText('¿Eliminar servicio?')).toBeInTheDocument();
    expect(screen.getByText(/Esta acción no se puede deshacer/i)).toBeInTheDocument();
  });

  it('al pulsar "Cancelar" cierra el diálogo y NO llama a la action', async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(deleteServiceActionMock).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Eliminar servicio?')).not.toBeInTheDocument();
  });

  it('al pulsar "Eliminar" en el diálogo invoca la action con (locale, serviceId)', async () => {
    deleteServiceActionMock.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    // El segundo botón "Eliminar" (dentro del diálogo) es el confirm.
    const confirmButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(deleteServiceActionMock).toHaveBeenCalledTimes(1);
    expect(deleteServiceActionMock).toHaveBeenCalledWith('es', 'svc-1');
  });

  it('muestra el banner de error si la action devuelve FORBIDDEN', async () => {
    deleteServiceActionMock.mockResolvedValueOnce({ ok: false, code: 'FORBIDDEN' });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(
      await screen.findByText('No tienes permiso para eliminar este servicio.'),
    ).toBeInTheDocument();
    // El diálogo sigue abierto para que el usuario lea el error.
    expect(screen.getByText('¿Eliminar servicio?')).toBeInTheDocument();
  });
});
