/**
 * Tests del envío de un correo ya construido: direcciones de prueba y
 * reintentos ante fallos pasajeros de Resend.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/integrations/email', () => {
  class EmailConfigError extends Error {}
  class EmailSendError extends Error {
    constructor(readonly retryable: boolean) {
      super('resend failed');
    }
  }
  return { sendEmail: mocks.sendEmail, EmailConfigError, EmailSendError };
});

import { EmailSendError } from '@/lib/integrations/email';

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
  // El mock acepta el flag `retryable` como único argumento.
  const SendError = EmailSendError as unknown as new (retryable: boolean) => Error;

  it('reintenta un fallo pasajero con la misma clave y acaba enviando', async () => {
    vi.useFakeTimers();
    mocks.sendEmail
      .mockRejectedValueOnce(new SendError(true))
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
    mocks.sendEmail.mockRejectedValue(new SendError(true));

    const done = deliverEmail('booking-reminder', 'bk-1', recipient, content);
    await vi.advanceTimersByTimeAsync(4_000);
    await done;
    vi.useRealTimers();

    expect(mocks.sendEmail).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('no reintenta un fallo que no se arregla solo (dominio, validación)', async () => {
    mocks.sendEmail.mockRejectedValue(new SendError(false));
    await deliverEmail('booking-reminder', 'bk-1', recipient, content);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });
});
