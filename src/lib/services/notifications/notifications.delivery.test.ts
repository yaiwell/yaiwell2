/**
 * Tests del envío de un correo ya construido: direcciones de prueba y
 * reintentos ante fallos pasajeros de Resend.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as EmailErrors from '@/lib/integrations/email/email.errors';

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock('server-only', () => ({}));
// Errores reales: el reintento depende de cómo `EmailSendError` clasifica
// el fallo; solo se sustituye el envío.
vi.mock('@/lib/integrations/email', async () => {
  const errors = await vi.importActual<typeof EmailErrors>('@/lib/integrations/email/email.errors');
  return { ...errors, sendEmail: mocks.sendEmail };
});

import { EmailConfigError, EmailSendError } from '@/lib/integrations/email';

import { deliverEmail, isTestAddress } from './notifications.delivery';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('isTestAddress', () => {
  it.each([
    ['e2e+clerk_test@example.com', true],
    ['dev-client@yaiwell.local', true],
    ['x@foo.test', true],
    ['ana@gmail.com', false],
  ])('%s → %s', (email, expected) => {
    expect(isTestAddress(email)).toBe(expected);
  });
});

describe('deliverEmail: reintentos', () => {
  const recipient = { email: 'ana@yaiwell.com', locale: 'es', fullName: 'Ana' } as const;
  const content = {
    subject: 's',
    heading: 'h',
    greeting: 'g',
    paragraphs: [],
    details: [],
    signature: 'x',
    footer: 'f',
  };

  it('reintenta un fallo pasajero con la misma clave y acaba enviando', async () => {
    vi.useFakeTimers();
    mocks.sendEmail
      .mockRejectedValueOnce(new EmailSendError('busy', 'rate_limit_exceeded', 429))
      .mockResolvedValueOnce({ providerId: 'em_1' });

    const done = deliverEmail('booking-reminder', 'bk-1', recipient, content);
    await vi.advanceTimersByTimeAsync(1_000);
    await done;
    vi.useRealTimers();

    const keys = mocks.sendEmail.mock.calls.map(([m]) => m.idempotencyKey);
    expect(keys).toEqual(['booking-reminder/bk-1', 'booking-reminder/bk-1']);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('se rinde tras dos reintentos y lo registra', async () => {
    vi.useFakeTimers();
    mocks.sendEmail.mockRejectedValue(new EmailSendError('busy', 'rate_limit_exceeded', 429));

    const done = deliverEmail('booking-reminder', 'bk-1', recipient, content);
    await vi.advanceTimersByTimeAsync(4_000);
    await done;
    vi.useRealTimers();

    expect(mocks.sendEmail).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('no reintenta un fallo que no se arregla solo (dominio, validación)', async () => {
    mocks.sendEmail.mockRejectedValue(new EmailSendError('bad from', 'validation_error', 403));
    await deliverEmail('booking-reminder', 'bk-1', recipient, content);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('no reintenta si falta la configuración', async () => {
    mocks.sendEmail.mockRejectedValue(new EmailConfigError());
    await deliverEmail('booking-reminder', 'bk-1', recipient, content);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('corta un intento colgado y lo reintenta', async () => {
    vi.useFakeTimers();
    mocks.sendEmail
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValueOnce({ providerId: 'em_1' });

    const done = deliverEmail('booking-reminder', 'bk-1', recipient, content);
    await vi.advanceTimersByTimeAsync(8_000 + 1_000);
    await done;
    vi.useRealTimers();

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(console.error).not.toHaveBeenCalled();
  });
});
