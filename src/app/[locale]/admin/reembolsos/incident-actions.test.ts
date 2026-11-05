/**
 * Tests de las server actions del reembolso por incidencia del centro.
 *
 * Lo que se protege: un no admin nunca lee ni mueve dinero, el motivo corto
 * se rechaza en el borde, la auditoría usa el `User.id` interno, y los avisos
 * salen solo en la ejecución real (también si Stripe falla, porque la reserva
 * ya está cancelada), nunca en un doble clic.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class BookingForCheckoutNotFoundError extends Error {}
  class IncidentRefundConflictError extends Error {}
  class IncidentRefundNotEligibleError extends Error {
    constructor(readonly reason: string) {
      super('not eligible');
    }
  }
  return {
    requireRole: vi.fn(),
    ensureUser: vi.fn(),
    revalidatePath: vi.fn(),
    preview: vi.fn(),
    refund: vi.fn(),
    resume: vi.fn(),
    notify: vi.fn(),
    schedule: vi.fn((send: () => unknown) => send()),
    errors: {
      BookingForCheckoutNotFoundError,
      IncidentRefundConflictError,
      IncidentRefundNotEligibleError,
    },
  };
});

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/auth/server', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/lib/services/user', () => ({ ensureUserFromClerk: mocks.ensureUser }));
vi.mock('@/lib/services/notifications', async () => {
  const state = await import('@/lib/services/notifications/notifications.refund-state');
  return {
    notifyCentreIncidentRefund: mocks.notify,
    scheduleNotification: mocks.schedule,
    toCancellationRefundState: state.toCancellationRefundState,
  };
});
vi.mock('@/lib/services/checkout', async () => {
  // Schemas reales: lo que se prueba es justo la validación en el borde.
  const validation = await import('@/lib/services/checkout/checkout.validation');
  return {
    getIncidentRefundPreview: mocks.preview,
    refundBookingForCentreIncident: mocks.refund,
    resumeCentreIncidentRefund: mocks.resume,
    issueIncidentRefundSchema: validation.issueIncidentRefundSchema,
    previewIncidentRefundSchema: validation.previewIncidentRefundSchema,
    ...mocks.errors,
  };
});

import {
  issueIncidentRefundAction,
  previewIncidentRefundAction,
  resumeIncidentRefundAction,
} from './incident-actions';

const BOOKING_ID = '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f';
const NOTE = 'El centro ha sufrido una avería eléctrica';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ userId: 'clerk_admin', role: 'admin' });
  mocks.ensureUser.mockResolvedValue({ id: 'admin-user-1' });
  mocks.refund.mockResolvedValue({
    replayed: false,
    bookingId: BOOKING_ID,
    previousStatus: 'confirmed',
    refund: 'issued',
    stripeRefundId: 're_1',
    queued: false,
    slot: 'blocked',
  });
});

describe('previewIncidentRefundAction', () => {
  it('rechaza a un no admin sin leer', async () => {
    mocks.requireRole.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(previewIncidentRefundAction('es', BOOKING_ID)).resolves.toEqual({
      ok: false,
      code: 'FORBIDDEN',
    });
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it('rechaza un id que no es uuid', async () => {
    await expect(previewIncidentRefundAction('es', 'prov-01')).resolves.toEqual({
      ok: false,
      code: 'VALIDATION',
    });
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it('serializa la fecha para cruzar a cliente', async () => {
    mocks.preview.mockResolvedValue({
      bookingId: BOOKING_ID,
      providerName: 'Estudio Sal',
      serviceName: 'Corte',
      startAt: new Date('2026-11-05T11:00:00.000Z'),
      priceCents: 4500,
      status: 'confirmed',
      eligibility: { eligible: true },
    });

    const state = await previewIncidentRefundAction('es', BOOKING_ID);

    expect(state).toMatchObject({ ok: true, preview: { startAtIso: '2026-11-05T11:00:00.000Z' } });
  });

  it('traduce la reserva inexistente', async () => {
    mocks.preview.mockRejectedValue(new mocks.errors.BookingForCheckoutNotFoundError());

    await expect(previewIncidentRefundAction('es', BOOKING_ID)).resolves.toEqual({
      ok: false,
      code: 'BOOKING_NOT_FOUND',
    });
  });
});

describe('issueIncidentRefundAction', () => {
  it('rechaza a un no admin sin mover dinero', async () => {
    mocks.requireRole.mockRejectedValue(new Error('NEXT_REDIRECT'));

    const state = await issueIncidentRefundAction('es', BOOKING_ID, NOTE);

    expect(state).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(mocks.requireRole).toHaveBeenCalledWith(['admin'], 'es');
    expect(mocks.refund).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('rechaza un locale no soportado sin comprobar el rol', async () => {
    const state = await issueIncidentRefundAction('xx' as never, BOOKING_ID, NOTE);

    expect(state).toEqual({ ok: false, code: 'VALIDATION' });
    expect(mocks.requireRole).not.toHaveBeenCalled();
  });

  it.each(['', 'corto', '   nueve    '])('rechaza el motivo corto %j', async (note) => {
    const state = await issueIncidentRefundAction('es', BOOKING_ID, note);

    expect(state).toEqual({ ok: false, code: 'INVALID_NOTE' });
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it('audita con el User.id interno, no con el de Clerk', async () => {
    await issueIncidentRefundAction('es', BOOKING_ID, NOTE);

    expect(mocks.ensureUser).toHaveBeenCalledWith('clerk_admin');
    expect(mocks.refund).toHaveBeenCalledWith(
      { bookingId: BOOKING_ID, note: NOTE },
      'admin-user-1',
    );
  });

  it('avisa una vez y revalida la cola al emitir', async () => {
    const state = await issueIncidentRefundAction('es', BOOKING_ID, NOTE);

    expect(state).toEqual({ ok: true, outcome: 'issued', slot: 'blocked' });
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    expect(mocks.notify).toHaveBeenCalledWith(BOOKING_ID, {
      refund: 'refunded',
      previousStatus: 'confirmed',
      slot: 'blocked',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/es/admin/reembolsos');
  });

  it('con Stripe fallando avisa con el dinero en trámite y responde failed', async () => {
    mocks.refund.mockResolvedValue({
      replayed: false,
      bookingId: BOOKING_ID,
      previousStatus: 'completed',
      refund: 'failed',
      stripeRefundId: null,
      queued: true,
      slot: 'not_applicable',
    });

    const state = await issueIncidentRefundAction('es', BOOKING_ID, NOTE);

    expect(state).toEqual({ ok: true, outcome: 'failed', slot: 'not_applicable' });
    expect(mocks.notify).toHaveBeenCalledWith(BOOKING_ID, {
      refund: 'refund_pending',
      previousStatus: 'completed',
      slot: 'not_applicable',
    });
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it('si el fallo no quedó grabado no dice que esté en la cola, y avisa igual', async () => {
    mocks.refund.mockResolvedValue({
      replayed: false,
      bookingId: BOOKING_ID,
      previousStatus: 'confirmed',
      refund: 'failed',
      stripeRefundId: null,
      queued: false,
      slot: 'blocked',
    });

    const state = await issueIncidentRefundAction('es', BOOKING_ID, NOTE);

    expect(state).toEqual({ ok: true, outcome: 'failed_unrecorded', slot: 'blocked' });
    expect(mocks.notify).toHaveBeenCalledWith(BOOKING_ID, {
      refund: 'refund_pending',
      previousStatus: 'confirmed',
      slot: 'blocked',
    });
  });

  it('un doble clic responde already_refunded y no avisa a nadie', async () => {
    mocks.refund.mockResolvedValue({
      replayed: true,
      bookingId: BOOKING_ID,
      refund: 'already_refunded',
      stripeRefundId: 're_1',
      notice: null,
    });

    const state = await issueIncidentRefundAction('es', BOOKING_ID, NOTE);

    expect(state).toEqual({ ok: true, outcome: 'already_refunded', slot: 'not_applicable' });
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('sobre una marcada ya devuelta repite los avisos, con las mismas claves', async () => {
    mocks.refund.mockResolvedValue({
      replayed: true,
      bookingId: BOOKING_ID,
      refund: 'already_refunded',
      stripeRefundId: 're_1',
      notice: { previousStatus: 'confirmed', slot: 'blocked' },
    });

    const state = await issueIncidentRefundAction('es', BOOKING_ID, NOTE);

    expect(state).toEqual({ ok: true, outcome: 'already_refunded', slot: 'blocked' });
    expect(mocks.notify).toHaveBeenCalledWith(BOOKING_ID, {
      refund: 'refunded',
      previousStatus: 'confirmed',
      slot: 'blocked',
    });
  });

  it('devuelve el motivo de no elegibilidad, también el del pago en el local', async () => {
    mocks.refund.mockRejectedValue(new mocks.errors.IncidentRefundNotEligibleError('onsite'));

    await expect(issueIncidentRefundAction('es', BOOKING_ID, NOTE)).resolves.toEqual({
      ok: false,
      code: 'NOT_ELIGIBLE',
      reason: 'onsite',
    });
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('traduce el conflicto y la reserva inexistente', async () => {
    mocks.refund.mockRejectedValueOnce(new mocks.errors.IncidentRefundConflictError());
    await expect(issueIncidentRefundAction('es', BOOKING_ID, NOTE)).resolves.toEqual({
      ok: false,
      code: 'CONFLICT',
    });

    mocks.refund.mockRejectedValueOnce(new mocks.errors.BookingForCheckoutNotFoundError());
    await expect(issueIncidentRefundAction('es', BOOKING_ID, NOTE)).resolves.toEqual({
      ok: false,
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('un error inesperado no filtra detalles', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.refund.mockRejectedValue(new Error('secreto interno'));

    await expect(issueIncidentRefundAction('es', BOOKING_ID, NOTE)).resolves.toEqual({
      ok: false,
      code: 'INTERNAL',
    });
  });
});

describe('resumeIncidentRefundAction', () => {
  beforeEach(() => {
    mocks.resume.mockResolvedValue({
      replayed: false,
      bookingId: BOOKING_ID,
      previousStatus: 'confirmed',
      refund: 'issued',
      stripeRefundId: 're_1',
      queued: false,
      slot: 'blocked',
    });
  });

  it('rechaza a un no admin sin mover dinero', async () => {
    mocks.requireRole.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(resumeIncidentRefundAction('es', BOOKING_ID)).resolves.toEqual({
      ok: false,
      code: 'FORBIDDEN',
    });
    expect(mocks.resume).not.toHaveBeenCalled();
  });

  it('completa sin pedir motivo y envía los avisos', async () => {
    const state = await resumeIncidentRefundAction('es', BOOKING_ID);

    expect(state).toEqual({ ok: true, outcome: 'issued', slot: 'blocked' });
    expect(mocks.resume).toHaveBeenCalledWith({ bookingId: BOOKING_ID }, 'admin-user-1');
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });
});
