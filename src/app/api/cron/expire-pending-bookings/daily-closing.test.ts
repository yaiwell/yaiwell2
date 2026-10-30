/**
 * Tests del cierre diario del cron: orden de los pasos, paso de las
 * comisiones recién encoladas al barrido, invitaciones solo a las citas
 * recientes y tras los recordatorios, vaciado del atraso antiguo por
 * tandas y tolerancia a fallos de cada paso.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  autoComplete: vi.fn(),
  sweep: vi.fn(),
  invites: vi.fn(),
  select: vi.fn(),
}));
vi.mock('@/lib/services/booking', () => ({ autoCompleteStaleBookings: mocks.autoComplete }));
vi.mock('@/lib/services/billing', () => ({ runCommissionSweep: mocks.sweep }));
vi.mock('@/lib/services/notifications', () => ({
  sendReviewInvites: mocks.invites,
  selectReviewInviteCandidates: mocks.select,
}));

import {
  AUTO_COMPLETE_PER_RUN,
  COMMISSION_BUDGET_MS,
  MAX_AUTO_COMPLETE_PASSES,
  REVIEW_INVITES_BUDGET_MS,
  runDailyClosing,
} from './daily-closing';

const NOW = new Date('2026-11-01T03:00:00Z');
const SWEEP = {
  itemized: 1,
  retryLater: 0,
  invoiced: 0,
  emptyInvoices: 0,
  invoiceFailures: 0,
  truncated: false,
};

function batch(prefix: string, size: number) {
  return Array.from({ length: size }, (_, i) => `${prefix}-${i}`);
}

function result(ids: string[], chargeIds: string[] = [], failed: string[] = []) {
  return { completedBookingIds: ids, commissionChargeIds: chargeIds, failedBookingIds: failed };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.autoComplete.mockResolvedValue(result(['bk-online', 'bk-onsite'], ['charge-1'], ['bk-x']));
  // Por defecto todas son recientes.
  mocks.select.mockImplementation(async (ids: string[]) => ids);
  mocks.sweep.mockResolvedValue(SWEEP);
  mocks.invites.mockResolvedValue({ sent: 2, skipped: 0 });
});

describe('runDailyClosing', () => {
  it('completa, pasa las comisiones nuevas al barrido e invita a valorar', async () => {
    const started = Date.now();
    const summary = await runDailyClosing(NOW, started, Promise.resolve());

    expect(mocks.autoComplete).toHaveBeenCalledTimes(1);
    expect(mocks.autoComplete).toHaveBeenCalledWith(NOW, AUTO_COMPLETE_PER_RUN);
    expect(mocks.sweep).toHaveBeenCalledWith({
      now: NOW,
      deadline: started + COMMISSION_BUDGET_MS,
      freshChargeIds: ['charge-1'],
    });
    expect(mocks.invites).toHaveBeenCalledWith(
      ['bk-online', 'bk-onsite'],
      started + REVIEW_INVITES_BUDGET_MS,
    );
    expect(summary).toEqual({
      autoCompleted: 2,
      autoCompletedWithoutInvite: 0,
      autoCompleteFailed: 1,
      commissions: SWEEP,
      reviewInvites: { sent: 2, skipped: 0 },
    });
  });

  it('las reservas antiguas se completan sin invitación', async () => {
    mocks.select.mockResolvedValue(['bk-online']);

    const summary = await runDailyClosing(NOW, Date.now(), Promise.resolve());

    expect(mocks.select).toHaveBeenCalledWith(['bk-online', 'bk-onsite'], NOW);
    expect(mocks.invites.mock.calls[0][0]).toEqual(['bk-online']);
    expect(summary.autoCompletedWithoutInvite).toBe(1);
  });

  it('vacía el atraso antiguo por tandas mientras salen llenas y sin invitaciones', async () => {
    const old1 = batch('old1', AUTO_COMPLETE_PER_RUN);
    const old2 = batch('old2', AUTO_COMPLETE_PER_RUN);
    mocks.autoComplete
      .mockResolvedValueOnce(result(old1, ['c-1']))
      .mockResolvedValueOnce(result(old2))
      .mockResolvedValueOnce(result(['recent-1']));
    mocks.select.mockImplementation(async (ids: string[]) =>
      ids.filter((id) => id.startsWith('recent')),
    );

    const summary = await runDailyClosing(NOW, Date.now(), Promise.resolve());

    expect(mocks.autoComplete).toHaveBeenCalledTimes(3);
    expect(mocks.invites.mock.calls[0][0]).toEqual(['recent-1']);
    expect(mocks.sweep.mock.calls[0][0].freshChargeIds).toEqual(['c-1']);
    expect(summary.autoCompleted).toBe(2 * AUTO_COMPLETE_PER_RUN + 1);
    expect(summary.autoCompletedWithoutInvite).toBe(2 * AUTO_COMPLETE_PER_RUN);
  });

  it('no repite tandas si ya hay tantas invitaciones como caben', async () => {
    mocks.autoComplete.mockResolvedValue(result(batch('recent', AUTO_COMPLETE_PER_RUN)));
    await runDailyClosing(NOW, Date.now(), Promise.resolve());
    expect(mocks.autoComplete).toHaveBeenCalledTimes(1);
  });

  it('nunca pasa del máximo de tandas', async () => {
    mocks.autoComplete.mockImplementation(async () => result(batch('old', AUTO_COMPLETE_PER_RUN)));
    mocks.select.mockResolvedValue([]);
    await runDailyClosing(NOW, Date.now(), Promise.resolve());
    expect(mocks.autoComplete).toHaveBeenCalledTimes(MAX_AUTO_COMPLETE_PASSES);
  });

  it('una tanda llena solo de fallos no se repite', async () => {
    mocks.autoComplete.mockResolvedValue(result([], [], batch('fail', AUTO_COMPLETE_PER_RUN)));
    await runDailyClosing(NOW, Date.now(), Promise.resolve());
    expect(mocks.autoComplete).toHaveBeenCalledTimes(1);
  });

  it('si no puede elegir a quién invitar, no invita', async () => {
    mocks.select.mockRejectedValue(new Error('db down'));
    const summary = await runDailyClosing(NOW, Date.now(), Promise.resolve());
    expect(mocks.invites.mock.calls[0][0]).toEqual([]);
    expect(summary.autoCompleted).toBe(2);
  });

  it('las invitaciones esperan a que terminen los recordatorios (límite de Resend)', async () => {
    let finishReminders: () => void = () => undefined;
    const reminders = new Promise<void>((resolve) => {
      finishReminders = resolve;
    });
    const run = runDailyClosing(NOW, Date.now(), reminders);
    await vi.waitFor(() => expect(mocks.sweep).toHaveBeenCalled());
    expect(mocks.invites).not.toHaveBeenCalled();

    finishReminders();
    await run;
    expect(mocks.invites).toHaveBeenCalledOnce();
  });

  it('un fallo de los recordatorios no impide invitar', async () => {
    await runDailyClosing(NOW, Date.now(), Promise.reject(new Error('resend down')));
    expect(mocks.invites).toHaveBeenCalledOnce();
  });

  it('si el cierre automático falla, el barrido de comisiones atrasadas sigue', async () => {
    mocks.autoComplete.mockRejectedValue(new Error('db down'));

    const summary = await runDailyClosing(NOW, Date.now(), Promise.resolve());

    expect(mocks.sweep).toHaveBeenCalledWith(expect.objectContaining({ freshChargeIds: [] }));
    expect(summary.autoCompleted).toBe(0);
  });

  it('un fallo del barrido queda en el resumen sin lanzar', async () => {
    mocks.sweep.mockRejectedValue(new Error('db down'));

    const summary = await runDailyClosing(NOW, Date.now(), Promise.resolve());

    expect(summary.commissions).toBeNull();
    expect(summary.reviewInvites).toEqual({ sent: 2, skipped: 0 });
  });
});
