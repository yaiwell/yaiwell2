/**
 * Tests de `scheduleCommissionItemization`: se programa tras responder,
 * ignora reservas online y nunca lanza (el cron recoge lo que falle).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ after: vi.fn(), itemize: vi.fn(), report: vi.fn() }));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('./billing.commission.itemize', () => ({ itemizeCommission: mocks.itemize }));
vi.mock('./billing.report', () => ({ reportBillingIssue: mocks.report }));

import { scheduleCommissionItemization } from './billing.commission.schedule';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.after.mockImplementation((task: () => Promise<void>) => void task());
  mocks.itemize.mockResolvedValue('itemized');
});

describe('scheduleCommissionItemization', () => {
  it('programa el paso a Stripe con after()', async () => {
    scheduleCommissionItemization('charge-1');
    await vi.waitFor(() => expect(mocks.itemize).toHaveBeenCalledWith('charge-1'));
    expect(mocks.after).toHaveBeenCalledOnce();
  });

  it.each([null, undefined, ''])('no hace nada sin comisión (%j)', (chargeId) => {
    scheduleCommissionItemization(chargeId);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it('un fallo de BD se reporta y no se propaga', async () => {
    mocks.itemize.mockRejectedValue(new Error('db down'));
    scheduleCommissionItemization('charge-1');
    await vi.waitFor(() => expect(mocks.report).toHaveBeenCalled());
  });

  it('fuera de una petición (after lanza) no rompe al caller', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.after.mockImplementation(() => {
      throw new Error('outside request');
    });
    expect(() => scheduleCommissionItemization('charge-1')).not.toThrow();
  });
});
