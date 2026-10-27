import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

/**
 * Tests del formulario de valoración del cliente.
 *
 * La server action se mockea: aquí se prueba la UI (radio group de
 * estrellas accesible por teclado, validación de longitud con el schema
 * del dominio, estados de envío y errores traducidos). El contrato de la
 * action tiene su propio test.
 */

const submitReviewAction = vi.hoisted(() => vi.fn());
vi.mock('@/app/[locale]/mis-reservas/actions', () => ({ submitReviewAction }));

import { ReviewDialog } from './ReviewDialog';
import { ReviewForm } from './ReviewForm';
import { REVIEW_TEXT_MAX, REVIEW_TEXT_MIN } from './ReviewForm.logic';

const BOOKING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const f = messages.customerArea.reviewForm;
const VALID_TEXT = 'Muy buen servicio, volveré pronto.';

function withIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="Europe/Madrid">
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  submitReviewAction.mockReset();
});

describe('ReviewForm', () => {
  it('renderiza 5 estrellas con etiqueta de texto, el textarea y el botón de enviar', () => {
    withIntl(<ReviewForm bookingId={BOOKING_ID} />);

    expect(screen.getByRole('group', { name: f.ratingLegend })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: '4 estrellas: Muy bien' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: f.textLabel })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: f.submit })).toBeInTheDocument();
  });

  it('permite elegir la puntuación con el teclado', async () => {
    const user = userEvent.setup();
    withIntl(<ReviewForm bookingId={BOOKING_ID} />);

    await user.tab();
    expect(screen.getByRole('radio', { name: '1 estrella: Muy mal' })).toHaveFocus();

    await user.keyboard(' ');
    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(screen.getByRole('radio', { name: '3 estrellas: Correcto' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '1 estrella: Muy mal' })).not.toBeChecked();
  });

  it('exige puntuación antes de enviar', async () => {
    const user = userEvent.setup();
    withIntl(<ReviewForm bookingId={BOOKING_ID} />);

    await user.type(screen.getByRole('textbox'), VALID_TEXT);
    await user.click(screen.getByRole('button', { name: f.submit }));

    const error = screen.getByText(f.fieldErrors.RATING_REQUIRED);
    const group = screen.getByRole('group', { name: f.ratingLegend });
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(group).toHaveAttribute('aria-required', 'true');
    expect(group).toHaveAttribute('aria-describedby', error.id);
    expect(submitReviewAction).not.toHaveBeenCalled();
  });

  it('rechaza un texto de menos de 10 caracteres (sin contar espacios)', async () => {
    const user = userEvent.setup();
    withIntl(<ReviewForm bookingId={BOOKING_ID} />);

    await user.click(screen.getByRole('radio', { name: '5 estrellas: Excelente' }));
    await user.type(screen.getByRole('textbox'), '   corto   ');
    await user.click(screen.getByRole('button', { name: f.submit }));

    expect(screen.getByText('Escribe al menos 10 caracteres.')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(submitReviewAction).not.toHaveBeenCalled();
  });

  it('lee los límites del schema aunque el texto se recorte (trim)', () => {
    expect(REVIEW_TEXT_MIN).toBe(10);
    expect(REVIEW_TEXT_MAX).toBe(2000);
  });

  it('muestra el contador de caracteres', async () => {
    const user = userEvent.setup();
    withIntl(<ReviewForm bookingId={BOOKING_ID} />);

    await user.type(screen.getByRole('textbox'), 'Hola');

    expect(screen.getByText('4 / 2000')).toBeInTheDocument();
  });

  it('envía puntuación y texto recortado y muestra el mensaje de éxito', async () => {
    const user = userEvent.setup();
    submitReviewAction.mockResolvedValue({ ok: true });
    withIntl(<ReviewForm bookingId={BOOKING_ID} />);

    await user.click(screen.getByRole('radio', { name: '4 estrellas: Muy bien' }));
    await user.type(screen.getByRole('textbox'), `  ${VALID_TEXT}  `);
    await user.click(screen.getByRole('button', { name: f.submit }));

    expect(submitReviewAction).toHaveBeenCalledWith('es', {
      bookingId: BOOKING_ID,
      rating: 4,
      text: VALID_TEXT,
    });
    expect(await screen.findByText(f.success)).toBeInTheDocument();
  });

  it('traduce el código de error que devuelve la action', async () => {
    const user = userEvent.setup();
    submitReviewAction.mockResolvedValue({ ok: false, code: 'WINDOW_EXPIRED' });
    withIntl(<ReviewForm bookingId={BOOKING_ID} />);

    await user.click(screen.getByRole('radio', { name: '2 estrellas: Mejorable' }));
    await user.type(screen.getByRole('textbox'), VALID_TEXT);
    await user.click(screen.getByRole('button', { name: f.submit }));

    expect(await screen.findByText(f.errors.WINDOW_EXPIRED)).toBeInTheDocument();
    expect(screen.queryByText(f.success)).toBeNull();
  });
});

describe('ReviewDialog', () => {
  it('abre el formulario desde el CTA «Valorar»', async () => {
    const user = userEvent.setup();
    withIntl(
      <ReviewDialog bookingId={BOOKING_ID} serviceName="Masaje relax" providerName="Casa Mar" />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Valorar/ }));

    const dialog = await screen.findByRole('dialog', { name: f.title });
    expect(dialog).toHaveTextContent('Masaje relax en Casa Mar');
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });
});
