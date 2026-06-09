/**
 * Tests de `sendEmail`.
 *
 * Mockeamos `./email.client` para no tocar Resend ni necesitar
 * `RESEND_API_KEY`. El test verifica que orquestamos bien:
 *  - Validación de input (destinatario obligatorio, cuerpo obligatorio).
 *  - Aplicación del remitente por defecto (env > fallback hardcoded).
 *  - Mapeo del error del SDK a `EmailSendError` tipado.
 *  - Caso defensivo: SDK devuelve OK sin id → fallo explícito.
 *  - Camino feliz devuelve `{ providerId }`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('./email.client', () => ({
  getEmailClient: () => ({
    emails: { send: sendMock },
  }),
}));

import { EmailSendError, EmailValidationError } from './email.errors';
import { sendEmail } from './email.service';

describe('sendEmail', () => {
  const ORIGINAL_FROM = process.env.EMAIL_FROM_DEFAULT;

  beforeEach(() => {
    sendMock.mockReset();
    delete process.env.EMAIL_FROM_DEFAULT;
  });

  afterEach(() => {
    process.env.EMAIL_FROM_DEFAULT = ORIGINAL_FROM;
  });

  it('lanza EmailValidationError si no hay destinatarios', async () => {
    await expect(sendEmail({ to: [], subject: 'Hola', html: '<p>Hi</p>' })).rejects.toBeInstanceOf(
      EmailValidationError,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('lanza EmailValidationError si no hay cuerpo (ni html ni text)', async () => {
    await expect(sendEmail({ to: ['a@b.com'], subject: 'Hola' })).rejects.toBeInstanceOf(
      EmailValidationError,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('usa el remitente del mensaje cuando se pasa', async () => {
    sendMock.mockResolvedValue({ data: { id: 'em_1' }, error: null });

    await sendEmail({
      from: 'custom@yaiwell.com',
      to: ['a@b.com'],
      subject: 'Hola',
      text: 'plano',
    });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ from: 'custom@yaiwell.com' }));
  });

  it('aplica EMAIL_FROM_DEFAULT cuando no hay from en el mensaje', async () => {
    process.env.EMAIL_FROM_DEFAULT = 'Yaiwell Sandbox <onboarding@resend.dev>';
    sendMock.mockResolvedValue({ data: { id: 'em_1' }, error: null });

    await sendEmail({ to: ['a@b.com'], subject: 'Hola', text: 'plano' });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Yaiwell Sandbox <onboarding@resend.dev>' }),
    );
  });

  it('cae al fallback hardcoded cuando no hay env ni from', async () => {
    sendMock.mockResolvedValue({ data: { id: 'em_1' }, error: null });

    await sendEmail({ to: ['a@b.com'], subject: 'Hola', text: 'plano' });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Yaiwell <noreply@yaiwell.com>' }),
    );
  });

  it('mapea error del SDK a EmailSendError tipado', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Domain not verified' },
    });

    await expect(
      sendEmail({ to: ['a@b.com'], subject: 'Hola', text: 'plano' }),
    ).rejects.toBeInstanceOf(EmailSendError);
  });

  it('preserva el providerMessage en EmailSendError', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'Domain not verified' },
    });

    try {
      await sendEmail({ to: ['a@b.com'], subject: 'Hola', text: 'plano' });
      expect.fail('debería haber lanzado');
    } catch (err) {
      expect(err).toBeInstanceOf(EmailSendError);
      expect((err as EmailSendError).providerMessage).toBe('Domain not verified');
    }
  });

  it('lanza EmailSendError si Resend devuelve OK sin id', async () => {
    sendMock.mockResolvedValue({ data: null, error: null });

    await expect(
      sendEmail({ to: ['a@b.com'], subject: 'Hola', text: 'plano' }),
    ).rejects.toBeInstanceOf(EmailSendError);
  });

  it('devuelve { providerId } en el camino feliz', async () => {
    sendMock.mockResolvedValue({ data: { id: 'em_abc123' }, error: null });

    const result = await sendEmail({
      to: ['a@b.com'],
      subject: 'Hola',
      html: '<p>Hi</p>',
      replyTo: ['support@yaiwell.com'],
    });

    expect(result).toEqual({ providerId: 'em_abc123' });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['a@b.com'],
        subject: 'Hola',
        html: '<p>Hi</p>',
        replyTo: ['support@yaiwell.com'],
      }),
    );
  });

  it('reenvía headers extra al SDK sin manipular', async () => {
    sendMock.mockResolvedValue({ data: { id: 'em_1' }, error: null });

    await sendEmail({
      to: ['a@b.com'],
      subject: 'Hola',
      text: 'plano',
      headers: { 'X-Entity-Ref-ID': 'booking_42' },
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'X-Entity-Ref-ID': 'booking_42' },
      }),
    );
  });
});
