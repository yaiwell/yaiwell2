/**
 * Tests de los avisos de facturación de planes: plantillas en el idioma
 * del dueño y envío con la clave de idempotencia correcta.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  findProviderContext: vi.fn(),
}));

vi.mock('@/lib/integrations/email', () => {
  class EmailConfigError extends Error {}
  class EmailSendError extends Error {}
  return { sendEmail: mocks.sendEmail, EmailConfigError, EmailSendError };
});
vi.mock('./notifications.repository', () => ({
  notificationsRepository: { findProviderContext: mocks.findProviderContext },
}));

import { notifyPlanDowngraded, notifyPlanPaymentFailed } from './notifications.billing';
import {
  buildPlanDowngradedEmail,
  buildPlanPaymentFailedEmail,
} from './notifications.billing-templates';
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
  mocks.findProviderContext.mockResolvedValue(ctx());
  mocks.sendEmail.mockResolvedValue(undefined);
});

describe('plantillas de facturación', () => {
  it('cobro fallido: avisa de la bajada a Gratis y enlaza al panel del plan', () => {
    const content = buildPlanPaymentFailedEmail(ctx());
    expect(content.subject).toBe('No hemos podido cobrar el plan de Studio Aura');
    expect(content.outro?.[0]).toContain('plan Gratis');
    expect(content.cta?.url).toMatch(/\/es\/panel\/plan$/);
  });

  it('bajada a Gratis: nombra el plan anterior en el idioma del dueño', () => {
    expect(buildPlanDowngradedEmail(ctx(), 'pro').paragraphs[0]).toContain('plan Pro');
    const de = buildPlanDowngradedEmail(ctx('de'), 'basic');
    expect(de.paragraphs[0]).toContain('Tarif Basis');
    expect(de.heading).toBe('Dein Tarif hat sich geändert');
    expect(buildPlanDowngradedEmail(ctx('ca'), 'basic').paragraphs[0]).toContain('pla Bàsic');
  });
});

describe('notifyPlanPaymentFailed / notifyPlanDowngraded', () => {
  it('envía el aviso de cobro fallido con clave por factura e intento', async () => {
    await notifyPlanPaymentFailed('prov-1', 'in_1:2');
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['centro@yaiwell.com'],
        idempotencyKey: 'plan-payment-failed/in_1:2',
      }),
    );
  });

  it('envía el aviso de bajada con clave por negocio, plan y día', async () => {
    await notifyPlanDowngraded('prov-1', 'premium');
    const key = mocks.sendEmail.mock.calls[0]?.[0]?.idempotencyKey as string;
    expect(key).toMatch(/^plan-downgraded\/prov-1:premium:\d{4}-\d{2}-\d{2}$/);
  });

  it('nunca lanza aunque falle la lectura del negocio', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.findProviderContext.mockRejectedValue(new Error('db down'));
    await expect(notifyPlanPaymentFailed('prov-1', 'in_1:1')).resolves.toBeUndefined();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
