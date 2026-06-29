import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewReplyForm } from './ReviewReplyForm';

/**
 * Mock de la server action: importa `auth` de `@clerk/nextjs/server`
 * y `prisma`, que romperían el render en happy-dom. Spy directo para
 * poder assertear los argumentos del submit.
 */
const replyToReviewActionMock = vi.fn();
vi.mock('@/app/[locale]/panel/valoraciones/actions', () => ({
  replyToReviewAction: (...args: unknown[]) => replyToReviewActionMock(...args),
}));

/**
 * Mensajes mínimos del namespace `providerPanel.reviews` necesarios para
 * que `useTranslations` no lance error de claves faltantes.
 */
const messages = {
  providerPanel: {
    reviews: {
      card: {
        pending: 'Pendiente de responder',
      },
      reply: {
        button: 'Responder',
        placeholder: 'Escribe tu respuesta…',
        submit: 'Enviar respuesta',
        submitting: 'Enviando…',
        cancel: 'Cancelar',
        alreadyReplied: 'Tu respuesta',
        errors: {
          VALIDATION: 'Validación',
          REVIEW_NOT_FOUND: 'No encontrada',
          FORBIDDEN: 'Sin permiso',
          INTERNAL: 'Error interno',
        },
      },
    },
  },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ReviewReplyForm', () => {
  beforeEach(() => {
    // Limpiamos llamadas previas para que cada test arranque con el mock
    // en estado neutro. Sin esto, las aserciones `toHaveBeenCalledWith`
    // verían interacciones de tests anteriores.
    replyToReviewActionMock.mockReset();
  });

  it('muestra la card de respuesta existente cuando ya hay providerResponse y omite el formulario', () => {
    renderWithIntl(
      <ReviewReplyForm
        reviewId="review-1"
        locale="es"
        existingResponse={{
          text: 'Gracias por tu valoración.',
          respondedAt: new Date('2026-05-10T10:00:00.000Z'),
        }}
      />,
    );

    expect(screen.getByText('Tu respuesta')).toBeInTheDocument();
    expect(screen.getByText('Gracias por tu valoración.')).toBeInTheDocument();
    // No debe renderizar el botón "Responder" ni el formulario.
    expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument();
  });

  it('renderiza el botón "Responder" y, al pulsarlo, expone el textarea con submit/cancel', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ReviewReplyForm reviewId="review-2" locale="es" existingResponse={null} />);

    const openButton = screen.getByRole('button', { name: 'Responder' });
    await user.click(openButton);

    expect(screen.getByPlaceholderText('Escribe tu respuesta…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar respuesta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('al enviar el formulario llama a `replyToReviewAction` con (locale, reviewId, texto)', async () => {
    replyToReviewActionMock.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();

    renderWithIntl(<ReviewReplyForm reviewId="review-3" locale="es" existingResponse={null} />);

    await user.click(screen.getByRole('button', { name: 'Responder' }));
    const textarea = screen.getByPlaceholderText('Escribe tu respuesta…');
    await user.type(textarea, 'Gracias por tu visita');
    await user.click(screen.getByRole('button', { name: 'Enviar respuesta' }));

    expect(replyToReviewActionMock).toHaveBeenCalledTimes(1);
    expect(replyToReviewActionMock).toHaveBeenCalledWith('es', 'review-3', 'Gracias por tu visita');
  });

  it('al pulsar "Cancelar" colapsa el formulario y limpia el texto sin llamar a la action', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ReviewReplyForm reviewId="review-4" locale="es" existingResponse={null} />);

    await user.click(screen.getByRole('button', { name: 'Responder' }));
    await user.type(screen.getByPlaceholderText('Escribe tu respuesta…'), 'Borrador');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    // El formulario ya no debería estar visible.
    expect(screen.queryByPlaceholderText('Escribe tu respuesta…')).not.toBeInTheDocument();
    // Y la action no debe haber sido llamada en ningún momento.
    expect(replyToReviewActionMock).not.toHaveBeenCalled();
  });
});
