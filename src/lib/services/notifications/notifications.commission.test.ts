/**
 * Tests del aviso de comisiones impagadas y de las invitaciones a valorar
 * del cierre automático: idioma del dueño, clave de idempotencia,
 * envío en serie y presupuesto de tiempo.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  findProviderContext: vi.fn(),
  notifyBookingCompleted: vi.fn(),
}));

vi.mock('@/lib/integrations/email', () => {
  class EmailConfigError extends Error {}
  class EmailSendError extends Error {}
  return { sendEmail: mocks.sendEmail, EmailConfigError, EmailSendError };
});
vi.mock('./notifications.repository', () => ({
  notificationsRepository: { findProviderContext: mocks.findProviderContext },
}));

import {
  buildCommissionPaymentFailedEmail,
  notifyCommissionPaymentFailed,
} from './notifications.commission';
import { sendReviewInvites } from './notifications.review-invites';
import * as service from './notifications.service';
import type { ProviderEmailContext } from './notifications.types';

function ctx(locale: ProviderEmailContext['owner']['locale'] = 'es'): ProviderEmailContext {
  return {
    providerId: 'prov-1',
    name: 'Studio Aura',
    owner: { email: 'centro@yaiwell.com', locale, fullName: 'Marta' },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  mocks.findProviderContext.mockResolvedValue(ctx());
  mocks.sendEmail.mockResolvedValue(undefined);
});

describe('buildCommissionPaymentFailedEmail', () => {
  it('explica que se suspende el pago en el local y enlaza al plan', () => {
    const content = buildCommissionPaymentFailedEmail(ctx());
    expect(content.subject).toBe('No hemos podido cobrar las comisiones de Studio Aura');
    expect(content.outro?.[0]).toContain('pagar en el local');
    expect(content.cta?.url).toMatch(/\/es\/panel\/plan$/);
  });

  it.each(['ca', 'en', 'de'] as const)('tiene texto en %s', (locale) => {
    const content = buildCommissionPaymentFailedEmail(ctx(locale));
    expect(content.subject).toContain('Studio Aura');
    expect(content.subject).not.toContain('commissionPaymentFailed');
    expect(content.cta?.url).toContain(`/${locale}/panel/plan`);
  });
});

describe('notifyCommissionPaymentFailed', () => {
  it('envía con clave por factura e intento', async () => {
    await notifyCommissionPaymentFailed('prov-1', 'in_c:2');
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['centro@yaiwell.com'],
        idempotencyKey: 'commission-payment-failed/in_c:2',
      }),
    );
  });

  it('nunca lanza aunque falle la lectura del negocio', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.findProviderContext.mockRejectedValue(new Error('db down'));
    await expect(notifyCommissionPaymentFailed('prov-1', 'in_c:1')).resolves.toBeUndefined();
  });
});

describe('sendReviewInvites', () => {
  it('invita en serie a cada reserva completada', async () => {
    const spy = vi.spyOn(service, 'notifyBookingCompleted').mockResolvedValue(undefined);
    const summary = await sendReviewInvites(['bk-1', 'bk-2'], Date.now() + 60_000, 0);
    expect(spy.mock.calls.map((call) => call[0])).toEqual(['bk-1', 'bk-2']);
    expect(summary).toEqual({ sent: 2, skipped: 0 });
  });

  it('sin tiempo no envía y lo deja en el log', async () => {
    const spy = vi.spyOn(service, 'notifyBookingCompleted').mockResolvedValue(undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const summary = await sendReviewInvites(['bk-1'], Date.now() - 1, 0);
    expect(spy).not.toHaveBeenCalled();
    expect(summary).toEqual({ sent: 0, skipped: 1 });
    expect(warn).toHaveBeenCalled();
  });
});
