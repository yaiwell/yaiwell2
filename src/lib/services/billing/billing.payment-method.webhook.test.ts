/**
 * Tests de `handlePaymentMethodChange`: si el Customer del negocio se
 * queda sin método por defecto, deja de estar listo para el pago en el
 * local; enrutado de los eventos nuevos en `handleBillingEvent`.
 */
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  retrieveCustomer: vi.fn(),
  findByCustomerId: vi.fn(),
  clearReady: vi.fn(),
}));
vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => ({ customers: { retrieve: mocks.retrieveCustomer } }),
}));
vi.mock('./billing.repository', () => ({
  billingRepository: { findByCustomerId: mocks.findByCustomerId },
}));
vi.mock('./billing.commission.repository', () => ({
  commissionRepository: { clearPaymentMethodReady: mocks.clearReady },
}));

import { handlePaymentMethodChange } from './billing.payment-method.webhook';

function customer(defaultPm: string | null, overrides: Record<string, unknown> = {}) {
  return {
    id: 'cus_aura',
    object: 'customer',
    invoice_settings: { default_payment_method: defaultPm },
    ...overrides,
  };
}

function event(type: string, object: unknown, previous?: Record<string, unknown>) {
  return {
    type,
    data: { object, ...(previous ? { previous_attributes: previous } : {}) },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.retrieveCustomer.mockResolvedValue(customer(null));
  mocks.findByCustomerId.mockResolvedValue({ providerId: 'prov-aura' });
  mocks.clearReady.mockResolvedValue(true);
});

describe('handlePaymentMethodChange', () => {
  it('customer.updated lee el estado actual del Customer (eventos desordenados)', async () => {
    mocks.retrieveCustomer.mockResolvedValue(customer('pm_nuevo'));
    const result = await handlePaymentMethodChange(event('customer.updated', customer(null)));
    expect(mocks.retrieveCustomer).toHaveBeenCalledWith('cus_aura');
    expect(mocks.clearReady).not.toHaveBeenCalled();
    expect(result.handled).toBe(false);
  });

  it('customer.updated sin método por defecto: limpia el método listo', async () => {
    const result = await handlePaymentMethodChange(event('customer.updated', customer(null)));
    expect(mocks.clearReady).toHaveBeenCalledWith('prov-aura');
    expect(result).toEqual({ handled: true, providerId: 'prov-aura' });
  });

  it('customer.updated con método por defecto: no toca nada', async () => {
    mocks.retrieveCustomer.mockResolvedValue(customer('pm_1'));
    const result = await handlePaymentMethodChange(event('customer.updated', customer('pm_1')));
    expect(mocks.clearReady).not.toHaveBeenCalled();
    expect(result.handled).toBe(false);
  });

  it('payment_method.detached: consulta el Customer que tenía', async () => {
    mocks.retrieveCustomer.mockResolvedValue(customer(null));
    const result = await handlePaymentMethodChange(
      event('payment_method.detached', { id: 'pm_1', customer: null }, { customer: 'cus_aura' }),
    );
    expect(mocks.retrieveCustomer).toHaveBeenCalledWith('cus_aura');
    expect(result.handled).toBe(true);
  });

  it('payment_method.detached de un método que no era el predeterminado', async () => {
    mocks.retrieveCustomer.mockResolvedValue(customer('pm_otro'));
    await handlePaymentMethodChange(
      event('payment_method.detached', { id: 'pm_1', customer: null }, { customer: 'cus_aura' }),
    );
    expect(mocks.clearReady).not.toHaveBeenCalled();
  });

  it('un Customer que no es de ningún negocio se ignora', async () => {
    mocks.findByCustomerId.mockResolvedValue(null);
    await expect(
      handlePaymentMethodChange(event('customer.updated', customer(null))),
    ).resolves.toEqual({ handled: false });
    expect(mocks.clearReady).not.toHaveBeenCalled();
    expect(mocks.retrieveCustomer).not.toHaveBeenCalled();
  });

  it('sin Customer anterior en el evento no hace nada', async () => {
    await expect(
      handlePaymentMethodChange(event('payment_method.detached', { id: 'pm_1' })),
    ).resolves.toEqual({ handled: false });
    expect(mocks.retrieveCustomer).not.toHaveBeenCalled();
  });

  it('un Customer borrado se ignora', async () => {
    mocks.retrieveCustomer.mockResolvedValue({ id: 'cus_aura', deleted: true });
    await expect(
      handlePaymentMethodChange(
        event('payment_method.detached', { id: 'pm_1' }, { customer: 'cus_aura' }),
      ),
    ).resolves.toEqual({ handled: false });
  });
});
