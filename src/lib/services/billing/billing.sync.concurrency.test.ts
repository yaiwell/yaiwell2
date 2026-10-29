/**
 * Tests de concurrencia de `syncSubscription`: suscripciones viejas,
 * duplicadas (reembolso + cancelación), adopción decidida con la fila
 * bloqueada y descarte de estados leídos antes que el guardado.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  subscriptions: { retrieve: vi.fn(), list: vi.fn(), cancel: vi.fn() },
  prices: { retrieve: vi.fn() },
  invoicePayments: { list: vi.fn() },
  refunds: { create: vi.fn() },
}));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));
vi.mock('@/lib/integrations/sentry', () => ({ isSentryEnabled: () => false }));

const txMock = vi.hoisted(() => ({ marker: 'tx' }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(txMock)) },
}));

const repoMock = vi.hoisted(() => ({
  findByCustomerId: vi.fn(),
  findPlanByTier: vi.fn(),
  findPlanById: vi.fn(),
  lockProviderPlan: vi.fn(),
  lockBillingRow: vi.fn(),
  writeMirror: vi.fn(),
  setProviderPlan: vi.fn(),
}));
vi.mock('./billing.repository', () => ({ billingRepository: repoMock }));
vi.mock('./billing.plan-limits', () => ({ applyPlanLimits: vi.fn() }));

import { SubscriptionSyncConflictError } from './billing.errors';
import { syncSubscription } from './billing.sync';
import { buildBillingRow, buildSubscription, planBy, PROVIDER_ID } from './billing.test-fixtures';

/** Simula las suscripciones del Customer en Stripe. */
function stripeHas(...subs: ReturnType<typeof buildSubscription>[]) {
  stripeMock.subscriptions.retrieve.mockImplementation(async (id: string) => {
    const sub = subs.find((candidate) => candidate.id === id);
    if (!sub) throw Object.assign(new Error('missing'), { code: 'resource_missing' });
    return sub;
  });
  stripeMock.subscriptions.list.mockResolvedValue({ data: subs });
}

/** La misma fila para la lectura previa y la releída con el bloqueo. */
function givenRow(overrides: Record<string, unknown> = {}) {
  const row = buildBillingRow(overrides);
  repoMock.findByCustomerId.mockResolvedValue(row);
  repoMock.lockBillingRow.mockResolvedValue(row);
}

/** Duplicada con su última factura pagada con `pi_b`. */
function duplicateWithPayment() {
  stripeMock.invoicePayments.list.mockResolvedValue({
    data: [{ payment: { type: 'payment_intent', payment_intent: 'pi_b' } }],
  });
  return Object.assign(buildSubscription({ id: 'sub_b', status: 'active' }), {
    latest_invoice: 'in_b',
  });
}

function lastMirror() {
  return repoMock.writeMirror.mock.calls.at(-1)?.[2];
}

beforeEach(() => {
  vi.clearAllMocks();
  // `clearAllMocks` no borra implementaciones: un rechazo de un test
  // no debe filtrarse al siguiente.
  stripeMock.refunds.create.mockReset();
  stripeMock.subscriptions.cancel.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  givenRow();
  repoMock.findPlanByTier.mockImplementation(async (tier: string) => planBy(tier));
  repoMock.findPlanById.mockImplementation(async (id: string) => planBy(id));
  repoMock.lockProviderPlan.mockResolvedValue('plan-free');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('syncSubscription — otras suscripciones del negocio', () => {
  it('ignora el deleted de una suscripción vieja', async () => {
    givenRow({ stripeSubscriptionId: 'sub_new', subscriptionStatus: 'active' });
    stripeHas(
      buildSubscription({ id: 'sub_old', status: 'canceled' }),
      buildSubscription({ id: 'sub_new', status: 'active' }),
    );
    const result = await syncSubscription('sub_old');
    expect(result).toEqual({ changed: false, providerId: PROVIDER_ID });
    expect(repoMock.writeMirror).not.toHaveBeenCalled();
  });

  it('adopta una suscripción nueva viva si la guardada está muerta', async () => {
    givenRow({ stripeSubscriptionId: 'sub_old', subscriptionStatus: 'canceled' });
    stripeHas(
      buildSubscription({ id: 'sub_old', status: 'canceled' }),
      buildSubscription({ id: 'sub_new', status: 'active', tier: 'basic' }),
    );
    const result = await syncSubscription('sub_new');
    expect(lastMirror()).toMatchObject({ stripeSubscriptionId: 'sub_new' });
    expect(result.planChanged).toEqual({ from: 'free', to: 'basic' });
  });

  it('duplicada viva: reembolsa su pago, la cancela y no pisa la guardada', async () => {
    givenRow({ stripeSubscriptionId: 'sub_a', subscriptionStatus: 'active' });
    stripeHas(buildSubscription({ id: 'sub_a' }), duplicateWithPayment());

    const result = await syncSubscription('sub_b');

    expect(result).toEqual({ changed: false, providerId: PROVIDER_ID });
    expect(repoMock.writeMirror).not.toHaveBeenCalled();
    expect(stripeMock.invoicePayments.list).toHaveBeenCalledWith({
      invoice: 'in_b',
      status: 'paid',
      limit: 10,
    });
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_b', reason: 'duplicate' }),
      { idempotencyKey: 'duplicate-refund:pi_b' },
    );
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith(
      'sub_b',
      { invoice_now: false, prorate: false },
      { idempotencyKey: 'duplicate-cancel:sub_b' },
    );
    // Reembolso antes que cancelación (ver billing.duplicates.ts).
    expect(stripeMock.refunds.create.mock.invocationCallOrder[0]!).toBeLessThan(
      stripeMock.subscriptions.cancel.mock.invocationCallOrder[0]!,
    );
    expect(console.error).toHaveBeenCalled();
  });

  it('un reembolso ya hecho no bloquea la cancelación', async () => {
    givenRow({ stripeSubscriptionId: 'sub_a', subscriptionStatus: 'active' });
    stripeHas(buildSubscription({ id: 'sub_a' }), duplicateWithPayment());
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('refunded'), { code: 'charge_already_refunded' }),
    );
    await syncSubscription('sub_b');
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalled();
  });

  it('si el reembolso de la duplicada falla, no la cancela (Stripe reintenta)', async () => {
    givenRow({ stripeSubscriptionId: 'sub_a', subscriptionStatus: 'active' });
    stripeHas(buildSubscription({ id: 'sub_a' }), duplicateWithPayment());
    stripeMock.refunds.create.mockRejectedValue(new Error('network'));
    await expect(syncSubscription('sub_b')).rejects.toThrow();
    expect(stripeMock.subscriptions.cancel).not.toHaveBeenCalled();
  });

  it('si muere la guardada y queda otra viva, adopta la viva', async () => {
    repoMock.lockProviderPlan.mockResolvedValue('plan-pro');
    givenRow({ stripeSubscriptionId: 'sub_a', subscriptionStatus: 'active' });
    stripeHas(
      buildSubscription({ id: 'sub_a', status: 'canceled' }),
      buildSubscription({ id: 'sub_b', status: 'active', tier: 'pro' }),
    );
    await syncSubscription('sub_a');
    expect(lastMirror()).toMatchObject({
      stripeSubscriptionId: 'sub_b',
      subscriptionStatus: 'active',
    });
    expect(repoMock.setProviderPlan).not.toHaveBeenCalled();
  });
});

describe('syncSubscription — orden y bloqueo', () => {
  it('decide con la fila releída: si otra sync adoptó entre medias, repite', async () => {
    // Lectura previa: sin suscripción. Con el bloqueo: otra sync ya guardó
    // sub_a (viva). No se adopta sub_b a ciegas: se repite y se ve duplicada.
    const adopted = buildBillingRow({
      stripeSubscriptionId: 'sub_a',
      subscriptionStatus: 'active',
    });
    repoMock.findByCustomerId.mockResolvedValueOnce(buildBillingRow()).mockResolvedValue(adopted);
    repoMock.lockBillingRow.mockResolvedValue(adopted);
    stripeHas(buildSubscription({ id: 'sub_a' }), duplicateWithPayment());

    await syncSubscription('sub_b');

    expect(repoMock.lockBillingRow).toHaveBeenCalledTimes(2);
    expect(repoMock.writeMirror).not.toHaveBeenCalled();
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith(
      'sub_b',
      expect.anything(),
      expect.anything(),
    );
  });

  it('updated viejo procesado tras el deleted: lo descarta y converge a canceled', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T10:00:00Z'));
    repoMock.lockProviderPlan.mockResolvedValue('plan-pro');
    // La lectura del `updated` (hecha a las 10:00:00) aún veía `active`;
    // la siguiente ya ve `canceled`.
    stripeMock.subscriptions.retrieve
      .mockResolvedValueOnce(buildSubscription({ id: 'sub_1', status: 'active' }))
      .mockResolvedValue(buildSubscription({ id: 'sub_1', status: 'canceled' }));
    stripeMock.subscriptions.list.mockResolvedValue({ data: [] });
    givenRow({ stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active' });
    // Entre su lectura y su bloqueo, el `deleted` escribió con una
    // lectura de las 10:00:05.
    const afterDeleted = buildBillingRow({
      stripeSubscriptionId: 'sub_1',
      subscriptionStatus: 'canceled',
      lastSyncedAt: new Date('2026-10-29T10:00:05Z'),
    });
    repoMock.lockBillingRow.mockImplementation(async () => {
      // El reintento arranca después del `deleted`.
      vi.setSystemTime(new Date('2026-10-29T10:00:08Z'));
      return afterDeleted;
    });

    await syncSubscription('sub_1');

    // Nunca escribió el `active` viejo; solo el `canceled` releído, con su
    // propio instante de lectura.
    expect(repoMock.writeMirror).toHaveBeenCalledTimes(1);
    expect(lastMirror()).toMatchObject({ subscriptionStatus: 'canceled' });
    expect(repoMock.writeMirror.mock.calls[0]?.[3]).toEqual(new Date('2026-10-29T10:00:08Z'));
  });

  it('conflictos seguidos → SubscriptionSyncConflictError (500: Stripe reintenta)', async () => {
    repoMock.lockBillingRow.mockResolvedValue(buildBillingRow({ stripeSubscriptionId: 'sub_x' }));
    stripeHas(buildSubscription());
    await expect(syncSubscription('sub_1')).rejects.toBeInstanceOf(SubscriptionSyncConflictError);
    expect(repoMock.lockBillingRow).toHaveBeenCalledTimes(3);
  });
});
